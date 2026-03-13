# MemeHub - 9GAG Clone

## Overview

MemeHub adalah platform berbagi meme mirip 9GAG dengan fitur lengkap, dibangun dengan React + Vite (frontend) dan Express (backend API).

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
- **User Profiles**: Avatar, bio, stats, follow/unfollow
- **Notifications**: Upvotes, comments, follows, replies
- **Tags**: Kategori meme yang bisa difilter
- **Search**: Cari post berdasarkan judul
- **Admin Panel**: Stats dashboard, manajemen user (ban/role), manajemen post (approve/remove), tags, site settings
- **Dark/Light Mode**: Toggle tema
- **Responsive**: Mobile-friendly

## Structure

```text
artifacts/
├── api-server/         # Express API server
│   └── src/
│       ├── lib/        # auth.ts, huggingface.ts
│       └── routes/     # auth, posts, comments, users, tags, notifications, upload, admin
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

## Cloudflare Pages Deployment

For Cloudflare Pages:
1. Build frontend: `pnpm --filter @workspace/memehub run build`
2. Deploy `artifacts/memehub/dist/` to Cloudflare Pages
3. Set up a separate backend (e.g., Cloudflare Workers or VPS) for `/api` routes
4. Update API base URL in frontend config

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
