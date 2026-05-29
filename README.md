# MarketPulse

MarketPulse is a small full-stack app: a **TradingView Market Overview** dashboard with a **managed watchlist** (add / edit / delete symbols), **English & Greek** UI, **JWT authentication**, and a **profile** popup to change your password. Watchlist data is stored in **`config-data/default-watchlist.json`** via the API; users and sessions use **SQLite** (default) or **MySQL**.

## Features

| Area | Description |
|------|-------------|
| **Dashboard** | Embedded TradingView widget; tabs follow your watchlist categories (tech, europe, Asia & World, indices, crypto). |
| **Watchlist CRUD** | Insert, edit, update, delete symbols with category (`cat`). Changes persist through the API into `config-data/default-watchlist.json` (debounced ~600ms). |
| **i18n** | **EN** / **GR** toggle; saved in `localStorage`. TradingView widget locale follows the selection. |
| **Auth** | Register, login, JWT in `localStorage`. Routes: `/` → login or dashboard; `/login`, `/register`, protected `/dashboard`. |
| **Profile menu** | Header **Menu → Profile** opens a modal: email, **change password** (`PUT /api/auth/password`). |
| **Database** | **SQLite** by default (`data/marketpulse.sqlite`) when no MySQL env is set; optional **MySQL** for production scale. |
| **Default symbols** | `config-data/default-watchlist.example.json` is committed; `default-watchlist.json` is local (see `.gitignore`) and seeded/copied as needed. |

## Tech stack

- **Frontend:** React 19, Vite 8, React Router 7  
- **Backend:** Express 5, `jsonwebtoken`, `bcryptjs`, `dotenv`, `cors`  
- **DB:** `better-sqlite3` **or** `mysql2`  
- **External:** [TradingView embed widget](https://www.tradingview.com/widget/) (script from `s3.tradingview.com`)

## Project layout

```
marketpulse/
├── config-data/           # default-watchlist JSON (example committed; real file often gitignored)
├── data/                  # SQLite file (gitignored) when using SQLite
├── deploy/
│   └── apache-marketpulse.conf.example   # Apache vhost blueprint
├── server/
│   ├── index.js           # Express entry
│   ├── config.js          # env + SQLite vs MySQL resolution
│   ├── db.js              # DB adapter
│   ├── db/mysql.js, db/sqlite.js
│   ├── routes/auth.js, routes/watchlist.js
│   ├── middleware/auth.js
│   ├── lib/default-watchlist.js   # read/write default-watchlist.json
│   ├── schema.sql / schema-sqlite.sql
├── src/
│   ├── App.jsx            # routes + providers
│   ├── pages/Dashboard.jsx, AuthPage.jsx
│   ├── api/client.js
│   ├── auth/
│   ├── i18n/
│   └── components/
├── .env.example
├── package.json
└── vite.config.js         # dev proxy /api → :3001
```

## Prerequisites

- **Node.js** (LTS recommended) and npm  
- For **MySQL** mode: a MySQL server and empty database

## Quick start (development)

```bash
cd marketpulse
cp .env.example .env
# Edit .env: set JWT_SECRET; add MySQL vars only if you use MySQL

# Ensure local watchlist file exists (optional; server can copy from .example)
cp -n config-data/default-watchlist.example.json config-data/default-watchlist.json

npm install
npm run dev
```

- **Frontend:** http://localhost:5173 (Vite)  
- **API:** http://localhost:3001  
- In dev, Vite proxies **`/api`** to the API, so the browser uses relative `/api/...`.

**Scripts**

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite + `node --watch server/index.js` (via `concurrently`) |
| `npm run dev:client` | Vite only |
| `npm run dev:server` | API only with watch |
| `npm run build` | Production SPA → `dist/` |
| `npm run start:server` | Production API: `node server/index.js` |
| `npm run preview` | Preview built SPA |
| `npm run lint` | ESLint |

## Configuration (`.env`)

Copy `.env.example` to `.env`. Important:

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `3001`) |
| `JWT_SECRET` | **Required in production** — long random string; never commit real value |
| `DB_DRIVER` | `sqlite` or `mysql` (optional; see driver logic below) |
| `SQLITE_PATH` | Path to SQLite file (default: `./data/marketpulse.sqlite` under package) |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL when using MySQL |

**SQLite vs MySQL**

- Set **`DB_DRIVER=sqlite`** to force SQLite.
- If **`DB_DRIVER=mysql`** **or** any of **`DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`** is set in `.env` (and SQLite is not forced), the app uses **MySQL**.
- Otherwise it uses **SQLite** at `SQLITE_PATH` (directory created automatically).

## HTTP API

