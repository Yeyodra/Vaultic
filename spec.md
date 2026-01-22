# Vaultic - Unified Cloud Storage Manager

## Project Overview

**Vaultic** adalah aplikasi desktop + web untuk unified cloud storage manager yang mengintegrasikan multiple Cloudflare R2 accounts (via Workers) dalam satu interface.

### Target User
Personal use untuk menyimpan file penelitian/skripsi dengan redundancy di multiple cloud providers.

### Key Problems Solved
- Manage multiple R2 accounts dari satu aplikasi
- Config tersimpan di cloud (bukan localStorage) - solve masalah reinstall/pindah device
- Upload ke multiple providers sekaligus untuk redundancy
- Access via desktop app atau web browser

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         YOUR DEVICES                                 │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐                      │
│   │ Laptop 1 │    │ Laptop 2 │    │ PC Baru  │                      │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘                      │
│        │               │               │                             │
│        └───────────────┼───────────────┘                             │
│                        ▼                                             │
│              ┌─────────────────┐                                     │
│              │   AUTH WORKER   │  ← Master config storage            │
│              │  (Cloudflare)   │                                     │
│              │                 │                                     │
│              │  - OAuth Google │                                     │
│              │  - Provider list│                                     │
│              │  - App settings │                                     │
│              └────────┬────────┘                                     │
│                       │                                              │
│                       ▼ (returns config)                             │
│    ┌──────────────────┼──────────────────┐                          │
│    ▼                  ▼                  ▼                          │
│ ┌────────┐      ┌────────┐        ┌────────┐                        │
│ │R2 Acc 1│      │R2 Acc 2│        │R2 Acc N│   ← Storage providers  │
│ │Worker A│      │Worker B│        │Worker N│     (dynamic add/remove)│
│ └────────┘      └────────┘        └────────┘                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Platform Support

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE BACKEND                            │
│                      (Shared across all clients)                     │
│                                                                      │
│    ┌─────────────────┐         ┌─────────────────┐                  │
│    │   AUTH WORKER   │         │ STORAGE WORKERS │                  │
│    │   + R2 Config   │         │   (Multiple)    │                  │
│    └────────┬────────┘         └────────┬────────┘                  │
│             │                           │                            │
└─────────────┼───────────────────────────┼────────────────────────────┘
              │         SAME API          │
              └─────────────┬─────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
      ┌───────────┐   ┌───────────┐   ┌───────────┐
      │  DESKTOP  │   │    WEB    │   │  MOBILE   │
      │  (Tauri)  │   │  (Pages)  │   │ (Future)  │
      │           │   │           │   │           │
      │ - Offline │   │ - Access  │   │ - PWA or  │
      │   capable │   │   anywhere│   │   Native  │
      │ - Native  │   │ - No      │   │           │
      │   file IO │   │   install │   │           │
      └───────────┘   └───────────┘   └───────────┘
            │               │
            └───────┬───────┘
                    │
           SHARED UI CODEBASE
              (React)
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Tauri 2.0 | Rust backend, small bundle size |
| Frontend | React + TypeScript + Vite | Mainstream, banyak resources |
| Styling | Tailwind CSS + shadcn/ui | Fast development, professional UI |
| State | Zustand | Simple, minimal boilerplate |
| HTTP Client | reqwest (Rust) | Rust standard |
| Async Runtime | tokio | De-facto standard |
| Database | R2 (JSON config) | Cloud-native, no local DB needed |
| Backend | Cloudflare Workers | Serverless, free tier |
| Storage | Cloudflare R2 | S3-compatible, generous free tier |
| Web Hosting | Cloudflare Pages | Free, unlimited bandwidth |

---

## AI Skills (Claude Code)

Install skills berikut untuk membantu development:

### Cloudflare (Wajib)
```bash
npx skills add cloudflare/skills/wrangler
npx skills add cloudflare/skills/durable-objects
npx skills add cloudflare/skills/agents-sdk
```

### React/Frontend
```bash
npx skills add vercel-labs/agent-skills
npx skills add anthropics/skills/frontend-design
```

### Auth
```bash
npx skills add better-auth/skills
```

### Development Workflow
```bash
npx skills add obra/superpowers
```

### Skill Usage Guide

