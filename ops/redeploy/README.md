# Redeploy

Run production redeploy on server for this repo:

```bash
bash ops/redeploy/redeploy-server.sh
```

What it does on the server:

1. `git pull --ff-only`
2. Build backend and client apps
3. Restart PM2 processes (`viva-api`, `viva-web`)
4. Print PM2 status and basic health checks

Environment variables (optional):

- `DEPLOY_HOST` (default: `178.104.115.86`)
- `DEPLOY_USER` (default: `root`)
- `DEPLOY_PATH` (default: `/var/www/viva-avtodproc.am`)