Base path: **`/api`** (same origin in production behind Apache, or proxied in dev).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | `{ ok, db: 'sqlite' \| 'mysql' }` |
| `POST` | `/api/auth/register` | No | `{ email, password }` → `{ token, user }` |
| `POST` | `/api/auth/login` | No | `{ email, password }` → `{ token, user }` |
| `GET` | `/api/auth/me` | Bearer | `{ user }` |
| `PUT` | `/api/auth/password` | Bearer | `{ currentPassword, newPassword }` |
| `GET` | `/api/watchlist` | Bearer | `{ items }` from `default-watchlist.json` |
| `PUT` | `/api/watchlist` | Bearer | `{ items }` — replaces file content (normalized `s`, `d`, `cat`) |

Watchlist storage is **shared** through **`config-data/default-watchlist.json`** (not per-user in DB). The API process must have **write permission** to that file.

## Production overview

1. **Build the SPA:** `npm ci --omit=dev && npm run build` → output in **`dist/`**.  
2. **Run the API** on `127.0.0.1:PORT` (e.g. **3001**) with production `.env` / env vars (`JWT_SECRET`, DB, etc.). Use **systemd**, **pm2**, or similar — not `vite dev`.  
3. **Reverse proxy** (Apache, nginx, Caddy): serve **`dist/`** as static files and **`/api`** → Node.  
4. **Client-side routes** (`/login`, `/dashboard`, …) need SPA fallback to **`index.html`** (see Apache `FallbackResource` below).  
5. **Persistence:** mount or backup **`data/`** (SQLite) and ensure **`config-data/default-watchlist.json`** is writable.

Relative `/api` in the browser only works if the site is served on the **same origin** as the API (typical with a reverse proxy). If you split static and API on different origins, you would need a `VITE_API_BASE` (not implemented in this package yet).

---

## Apache 2 blueprint (`marketpulse.conf`)

**Enable modules:**

```bash
sudo a2enmod proxy proxy_http rewrite headers
# For HTTPS later: sudo a2enmod ssl
sudo systemctl restart apache2
```

**Example vhost** (adjust `ServerName`, `DocumentRoot`, and API port). A copy also lives in **`deploy/apache-marketpulse.conf.example`**.

```apache
<VirtualHost *:80>
    ServerName marketpulse.example.com

    DocumentRoot /var/www/marketpulse/dist

    <Directory /var/www/marketpulse/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
        FallbackResource /index.html
    </Directory>

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "http"

    ProxyPass        /api http://127.0.0.1:3001/api
    ProxyPassReverse /api http://127.0.0.1:3001/api

    ErrorLog ${APACHE_LOG_DIR}/marketpulse-error.log
    CustomLog ${APACHE_LOG_DIR}/marketpulse-access.log combined
</VirtualHost>
```

**Enable site:**

```bash
sudo cp deploy/apache-marketpulse.conf.example /etc/apache2/sites-available/marketpulse.conf
sudo nano /etc/apache2/sites-available/marketpulse.conf   # edit paths & ServerName
sudo a2ensite marketpulse.conf
sudo apache2ctl configtest
sudo systemctl reload apache2
```

**Deploy static files:**

```bash
sudo mkdir -p /var/www/marketpulse/dist
sudo rsync -av dist/ /var/www/marketpulse/dist/
```

**Run API (example with pm2):**

```bash
cd /path/to/marketpulse
npm ci --omit=dev
export $(grep -v '^#' .env | xargs)   # or use systemd EnvironmentFile
pm2 start server/index.js --name marketpulse-api
pm2 save && pm2 startup
```

**Checks**

- Open the site root → login/register UI.  
- `https://your-domain/api/health` → JSON with `"ok": true`.

**HTTPS:** use Let’s Encrypt (`certbot --apache`) or duplicate the vhost on `:443` with `SSLEngine on` and certificates; set `RequestHeader set X-Forwarded-Proto "https"`.

## Security notes

- Set a strong **`JWT_SECRET`** in production.  
- Prefer **HTTPS** in production.  
- Consider rate limiting on **`/api/auth/login`** and **`/api/auth/register`**.  
- Tighten **CORS** in `server/index.js` if you ever serve the SPA from another origin.

## TradingView symbol links (US500 / indices)

The Market Overview widget opens symbol pages when each row uses a **full TradingView id**: `EXCHANGE:TICKER`. Short codes like `US500` or `SPX` alone may quote in some contexts but often **break links**.

For **US cash indices**, the same feed that powers `TVC:GOLD` / `TVC:SILVER` usually works with the **`TVC:`** prefix, e.g. **`TVC:SPX`**, **`TVC:NDQ`** (US 100 on TVC), **`TVC:DJI`**, **`TVC:VIX`**. Use **`TVC:NDQ`**, not `TVC:NDX`/`NASDAQ:NDX`, for the widget’s US 100 stream. Exchange-specific ids such as `SP:SPX` or `CBOE:VIX` may open charts but **show no quote / warning** in the free embed.

Before the embed script loads, the app sets `window.TradingViewCustomWidgetSettings['symbol-url']` to  
`https://www.tradingview.com/chart/?symbol={tvprosymbol}` so clicks open the chart with the correct encoded symbol when the embed supports global link templates.

Verify symbols with [TradingView symbol search](https://www.tradingview.com/symbols/).