| Skill | Kapan Digunakan |
|-------|-----------------|
| `wrangler` | Deploy workers, manage R2/KV/D1, local dev |
| `durable-objects` | Jika butuh stateful workers |
| `agents-sdk` | Building AI agents on Cloudflare |
| `vercel-react-best-practices` | React component patterns |
| `web-design-guidelines` | UI/UX design decisions |
| `frontend-design` | Creating polished, production-grade UI |
| `better-auth` | OAuth implementation patterns |
| `brainstorming` | Planning features |
| `test-driven-development` | Writing tests first |
| `systematic-debugging` | Debugging issues |

---

## Features

### Core Features
- [x] OAuth Google login
- [x] Multi-account R2 management (dynamic add/remove)
- [x] Config sync across devices
- [x] File browser (virtual filesystem)
- [x] Upload to selected providers
- [x] Download files
- [x] Delete files

### Advanced Features
- [x] Multi-provider parallel upload
- [x] Progress tracking
- [x] Drag & drop upload
- [x] File preview (PDF, images, video, audio)
- [x] Public file sharing with signed URLs
- [x] Quota alerts

### Platform Features

| Feature | Desktop (Tauri) | Web (Pages) |
|---------|-----------------|-------------|
| Upload files | Native picker | Browser picker |
| Download files | Direct to folder | Browser download |
| Drag & drop | Yes | Yes |
| Folder upload | Full support | Limited |
| Background upload | Native threads | Tab must stay open |
| Offline mode | Local cache | No |
| System tray | Yes | No |
| Access anywhere | Need install | Any browser |

---

## Authentication

### OAuth Flow (Google)

```
┌─────────────────────────────────────────────────────────────────┐
│                        APP STARTUP FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. App Launch
      │
      ▼
2. Check local token cache (encrypted)
      │
      ├── No token ──────────► Show Login Screen
      │                              │
      │                              ▼
      │                        OAuth Google Flow
      │                              │
      │                              ▼
      │                        POST /auth/callback
      │                              │
      │                              ▼
      │                        Receive JWT + Config
      │                              │
      ▼                              │
3. Has token ◄───────────────────────┘
      │
      ▼
4. GET /config (fetch latest)
      │
      ▼
5. Load providers into app
      │
      ▼
6. Ready to use!
```

### JWT Configuration
- **Access Token**: 1 hour (short-lived)
- **Refresh Token**: 14 days (long-lived)

---

## API Specification

### Auth Worker Endpoints

```typescript
// ══════════════════════════════════════
// AUTH (OAuth Google)
// ══════════════════════════════════════

// GET /auth/google
// → Redirect to Google OAuth consent screen

// GET /auth/callback
// → Handle OAuth callback, create session
// Response: { success, token, refreshToken, user }

// POST /auth/refresh
// Body: { refreshToken }
// Response: { token, refreshToken }

// POST /auth/logout
// Header: Authorization: Bearer <token>

// ══════════════════════════════════════
// CONFIG SYNC
// ══════════════════════════════════════

// GET /config
// Header: Authorization: Bearer <token>
// Response: { providers: [], settings: {} }

// PUT /config
// Header: Authorization: Bearer <token>
// Body: { providers?, settings? }
// Response: { success, updatedAt }

// ══════════════════════════════════════
// PROVIDER MANAGEMENT
// ══════════════════════════════════════

// GET /providers
// → List all providers

// POST /providers
// Body: { name, workerUrl, authToken }
// → Add new storage provider

// PUT /providers/:id
// → Update provider config

// DELETE /providers/:id
// → Remove provider

// POST /providers/:id/test
// → Test connection to worker
```

### Storage Worker Endpoints

```typescript
// ══════════════════════════════════════
// AUTH
// ══════════════════════════════════════
// Header: Authorization: Bearer <token>

// ══════════════════════════════════════
// FILE OPERATIONS
// ══════════════════════════════════════

// GET /api/files?prefix=/research/
// → List files in directory
// Response: { files: [{ key, size, lastModified }] }

// POST /api/upload
// Body: multipart/form-data { file, path }
// Response: { success, key, size, etag }

// GET /api/download?key=/research/paper.pdf
// → Download file
// Response: File stream

// DELETE /api/files?key=/research/old.pdf
// → Delete file
// Response: { success }

// GET /api/stats
// → Get storage stats
// Response: { used, limit, fileCount }

// ══════════════════════════════════════
// FILE SHARING
// ══════════════════════════════════════

// POST /api/share
// Body: { key, expiresIn, downloadLimit, password? }
// Response: { shareUrl, shareId }

// GET /s/:shareId
// → Public download endpoint
```

