# @bimo-nexus/cli

`bnx` — kommandolinje-værktøj til Bimo-Nexus.

## Installation

```bash
npm install -g @bimo-nexus/cli
```

## Kommandoer

| Kommando | Beskrivelse |
|---|---|
| `bnx generate remote` | Scaffold ny remote (interaktiv prompt) |
| `bnx publish` | Registrer current remote hos registry |
| `bnx status` | Tabel over alle remotes |
| `bnx health` | Health-check alle remotes med responsetider |
| `bnx dev` | Start nexus dev-proxy |
| `bnx --version` | Version |

## Environment variables

- `BIMO_TOKEN` — påkrævet for publish/status/health
- `REGISTRY_URL` — default `http://localhost:3000`
- `REMOTE_URL` — URL der publishes (default `/remotes/<name>/remoteEntry.json`)
- `REMOTE_ROUTE` — override af route (default afledt fra name)

Loades automatisk fra `.env` i cwd.

## Eksempel

```bash
# 1. Scaffold
bnx generate remote
? Remote name: checkout
? Route path: checkout

# 2. Byg
cd checkout && npm install && npm run build

# 3. Publish
export BIMO_TOKEN=your-secret
export REGISTRY_URL=http://localhost:3000
bnx publish
# → ✓ Registered "checkout"

# 4. Verify
bnx status
# NAME      ROUTE       STATUS    ENABLED
# ─────────────────────────────────────────
# checkout  /checkout   healthy   yes
```
