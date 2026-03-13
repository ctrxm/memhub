# Deploy MemeHub — Cloudflare Pages + Vercel (Backend)

Panduan lengkap men-deploy **frontend** ke Cloudflare Pages dan **backend API** ke Vercel (atau Railway/Render sebagai alternatif).

---

## Arsitektur Deployment

```
┌─────────────────────────────┐     ┌──────────────────────────────┐
│   Cloudflare Pages (Free)   │────▶│   Vercel Serverless (Free)   │
│   artifacts/memehub         │     │   artifacts/api-server        │
│   React + Vite SPA          │     │   Express + TypeScript        │
└─────────────────────────────┘     └──────────────┬───────────────┘
                                                    │
                                      ┌─────────────▼────────────┐
                                      │   Supabase PostgreSQL    │
                                      │   aws-1-ap-southeast-1   │
                                      └──────────────────────────┘
```

---

## Bagian 1: Deploy Backend ke Vercel ⭐ (Recommended)

File `vercel.json` dan `artifacts/api-server/api/index.js` sudah dibuat di project. Ikuti langkah berikut:

### Langkah-langkah

**1. Buat akun Vercel** di [vercel.com](https://vercel.com) (login via GitHub)

**2. Install Vercel CLI** (opsional, bisa juga via dashboard):
```bash
npm install -g vercel
```

**3. Deploy via Vercel Dashboard:**
- Buka [vercel.com/new](https://vercel.com/new)
- Klik **"Import Git Repository"** → pilih repo MemeHub
- Pada bagian **"Configure Project"**:
  - **Framework Preset**: Other
  - **Root Directory**: `.` *(biarkan di root monorepo)*
  - **Build Command**: *(kosongkan / leave empty)*
  - **Output Directory**: *(kosongkan / leave empty)*
  - **Install Command**: `pnpm install --frozen-lockfile`

**4. Set Environment Variables** di Vercel dashboard → Settings → Environment Variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `DATABASE_URL` | `postgresql://postgres.mzrwchhkxxzkjinrnosw:HendraWahyu@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres` | Production, Preview |
| `SESSION_SECRET` | *(random string 32+ karakter)* | Production, Preview |
| `HUGGINGFACE_TOKEN` | `hf_xxxx` | Production, Preview |
| `HUGGINGFACE_REPO` | `kalcer/kalcer` | Production, Preview |
| `NODE_ENV` | `production` | Production |
| `ALLOWED_ORIGINS` | `https://memehub.pages.dev` *(ganti dengan domain CF Pages kamu)* | Production |

**5. Klik "Deploy"** — Vercel akan otomatis detect `vercel.json` dan deploy.

**6. Catat URL backend** yang diberikan, misal:
```
https://memehub-backend.vercel.app
```

### Deploy via CLI
```bash
# Di root project
vercel

# Set secrets
vercel env add DATABASE_URL
vercel env add SESSION_SECRET
vercel env add HUGGINGFACE_TOKEN

# Deploy ke production
vercel --prod
```

### Catatan Penting Vercel

> **File Upload:** Vercel free tier memiliki batas ukuran request body **4.5 MB**. Untuk gambar besar, upgrade ke Pro (batas 100 MB) atau gunakan Railway/Render.

> **Cold Start:** Serverless functions memiliki cold start ~1-2 detik pada request pertama setelah idle.

> **Timeout:** Free tier timeout 10 detik, Pro tier 60 detik. Jika upload ke HuggingFace lambat, pertimbangkan Railway.

---

## Bagian 2: Alternatif Backend — Railway

Cocok jika sering upload file besar atau butuh uptime tanpa cold start.

**1. Buka** [railway.app](https://railway.app) → New Project → Deploy from GitHub

**2. Settings:**
- **Root Directory**: `artifacts/api-server`
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `node dist/index.cjs`

**3. Environment Variables** (sama seperti di atas)

**4. Catat domain** Railway: `https://memehub-api.up.railway.app`

---

## Bagian 3: Deploy Frontend ke Cloudflare Pages

**1. Buka** [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages**

**2. Connect to Git** → pilih repo MemeHub

**3. Konfigurasi Build:**

| Setting | Value |
|---------|-------|
| **Framework preset** | `Vite` |
| **Root directory** | `artifacts/memehub` |
| **Build command** | `cd ../.. && pnpm install && pnpm --filter @workspace/memehub build` |
| **Build output directory** | `dist` |
| **Node.js version** | `20` |

**4. Environment Variables:**

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://memehub-backend.vercel.app` *(URL backend Vercel kamu)* |
| `NODE_VERSION` | `20` |

**5. Klik "Save and Deploy"**

URL frontend akan seperti: `https://memehub.pages.dev`

---

## Bagian 4: Konfigurasi VITE_API_URL di Frontend

Setelah deploy backend ke Vercel, update `vite.config.ts` dan fetch agar support API URL eksternal.

Edit `artifacts/memehub/src/lib/fetch-override.ts`, tambahkan di bagian atas:

```ts
// Gunakan VITE_API_URL jika di-set (production), atau BASE_URL (development)
const EXTERNAL_API = import.meta.env.VITE_API_URL || "";
```

Kemudian, setiap fetch ke `/api/` akan diarahkan ke URL Vercel backend.

> **Cara lebih mudah:** Di Cloudflare Pages, set `VITE_API_URL` ke URL Vercel backend. Lalu di `fetch-override.ts`, prefix semua `/api/` calls dengan `EXTERNAL_API`.

---

## Bagian 5: SPA Routing

File `artifacts/memehub/public/_redirects` sudah ada:
```
/* /index.html 200
```

Ini memastikan route seperti `/post/123`, `/u/username`, `/tag/funny` tidak menghasilkan 404.

---

## Bagian 6: Database Supabase

Database sudah dikonfigurasi. Connection string (simpan sebagai `DATABASE_URL` di backend):

```
postgresql://postgres.mzrwchhkxxzkjinrnosw:HendraWahyu@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

Port **6543** = PgBouncer (connection pooler) — lebih stabil untuk serverless.

### Migrasi ulang jika diperlukan:
```bash
DATABASE_URL="postgresql://postgres.mzrwchhkxxzkjinrnosw:HendraWahyu@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres" pnpm --filter @workspace/db drizzle-kit push
```

---

## Checklist Deploy

### Backend (Vercel)
- [ ] `vercel.json` ada di root repo ✅ *(sudah dibuat)*
- [ ] `artifacts/api-server/api/index.ts` ada ✅ *(sudah dibuat)*
- [ ] Environment variables diset di Vercel dashboard
- [ ] Deploy berhasil, endpoint `/api/posts` merespons

### Frontend (Cloudflare Pages)
- [ ] Build command menggunakan `pnpm install && pnpm --filter @workspace/memehub build`
- [ ] Root directory = `artifacts/memehub`
- [ ] `VITE_API_URL` diset ke URL backend Vercel
- [ ] `public/_redirects` ada ✅ *(sudah dibuat)*
- [ ] Semua halaman dapat diakses (tag, notifikasi, settings)

---

## Troubleshooting

### Build Gagal di Cloudflare Pages — "Cannot find module @workspace/db"
Build command harus dimulai dari root monorepo:
```bash
cd ../.. && pnpm install && pnpm --filter @workspace/memehub build
```

### Error 500 di Vercel — "DATABASE_URL not set"
Pastikan `DATABASE_URL` sudah diset di Vercel environment variables, bukan `SUPABASE_DATABASE_URL`.

### CORS Error di Browser
Tambahkan domain CF Pages ke `ALLOWED_ORIGINS` di Vercel environment variables:
```
ALLOWED_ORIGINS=https://memehub.pages.dev,https://your-domain.com
```

### Upload Gambar Gagal di Vercel (413 Payload Too Large)
Gambar melebihi batas 4.5 MB Vercel free tier. Solusi:
1. Upgrade ke Vercel Pro, atau
2. Pindah backend ke Railway (tidak ada batas ukuran body)

### Supabase Connection Error — "SSL required"
Tambahkan `?sslmode=require` ke connection string, atau pastikan kode menggunakan `ssl: { rejectUnauthorized: false }` (sudah dikonfigurasi di `lib/db/src/index.ts` ✅).