---

## Data Structures

### User Config (stored in Auth Worker R2)

```typescript
interface UserConfig {
  userId: string;
  email: string;
  name: string;
  picture: string;  // Google profile picture

  // Provider configurations
  providers: ProviderConfig[];

  // App preferences
  settings: {
    defaultUploadTargets: string[];  // provider IDs
    theme: 'light' | 'dark' | 'system';
    quotaAlertThreshold: number;     // percentage (e.g., 80)
  };

  createdAt: number;
  updatedAt: number;
}

interface ProviderConfig {
  id: string;           // uuid
  name: string;         // "Akun Cloudflare 1"
  type: 'r2_worker';    // | 'gdrive' | etc (future)
  workerUrl: string;    // https://storage1.yourname.workers.dev
  authToken: string;    // bearer token for this worker
  isActive: boolean;
  addedAt: number;
}
```

### File Entry

```typescript
interface FileEntry {
  key: string;          // full path: /research/paper.pdf
  name: string;         // paper.pdf
  size: number;         // bytes
  lastModified: number; // timestamp
  isDirectory: boolean;
  providerId: string;   // which provider this file is on
}
```

### Upload Task

```typescript
interface UploadTask {
  id: string;
  localPath: string;
  remotePath: string;
  targetProviders: string[];  // ["r2-acc1", "r2-acc2"]
  status: 'pending' | 'uploading' | 'complete' | 'failed';
  progress: Record<string, number>;  // per-provider progress (0-100)
  error?: string;
}
```

---

## Folder Structure

