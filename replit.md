# OVRHUB - Meme Community Platform

## Overview

OVRHUB (rebranded from MemeHub) adalah platform berbagi meme mirip 9GAG dengan fitur lengkap, dibangun dengan React + Vite (frontend) dan Express (backend API).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Backend**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Authentication**: JWT (bcryptjs + jsonwebtoken)
- **Image Storage**: Hugging Face Datasets (configurable, fallback to local)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Features

- **Feed**: Hot/Trending/Fresh/Top tabs dengan infinite scroll
- **Posts**: Upload meme (image/gif), vote, save, share
- **Comments**: Threaded comments dengan vote
- **User Profiles**: Redesigned with animated banner, gradient header, badge showcase, tabbed posts/saved
- **Badges**: Full badge system — create/delete badges, award/revoke to users, display on profile and post cards
- **Notifications**: Upvotes, comments, follows, replies
- **Tags**: Kategori meme yang bisa difilter
- **Search**: Cari post berdasarkan judul
- **Admin Panel**: Stats dashboard, users management, posts approval, Badges CRUD + award, Tags CRUD, site settings, Tip Applications (approve/reject)
- **Email OTP Verification**: 6-digit OTP via SMTP (nodemailer), configurable on/off via admin settings
- **Crypto Tips (NOWPayments)**: Users can apply for tip feature (requires 1000+ followers + verified badge), send crypto tips on posts (BTC/ETH/USDT/etc), wallet dashboard for received/sent tips with status tracking, admin approves/rejects applications
- **Communities**: Full 9GAG-style community system — create, join/leave, community feeds, community sidebar widget
- **Navigation**: Hamburger menu drawer (left of logo) with full nav, communities, tags. Search/upload moved out of navbar
- **Dark/Light Mode**: Toggle tema
- **Responsive**: Mobile-friendly

## Structure

```text
artifacts/
├── api-server/         # Express API server
│   └── src/
│       ├── lib/        # auth.ts, huggingface.ts, email.ts, nowpayments.ts
│       └── routes/     # auth, posts, comments, users, tags, notifications, upload, admin, tips
├── memehub/            # React + Vite frontend
│   └── src/
│       ├── components/ # Navbar, Sidebar, PostCard
│       ├── pages/      # Home, PostDetail, Upload, Profile, Admin, Login, Register, etc.
│       └── hooks/      # use-auth.tsx
lib/
├── api-spec/           # OpenAPI spec
├── api-client-react/   # Generated React Query hooks
├── api-zod/            # Generated Zod schemas
└── db/
    └── src/schema/     # users, posts, comments, tags, notifications, settings
```

## Demo Accounts

- **Admin**: email `admin@memehub.com`, password `admin123`
- **Regular users**: `memekid@test.com`, `dankmaster@test.com` (password: pass123)

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string (auto-provided)
- `JWT_SECRET`: Secret key for JWT signing (defaults to dev key)
- `HUGGINGFACE_TOKEN`: Hugging Face API token for image upload
- `HUGGINGFACE_REPO`: Hugging Face Dataset repo (e.g., `username/memes-dataset`)

## Hugging Face Setup

Set `HUGGINGFACE_TOKEN` and `HUGGINGFACE_REPO` in environment secrets. Images will be uploaded to the dataset repo. Without these, images are served from local `/uploads/` directory.

## Replit Development Setup

Two workflows run concurrently:
- **"Start application"**: React + Vite frontend on port 5000 (`PORT=5000 pnpm --filter @workspace/memehub run dev`)
- **"API Server"**: Express backend on port 3000 (`PORT=3000 pnpm --filter @workspace/api-server run dev`)

The Vite dev server proxies `/api` and `/uploads` requests to the backend at `localhost:3000`, so the frontend uses relative URLs (`/api/...`) without needing to know the backend port.

Before starting the API server, the workspace library packages must be built:
```
pnpm --filter @workspace/db build
pnpm --filter @workspace/api-zod build
```

## API Routes

- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/posts?section=hot` - Feed
- `POST /api/posts` - Create post
- `POST /api/posts/:id/vote` - Vote
- `POST /api/posts/:id/save` - Save/unsave
- `GET /api/posts/:id/comments` - Comments
- `POST /api/posts/:id/comments` - Add comment
- `GET /api/users/:username` - Profile
- `POST /api/users/:username/follow` - Follow
- `GET /api/tags` - All tags
- `GET /api/notifications` - Notifications
- `POST /api/upload/image` - Upload image
- `GET /api/admin/stats` - Admin stats (admin only)
- `GET /api/admin/users` - Manage users (admin only)
- etc.
