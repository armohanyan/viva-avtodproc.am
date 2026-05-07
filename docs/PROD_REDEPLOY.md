# Viva Production Redeploy Guide

This project runs two Node services in production:

- `viva-api` from `backend` (`npm run start`)
- `viva-web` from `client/apps/web` (`npm run start`, Next.js)

Use this checklist on your server each time you redeploy.

## 1) One-time server setup

Install required tools:

```bash
apt update
apt install -y git curl nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm i -g pm2
```

Verify versions:

```bash
node -v
npm -v
pm2 -v
```

## 2) First-time app setup

```bash
mkdir -p /var/www
cd /var/www
git clone <YOUR_REPO_URL> viva-avtodproc.am
cd viva-avtodproc.am
```

Install dependencies:

```bash
npm ci
npm ci --prefix backend
npm ci --prefix client
```

Create env files:

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Set production values in `backend/.env` (DB, JWT, CORS, mail, URLs).

## 3) Redeploy (every update)

From project root:

```bash
cd /var/www/viva-avtodproc.am
git pull origin <YOUR_BRANCH>

npm ci
npm ci --prefix backend
npm ci --prefix client

npm run build --prefix backend
npm run build -w web --prefix client
```

## 4) Start or restart services with PM2

Remove old broken entries (safe if not present):

```bash
pm2 delete viva-api || true
pm2 delete viva-web || true
```

Start API:

```bash
pm2 start npm --name viva-api --cwd /var/www/viva-avtodproc.am/backend -- start
```

Start Web (Next app workspace):

```bash
PORT=13102 HOSTNAME=127.0.0.1 pm2 start npm --name viva-web --cwd /var/www/viva-avtodproc.am/client/apps/web -- start
```

Persist PM2 state:

```bash
pm2 save
pm2 startup
```

Run the `pm2 startup` command output once, then run `pm2 save` again.

## 5) Health checks

```bash
pm2 list
pm2 logs viva-api --lines 80
pm2 logs viva-web --lines 80
```

Port checks:

```bash
ss -ltnp | rg 3001
ss -ltnp | rg 13102
```

## 6) Nginx reverse proxy example

Create `/etc/nginx/sites-available/viva`:

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location /api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location / {
    proxy_pass http://127.0.0.1:13102;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Enable and reload:

```bash
ln -sf /etc/nginx/sites-available/viva /etc/nginx/sites-enabled/viva
nginx -t
systemctl reload nginx
```

## 7) Common errors and fixes

### Error: `Missing script: "start"`

Cause: PM2 started from wrong folder.

Correct folders:

- API must run from `backend`
- Web must run from `client/apps/web` (not `client`)

Quick verify:

```bash
npm run --prefix /var/www/viva-avtodproc.am/backend
npm run --prefix /var/www/viva-avtodproc.am/client/apps/web
```

### Error: `EADDRINUSE 127.0.0.1:13102`

Port already busy.

```bash
ss -ltnp | rg 13102
lsof -iTCP:13102 -sTCP:LISTEN -n -P
```

Stop duplicate process, then restart:

```bash
pm2 delete viva-web || true
kill -9 <PID_USING_13102>
PORT=13102 HOSTNAME=127.0.0.1 pm2 start npm --name viva-web --cwd /var/www/viva-avtodproc.am/client/apps/web -- start
```

## 8) Quick daily commands

```bash
pm2 list
pm2 restart viva-api
pm2 restart viva-web
pm2 logs viva-api --lines 100
pm2 logs viva-web --lines 100
```

