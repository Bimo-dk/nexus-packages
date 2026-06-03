import http from 'node:http';
import express, { type Request, type Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { NEXUS_DEFAULTS, type RemoteConfig, type WebSocketMessage } from '@bimo-dk/nexus-core';
import { createMockRegistryResponse } from './mock-remote-config.js';

export interface MockRegistryServerOptions {
  /** Initial remotes. Default: 2 mocks. */
  initialRemotes?: RemoteConfig[];
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
  private readonly token: string;
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private clients = new Set<WebSocket>();
  private port = 0;

  constructor(options: MockRegistryServerOptions = {}) {
    this.remotes = options.initialRemotes ?? createMockRegistryResponse(2).remotes;
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
      const msg: WebSocketMessage = { type: 'connected', remotes: this.remotes };
      ws.send(JSON.stringify(msg));
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

    return app;
  }

  private broadcast(): void {
    const msg: WebSocketMessage = { type: 'registry_updated', remotes: this.remotes };
    const data = JSON.stringify(msg);
    for (const c of this.clients) {
      if (c.readyState === WebSocket.OPEN) c.send(data);
    }
  }
}
