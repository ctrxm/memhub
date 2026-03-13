# Deploy MemeHub ke Cloudflare Pages

Panduan ini menjelaskan cara men-deploy **frontend MemeHub** ke Cloudflare Pages dan **backend API** ke layanan seperti Railway, Render, atau Fly.io.

---

## Arsitektur Deployment

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│   Cloudflare Pages (Free)   │────▶│  Backend API (Railway/Render)│
│   artifacts/memehub         │     │  artifacts/api-server        │
│   React + Vite SPA          │     │  Express + TypeScript        │
└─────────────────────────────┘     └──────────────────┬───────────┘
                                                        │
                                          ┌─────────────▼────────────┐
                                          │   Supabase PostgreSQL    │
                                          │   (Database)             │
                                          └──────────────────────────┘
```

---

## Bagian 1: Deploy Backend API

### Opsi A — Railway (Recommended, Free Tier Available)

1. **Buat akun** di [railway.app](https://railway.app)

2. **Buat project baru** → "Deploy from GitHub repo"

3. **Pilih root directory**: `artifacts/api-server`

4. **Set environment variables** di Railway dashboard:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | `postgresql://postgres.mzrwchhkxxzkjinrnosw:HendraWahyu@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres` |
   | `SESSION_SECRET` | `generate-random-string-min-32-chars` |
   | `HUGGINGFACE_TOKEN` | `hf_your_token_here` |
   | `HUGGINGFACE_REPO` | `kalcer/kalcer` |
   | `NODE_ENV` | `production` |
   | `PORT` | `8080` |
   | `ALLOWED_ORIGINS` | `https://memehub.pages.dev` *(ganti dengan domain CF Pages kamu)* |

5. **Build command**: `pnpm --filter @workspace/api-server build`

6. **Start command**: `pnpm --filter @workspace/api-server start`

7. **Catat URL** yang diberikan Railway (misal: `https://memehub-api.up.railway.app`)

---

### Opsi B — Render (Free Tier Available)

1. Buat akun di [render.com](https://render.com)
2. **New → Web Service** → connect repo
3. **Root Directory**: `artifacts/api-server`
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `node dist/index.js`
6. Isi environment variables sama seperti di atas

---

### Opsi C — Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Deploy dari direktori api-server
cd artifacts/api-server
flyctl launch
flyctl secrets set DATABASE_URL="postgresql://..."
flyctl secrets set SESSION_SECRET="..."
flyctl deploy
```

---

## Bagian 2: Konfigurasi Frontend untuk Production

Edit file `artifacts/memehub/vite.config.ts`, tambahkan variable API URL production:

```ts
// artifacts/memehub/vite.config.ts
export default defineConfig({
  // ...existing config...
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || ''
    ),
  },
});
```

Edit `artifacts/memehub/src/lib/fetch-override.ts`, tambahkan support untuk `VITE_API_URL`:

```ts
// Jika VITE_API_URL di-set, gunakan untuk semua API calls
const API_BASE = import.meta.env.VITE_API_URL || '';
```

---

## Bagian 3: Deploy ke Cloudflare Pages

### Cara 1 — Via Cloudflare Dashboard (Recommended)

1. **Buka** [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages** → **Create a project**

2. **Connect to Git** → authorize GitHub/GitLab → pilih repo MemeHub

3. **Konfigurasi build**:

   | Setting | Value |
   |---------|-------|
   | **Framework preset** | `Vite` |
   | **Root directory** | `artifacts/memehub` |
   | **Build command** | `pnpm install && pnpm --filter @workspace/memehub build` |
   | **Build output directory** | `artifacts/memehub/dist` |
   | **Node.js version** | `20` |

4. **Environment Variables** (di tab "Environment variables"):

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://memehub-api.up.railway.app` *(URL backend kamu)* |
   | `NODE_VERSION` | `20` |

5. Klik **Save and Deploy**

6. Cloudflare akan otomatis build dan deploy. URL akan seperti:
   `https://memehub.pages.dev`

---

### Cara 2 — Via Wrangler CLI

```bash
# Install Wrangler
npm install -g wrangler

# Login ke Cloudflare
wrangler login

# Build frontend
cd artifacts/memehub
pnpm build

# Deploy ke Pages
wrangler pages deploy dist --project-name=memehub
```

---

## Bagian 4: SPA Routing

File `artifacts/memehub/public/_redirects` sudah dibuat:

```
/* /index.html 200
```

File ini memastikan semua route (misal `/post/123`, `/u/username`) di-handle oleh React Router, bukan 404 dari server.

---

## Bagian 5: CORS Backend

Pastikan backend API mengizinkan domain Cloudflare Pages. Di `artifacts/api-server/src/index.ts`:

```ts
app.use(cors({
  origin: [
    'https://memehub.pages.dev',       // domain CF Pages
    'https://your-custom-domain.com',   // custom domain (jika ada)
    'http://localhost:20734',           // development
  ],
  credentials: true,
}));
```

---

## Bagian 6: Database Supabase (Sudah Terkonfigurasi)

Database Supabase sudah dikonfigurasi di environment variable `SUPABASE_DATABASE_URL`. Untuk production, set `DATABASE_URL` di backend server ke:

```
postgresql://postgres.mzrwchhkxxzkjinrnosw:HendraWahyu@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

**Connection pooling**: URL di atas menggunakan port `6543` (PgBouncer pooler) yang cocok untuk serverless/production load.

### Jalankan Migrasi Manual

Jika perlu migrasi ulang:

```bash
# Dari root project
SUPABASE_DATABASE_URL="postgresql://..." pnpm --filter @workspace/db drizzle-kit push
```

---

## Bagian 7: Custom Domain (Opsional)

1. Di Cloudflare Pages → **Custom domains** → **Set up a custom domain**
2. Masukkan domain kamu (misal: `memehub.com`)
3. Ikuti instruksi DNS yang diberikan Cloudflare
4. Update `ALLOWED_ORIGINS` di backend dengan domain baru

---

## Checklist Deploy

- [ ] Backend deployed dan dapat diakses via HTTPS
- [ ] `VITE_API_URL` diset ke URL backend
- [ ] Cloudflare Pages build berhasil
- [ ] `public/_redirects` ada dan berisi `/* /index.html 200`
- [ ] CORS backend mengizinkan domain Cloudflare Pages
- [ ] Database Supabase dapat diakses dari backend production
- [ ] Test login, upload meme, dan komentar di production

---

## Troubleshooting

### Build Gagal di Cloudflare Pages

Pastikan `pnpm-lock.yaml` ada di root repo dan di-commit ke git. Cloudflare Pages memerlukan lockfile untuk instalasi yang deterministik.

### API Calls Gagal (CORS Error)

Tambahkan domain CF Pages ke whitelist CORS di backend, lalu redeploy backend.

### Database Connection Timeout

Supabase pooler (`port 6543`) lebih stabil untuk production. Jika timeout, coba tambahkan `?pgbouncer=true&connection_limit=1` ke connection string.

### HuggingFace Upload Gagal di Production

Pastikan `HUGGINGFACE_TOKEN` di-set di environment backend production.