```
vaultic/
├── src/                        # SHARED UI CODE (React)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── FileBrowser/
│   │   ├── UploadZone/
│   │   ├── ProviderList/
│   │   ├── ProviderForm/
│   │   ├── FilePreview/
│   │   ├── ShareDialog/
│   │   └── QuotaBar/
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Files.tsx
│   │   ├── Settings.tsx
│   │   └── Share.tsx           # Public share page
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── providerStore.ts
│   │   ├── fileStore.ts
│   │   └── uploadStore.ts
│   ├── api/
│   │   ├── auth.ts             # Auth API client
│   │   ├── storage.ts          # Storage API client
│   │   └── types.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProviders.ts
│   │   ├── useFiles.ts
│   │   └── useUpload.ts
│   ├── utils/
│   │   ├── platform.ts         # isDesktop / isWeb detection
│   │   ├── format.ts           # file size, date formatting
│   │   └── crypto.ts           # local encryption
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── src-tauri/                  # Desktop-only (Rust)
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/           # Tauri IPC commands
│   │   │   ├── mod.rs
│   │   │   ├── auth.rs
│   │   │   ├── upload.rs
│   │   │   ├── download.rs
│   │   │   └── providers.rs
│   │   ├── native/             # Native features
│   │   │   ├── mod.rs
│   │   │   ├── tray.rs
│   │   │   └── notifications.rs
│   │   └── utils/
│   │       └── crypto.rs       # Local token encryption
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
│
├── workers/                    # Cloudflare Workers
│   ├── auth/                   # Auth + Config Worker
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── oauth.ts        # Google OAuth handling
│   │   │   ├── jwt.ts          # JWT generation/validation
│   │   │   ├── config.ts       # User config CRUD
│   │   │   └── providers.ts    # Provider management
│   │   ├── wrangler.toml
│   │   └── package.json
│   │
│   └── storage/                # Storage Worker Template
│       ├── src/
│       │   ├── index.ts
│       │   ├── files.ts        # File operations
│       │   ├── upload.ts       # Upload handling
│       │   ├── download.ts     # Download + streaming
│       │   ├── share.ts        # Public share links
│       │   └── auth.ts         # Token validation
│       ├── wrangler.toml
│       └── package.json
│
├── public/
│   └── favicon.ico
│
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## Security

```
┌─────────────────────────────────────────┐
│           SECURITY LAYERS               │
├─────────────────────────────────────────┤
│                                         │
│  1. OAUTH (Google)                      │
│     - Secure authentication             │
│     - No password storage               │
│                                         │
│  2. JWT TOKENS                          │
│     - Access: 1 hour expiry             │
│     - Refresh: 14 days expiry           │
│     - Stored encrypted locally          │
│                                         │
│  3. PROVIDER TOKENS                     │
│     - Trust Cloudflare security         │
│     - Each storage worker has own token │
│     - Validate per-request              │
│                                         │
│  4. LOCAL CACHE (Desktop)               │
│     - Encrypted with device key         │
│     - Auto-clear on logout              │
│                                         │
│  5. SHARE LINKS                         │
│     - Signed URLs with expiry           │
│     - Optional password protection      │
│     - Download limit support            │
│                                         │
└─────────────────────────────────────────┘
```

---

## Development Phases & Tasks

### Phase 1: Project Setup

| Task | Priority | Status |
|------|----------|--------|
| Initialize Tauri + Vite + React project | HIGH | [x] |
| Setup Tailwind CSS | HIGH | [x] |
| Install and configure shadcn/ui | HIGH | [x] |
| Setup Zustand stores (auth, providers, files) | HIGH | [x] |
| Create basic layout components | HIGH | [x] |
| Setup TypeScript types | HIGH | [x] |

### Phase 2: Auth Worker

| Task | Priority | Status |
|------|----------|--------|
| Create Auth Worker project (wrangler init) | HIGH | [x] |
| Setup R2 bucket for config storage | HIGH | [x] |
| Implement Google OAuth flow | HIGH | [x] |
| Implement JWT generation/validation | HIGH | [x] |
| Implement /config endpoints (GET/PUT) | HIGH | [x] |
| Implement /providers endpoints (CRUD) | HIGH | [x] |
| Deploy Auth Worker | HIGH | [ ] |

### Phase 3: Storage Worker Template

| Task | Priority | Status |
|------|----------|--------|
| Create Storage Worker project | HIGH | [x] |
| Implement token validation middleware | HIGH | [x] |
| Implement file list endpoint | HIGH | [x] |
| Implement file upload (multipart) | HIGH | [x] |
| Implement file download (streaming) | HIGH | [x] |
| Implement file delete | HIGH | [x] |
| Implement storage stats endpoint | HIGH | [x] |
| Deploy Storage Worker | HIGH | [ ] |

### Phase 4: Frontend - Auth

| Task | Priority | Status |
|------|----------|--------|
| Create Login page with Google OAuth button | HIGH | [x] |
| Implement OAuth callback handling | HIGH | [x] |
| Create auth store (Zustand) | HIGH | [x] |
| Implement token refresh logic | HIGH | [x] |
| Create protected route wrapper | HIGH | [x] |
| Handle logout | HIGH | [x] |

### Phase 5: Frontend - Provider Management

| Task | Priority | Status |
|------|----------|--------|
| Create provider store (Zustand) | HIGH | [x] |
| Create Settings page | HIGH | [x] |
| Create ProviderList component | HIGH | [x] |
| Create ProviderForm (add/edit) | HIGH | [x] |
| Implement provider test connection | HIGH | [x] |
| Implement provider delete | HIGH | [x] |

### Phase 6: Frontend - File Browser

| Task | Priority | Status |
|------|----------|--------|
| Create file store (Zustand) | HIGH | [x] |
| Create FileBrowser component | HIGH | [x] |
| Implement directory navigation | HIGH | [x] |
| Create file/folder icons | MEDIUM | [x] |
| Implement file context menu | MEDIUM | [ ] |
| Create breadcrumb navigation | MEDIUM | [x] |

### Phase 7: Frontend - Upload

| Task | Priority | Status |
|------|----------|--------|
| Create upload store (Zustand) | HIGH | [ ] |
| Create UploadZone (drag & drop) | HIGH | [ ] |
| Implement single file upload | HIGH | [ ] |
| Implement multi-provider upload | HIGH | [ ] |
| Create upload progress UI | HIGH | [ ] |
| Implement upload queue | MEDIUM | [ ] |

### Phase 8: Frontend - Download & Delete

| Task | Priority | Status |
|------|----------|--------|
| Implement file download | HIGH | [ ] |
| Implement file delete with confirmation | HIGH | [ ] |
| Handle download in desktop (native) | HIGH | [ ] |
| Handle download in web (browser) | HIGH | [ ] |

### Phase 9: File Preview

| Task | Priority | Status |
|------|----------|--------|
| Create FilePreview component | MEDIUM | [ ] |
| Implement image preview | MEDIUM | [ ] |
| Implement PDF preview | MEDIUM | [ ] |
| Implement video preview | MEDIUM | [ ] |
| Implement audio preview | MEDIUM | [ ] |

### Phase 10: File Sharing

| Task | Priority | Status |
|------|----------|--------|
| Add share endpoints to Storage Worker | MEDIUM | [ ] |
| Create ShareDialog component | MEDIUM | [ ] |
| Create public share page (/s/:id) | MEDIUM | [ ] |
| Implement expiry settings | MEDIUM | [ ] |
| Implement download limit | LOW | [ ] |
| Implement password protection | LOW | [ ] |

### Phase 11: Quota & Alerts

| Task | Priority | Status |
|------|----------|--------|
| Create QuotaBar component | MEDIUM | [ ] |
| Implement quota fetch per provider | MEDIUM | [ ] |
| Implement quota alert threshold | MEDIUM | [ ] |
| Show notifications when quota low | MEDIUM | [ ] |

### Phase 12: Desktop-Specific Features

| Task | Priority | Status |
|------|----------|--------|
| Implement system tray | LOW | [ ] |
| Implement native file dialog | HIGH | [ ] |
| Implement native notifications | MEDIUM | [ ] |
| Implement local token encryption | HIGH | [ ] |
| Implement offline detection | LOW | [ ] |

### Phase 13: Web Deployment

| Task | Priority | Status |
|------|----------|--------|
| Configure Cloudflare Pages | MEDIUM | [ ] |
| Setup build pipeline | MEDIUM | [ ] |
| Test web-specific features | MEDIUM | [ ] |
| Deploy to Pages | MEDIUM | [ ] |

### Phase 14: Polish & Testing

| Task | Priority | Status |
|------|----------|--------|
| Add loading states | MEDIUM | [ ] |
| Add error handling UI | MEDIUM | [ ] |
| Responsive design tweaks | MEDIUM | [ ] |
| Dark mode support | LOW | [ ] |
| Manual testing | HIGH | [ ] |
| Bug fixes | HIGH | [ ] |

---

## Environment Variables

### Auth Worker (wrangler.toml)

```toml
name = "vaultic-auth"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
GOOGLE_CLIENT_ID = ""
JWT_SECRET = ""
FRONTEND_URL = "https://vaultic.pages.dev"

