import http from 'node:http';
import express, { type Request, type Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { NEXUS_DEFAULTS, type GateConfig, type GatewayConfig, type HostConfig, type ProtectionConfig, type RemoteConfig, type WebSocketMessage } from '@bimo-dk/nexus-core';
import { createMockRegistryResponse, createMockHost, createMockGate, createMockGatewayConfig, createMockProtectionConfig } from './mock-remote-config.js';

export interface MockRegistryServerOptions {
  /** Initial remotes. Default: 2 mocks. */
  initialRemotes?: RemoteConfig[];
  /** Initial hosts. Default: []. */
  initialHosts?: HostConfig[];
  /** Initial gates. Default: []. */
  initialGates?: GateConfig[];
  /** Token klienter skal sende. Default 'mock-token'. */
  token?: string;
}

/**
 * In-memory mock af Bimo-Nexus registry — fuld CRUD + WebSocket broadcast.
 *
 * Brug i integrationstests:
 *   const server = new MockRegistryServer();
 *   const port = await server.start();
 *   // peg din RegistryClient mod http://localhost:${port}
 *   await server.stop();
 */
export class MockRegistryServer {
  private remotes: RemoteConfig[];
  private hosts: HostConfig[];
  private gates: GateConfig[];
  private gatewayConfig: GatewayConfig;
  private protectionConfig: ProtectionConfig;
  private readonly token: string;
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();
  private port = 0;

  constructor(options: MockRegistryServerOptions = {}) {
    this.remotes = options.initialRemotes ?? createMockRegistryResponse(2).remotes;
    this.hosts = options.initialHosts ?? [];
    this.gates = options.initialGates ?? [];
    this.gatewayConfig = createMockGatewayConfig();
    this.protectionConfig = createMockProtectionConfig();
    this.token = options.token ?? 'mock-token';
  }

  async start(): Promise<number> {
    const app = this.buildApp();
    const server = http.createServer(app);
    this.wss = new WebSocketServer({ noServer: true });

    server.on('upgrade', (req, socket, head) => {
      if (req.url !== NEXUS_DEFAULTS.WEBSOCKET_PATH) {
        socket.destroy();
        return;
      }
      this.wss!.handleUpgrade(req, socket, head, (ws) => {
        this.wss!.emit('connection', ws, req);
      });
    });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      const welcome: WebSocketMessage = {
        type: 'welcome',
        timestamp: new Date().toISOString(),
        clients: this.clients.size,
        reconnect_policy: { initialDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2, jitterMs: 0, maxAttempts: 0 },
      };
      ws.send(JSON.stringify(welcome));
      const initial: WebSocketMessage = { type: 'remotes_changed', timestamp: new Date().toISOString(), remotes: this.remotes, trigger: 'connect' };
      ws.send(JSON.stringify(initial));
      ws.on('message', () => { /* subscribe_gate and ping messages accepted but not filtered */ });
      ws.on('close', () => this.clients.delete(ws));
    });

    await new Promise<void>((resolve) => server.listen(0, () => resolve()));
    const addr = server.address();
    if (addr && typeof addr === 'object') this.port = addr.port;
    this.server = server;
    return this.port;
  }

  async stop(): Promise<void> {
    if (this.wss) {
      for (const c of this.clients) {
        try { c.close(); } catch { /* ignore */ }
      }
      this.clients.clear();
      this.wss.close();
      this.wss = null;
    }
    if (this.server) {
      await new Promise<void>((resolve) => this.server!.close(() => resolve()));
      this.server = null;
    }
  }

  setRemotes(remotes: RemoteConfig[]): void {
    this.remotes = remotes;
    this.broadcast();
  }

  broadcastHostChanged(host: HostConfig, trigger = 'manual'): void {
    const msg: WebSocketMessage = { type: 'host_changed', host, trigger, timestamp: new Date().toISOString() };
    this.broadcastRaw(msg);
  }

  broadcastGateChanged(gate: GateConfig, trigger = 'manual'): void {
    const msg: WebSocketMessage = { type: 'gate_changed', gate, trigger, timestamp: new Date().toISOString() };
    this.broadcastRaw(msg);
  }

  broadcastGatewayConfigChanged(value: GatewayConfig): void {
    const msg: WebSocketMessage = { type: 'config_changed', section: 'gateway', value, timestamp: new Date().toISOString() };
    this.broadcastRaw(msg);
  }

  get url(): string {
    return `http://localhost:${this.port}`;
  }

  private buildApp(): express.Express {
    const app = express();
    app.use(express.json());

    app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

    const auth = (req: Request, res: Response, next: () => void): void => {
      const token = req.header(NEXUS_DEFAULTS.TOKEN_HEADER);
      if (token !== this.token) {
        res.status(401).json({ error: 'unauthorized', message: `Invalid ${NEXUS_DEFAULTS.TOKEN_HEADER}` });
        return;
      }
      next();
    };

    app.get('/remotes', auth, (_req, res) => {
      res.json({
        remotes: this.remotes,
        total: this.remotes.length,
        enabled: this.remotes.filter((r) => r.enabled).length,
      });
    });

    app.post('/remotes', auth, (req, res) => {
      const newRemote = req.body as RemoteConfig;
      if (this.remotes.some((r) => r.name === newRemote.name)) {
        res.status(409).json({ error: 'conflict', message: `Remote ${newRemote.name} exists` });
        return;
      }
      const full: RemoteConfig = {
        ...newRemote,
        exposedModule: newRemote.exposedModule ?? './RemoteEntry',
        enabled: newRemote.enabled ?? true,
        addedAt: newRemote.addedAt ?? new Date().toISOString(),
      };
      this.remotes.push(full);
      this.broadcast();
      res.status(201).json(full);
    });

    app.put('/remotes/:name', auth, (req, res) => {
      const idx = this.remotes.findIndex((r) => r.name === req.params['name']);
      if (idx === -1) { res.status(404).json({ error: 'not_found' }); return; }
      this.remotes[idx] = { ...this.remotes[idx], ...req.body, name: this.remotes[idx].name };
      this.broadcast();
      res.json(this.remotes[idx]);
    });

    app.delete('/remotes/:name', auth, (req, res) => {
      const before = this.remotes.length;
      this.remotes = this.remotes.filter((r) => r.name !== req.params['name']);
      if (this.remotes.length === before) { res.status(404).json({ error: 'not_found' }); return; }
      this.broadcast();
      res.status(204).send();
    });

    app.post('/remotes/:name/toggle', auth, (req, res) => {
      const idx = this.remotes.findIndex((r) => r.name === req.params['name']);
      if (idx === -1) { res.status(404).json({ error: 'not_found' }); return; }
      this.remotes[idx].enabled = !this.remotes[idx].enabled;
      this.broadcast();
      res.json(this.remotes[idx]);
    });

    // ── Hosts ───────────────────────────────────────────────────────────────
    app.get('/api/hosts', auth, (_req, res) => res.json(this.hosts));

    app.get('/api/hosts/:id', auth, (req, res) => {
      const h = this.hosts.find((h) => h.id === req.params['id']);
      if (!h) { res.status(404).json({ error: 'not_found' }); return; }
      res.json(h);
    });

    app.get('/api/hosts/:id/remotes', auth, (req, res) => {
      const hostId = req.params['id'];
      const hostRemotes = this.remotes
        .filter((r) => !r.visibility || r.visibility === 'global' || r.visibility === `host:${hostId}`)
        .map((r) => ({ ...r, source: r.visibility === `host:${hostId}` ? 'host-specific' : 'global' }));
      res.json({ hostId, remotes: hostRemotes, total: hostRemotes.length });
    });

    app.post('/api/hosts', auth, (req, res) => {
      const body = req.body as Partial<HostConfig>;
      const host: HostConfig = createMockHost({
        ...body,
        id: String(Date.now()),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      this.hosts.push(host);
      res.status(201).json(host);
    });

    app.put('/api/hosts/:id', auth, (req, res) => {
      const idx = this.hosts.findIndex((h) => h.id === req.params['id']);
      if (idx === -1) { res.status(404).json({ error: 'not_found' }); return; }
      this.hosts[idx] = { ...this.hosts[idx], ...req.body, id: this.hosts[idx].id };
      res.json(this.hosts[idx]);
    });

    app.delete('/api/hosts/:id', auth, (req, res) => {
      const before = this.hosts.length;
      this.hosts = this.hosts.filter((h) => h.id !== req.params['id']);
      if (this.hosts.length === before) { res.status(404).json({ error: 'not_found' }); return; }
      res.status(204).send();
    });

    app.post('/api/hosts/:id/toggle', auth, (req, res) => {
      const idx = this.hosts.findIndex((h) => h.id === req.params['id']);
      if (idx === -1) { res.status(404).json({ error: 'not_found' }); return; }
      this.hosts[idx].enabled = !this.hosts[idx].enabled;
      res.json(this.hosts[idx]);
    });

    // ── Gates ───────────────────────────────────────────────────────────────
    app.get('/api/gates', auth, (_req, res) => res.json(this.gates));

    app.get('/api/gates/:id', auth, (req, res) => {
      const g = this.gates.find((g) => g.id === req.params['id']);
      if (!g) { res.status(404).json({ error: 'not_found' }); return; }
      res.json(g);
    });

    app.get('/api/gates/by-domain/:domain', auth, (req, res) => {
      const g = this.gates.find((g) => g.domain === req.params['domain']);
      if (!g) { res.status(404).json({ error: 'not_found' }); return; }
      res.json(g);
    });

    app.post('/api/gates', auth, (req, res) => {
      const body = req.body as Partial<GateConfig>;
      const host = this.hosts.find((h) => h.id === (body as { host_id?: string }).host_id) ?? createMockHost();
      const gate: GateConfig = createMockGate({
        ...body,
        host,
        id: String(Date.now()),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      this.gates.push(gate);
      res.status(201).json(gate);
    });

    app.put('/api/gates/:id', auth, (req, res) => {
      const idx = this.gates.findIndex((g) => g.id === req.params['id']);
      if (idx === -1) { res.status(404).json({ error: 'not_found' }); return; }
      this.gates[idx] = { ...this.gates[idx], ...req.body, id: this.gates[idx].id };
      res.json(this.gates[idx]);
    });

    app.delete('/api/gates/:id', auth, (req, res) => {
      const before = this.gates.length;
      this.gates = this.gates.filter((g) => g.id !== req.params['id']);
      if (this.gates.length === before) { res.status(404).json({ error: 'not_found' }); return; }
      res.status(204).send();
    });

    app.post('/api/gates/:id/toggle', auth, (req, res) => {
      const idx = this.gates.findIndex((g) => g.id === req.params['id']);
      if (idx === -1) { res.status(404).json({ error: 'not_found' }); return; }
      this.gates[idx].enabled = !this.gates[idx].enabled;
      res.json(this.gates[idx]);
    });

    // ── Gateway config ───────────────────────────────────────────────────────
    app.get('/api/config/gateway', auth, (_req, res) => res.json(this.gatewayConfig));
    app.put('/api/config/gateway', auth, (req, res) => {
      this.gatewayConfig = { ...this.gatewayConfig, ...req.body };
      res.json(this.gatewayConfig);
    });

    app.get('/api/config/gateway/protection', auth, (_req, res) => res.json(this.protectionConfig));
    app.put('/api/config/gateway/protection', auth, (req, res) => {
      this.protectionConfig = { ...this.protectionConfig, ...req.body };
      res.json(this.protectionConfig);
    });

    // ── Protection ───────────────────────────────────────────────────────────
    app.get('/api/protection/status', auth, (_req, res) => res.json({
      active_bans: [],
      top_ips: [],
      rate_limit_config: this.protectionConfig,
    }));

    app.post('/api/protection/ban', auth, (_req, res) => res.status(201).json({ ok: true }));
    app.delete('/api/protection/ban/:ip', auth, (_req, res) => res.status(204).send());
    app.delete('/api/protection/ban', auth, (_req, res) => res.status(204).send());

    return app;
  }

  private broadcast(): void {
    const msg: WebSocketMessage = { type: 'remotes_changed', timestamp: new Date().toISOString(), remotes: this.remotes, trigger: 'updated' };
    this.broadcastRaw(msg);
  }

  private broadcastRaw(msg: WebSocketMessage): void {
    const data = JSON.stringify(msg);
    for (const c of this.clients) {
      if (c.readyState === WebSocket.OPEN) c.send(data);
    }
  }
}
