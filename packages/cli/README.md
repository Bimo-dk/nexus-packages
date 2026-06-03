# @bimo-dk/nexus-cli

`bnx` — command-line tool for Bimo-Nexus.

## Installation

```bash
npm install -g @bimo-dk/nexus-cli
```

## Commands

| Command | Description |
|---|---|
| `bnx generate remote` | Scaffold a new remote (interactive prompts) |
| `bnx publish` | Register the current remote with the registry |
| `bnx status` | Table of all remotes |
| `bnx health` | Health check all remotes with response times |
| `bnx dev` | Start the nexus dev proxy |
| `bnx --version` | Version |

## Environment variables

- `BIMO_TOKEN` — required for publish/status/health
- `REGISTRY_URL` — default `http://localhost:3000`
- `REMOTE_URL` — URL that gets published (default `/remotes/<name>/remoteEntry.json`)
- `REMOTE_ROUTE` — override of route (default derived from name)

Loaded automatically from `.env` in cwd.

## Example

```bash
# 1. Scaffold
bnx generate remote
? Remote name: checkout
? Route path: checkout

# 2. Build
cd checkout && npm install && npm run build

# 3. Publish
export BIMO_TOKEN=your-secret
export REGISTRY_URL=http://localhost:3000
bnx publish
# -> ✓ Registered "checkout"

# 4. Verify
bnx status
# NAME      ROUTE       STATUS    ENABLED
# ─────────────────────────────────────────
# checkout  /checkout   healthy   yes
```