[[r2_buckets]]
binding = "CONFIG_BUCKET"
bucket_name = "vaultic-config"
```

### Storage Worker (wrangler.toml)

```toml
name = "vaultic-storage"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
AUTH_TOKEN = ""  # Token for this worker

[[r2_buckets]]
binding = "STORAGE_BUCKET"
bucket_name = "vaultic-storage"
```

### Frontend (.env)

```env
VITE_AUTH_WORKER_URL=https://vaultic-auth.username.workers.dev
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- Rust (for Tauri)
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with R2 enabled

### 1. Clone & Install

```bash
cd vaultic
pnpm install
```

### 2. Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Go to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID
5. Add authorized redirect URI: `https://vaultic-auth.username.workers.dev/auth/callback`
6. Copy Client ID and Client Secret

### 3. Deploy Auth Worker

```bash
cd workers/auth
wrangler login
wrangler r2 bucket create vaultic-config
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler deploy
```

### 4. Deploy Storage Worker

```bash
cd workers/storage
wrangler r2 bucket create vaultic-storage
wrangler secret put AUTH_TOKEN
wrangler deploy
```

### 5. Run Desktop App

```bash
pnpm tauri dev
```

### 6. Deploy Web App

```bash
pnpm build
wrangler pages deploy dist
```

---

## Commands Reference

```bash
# Development
pnpm dev              # Web development server
pnpm tauri dev        # Desktop development

# Build
pnpm build            # Build web app
pnpm tauri build      # Build desktop app

# Deploy
pnpm deploy:web       # Deploy to Cloudflare Pages
pnpm deploy:auth      # Deploy Auth Worker
pnpm deploy:storage   # Deploy Storage Worker
```

---

## Notes

- Desktop app prioritas pertama, web menyusul
- Semua UI code di `src/` shared antara desktop dan web
- Platform-specific code pakai conditional: `if ('__TAURI__' in window)`
- Provider tokens trust Cloudflare security (tidak di-encrypt di R2)
- Local token cache di desktop di-encrypt
