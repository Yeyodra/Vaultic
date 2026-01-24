# Vaultic Workers Setup Guide

Panduan lengkap untuk deploy Auth Worker dan Storage Worker ke Cloudflare.

## Prerequisites

1. **Node.js** 18+
2. **Cloudflare Account** dengan R2 enabled
3. **Google Cloud Console** account untuk OAuth
4. **Wrangler CLI**:
   ```bash
   npm install -g wrangler
   ```

---

## 1. Setup Google OAuth

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih yang sudah ada
3. Go to **APIs & Services** > **Credentials**
4. Klik **Create Credentials** > **OAuth 2.0 Client ID**
5. Pilih **Web application**
6. Tambahkan **Authorized redirect URIs**:
   - Development: `http://localhost:8787/auth/callback`
   - Production: `https://vaultic-auth.YOUR-USERNAME.workers.dev/auth/callback`
7. Catat **Client ID** dan **Client Secret**

---

## 2. Deploy Auth Worker

### Step 1: Login ke Cloudflare
```bash
cd workers/auth
wrangler login
```

### Step 2: Buat R2 Bucket
```bash
wrangler r2 bucket create vaultic-config
```

### Step 3: Update wrangler.toml
Edit `workers/auth/wrangler.toml`:
```toml
[vars]
FRONTEND_URL = "http://localhost:5173"  # atau URL production
GOOGLE_CLIENT_ID = "your-google-client-id.apps.googleusercontent.com"
```

### Step 4: Set Secrets
```bash
# Google OAuth Client Secret
wrangler secret put GOOGLE_CLIENT_SECRET
# (paste your client secret)

# JWT Secret (generate random string)
# Generate dengan: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
wrangler secret put JWT_SECRET
# (paste generated secret)
```

### Step 5: Deploy
```bash
wrangler deploy
```

### Step 6: Catat URL Worker
Setelah deploy, catat URL worker:
```
https://vaultic-auth.YOUR-USERNAME.workers.dev
```

---

## 3. Deploy Storage Worker

Storage Worker bisa di-deploy ke **banyak akun Cloudflare** untuk redundancy.

### Step 1: Login ke akun Cloudflare
```bash
cd workers/storage
wrangler login
```

### Step 2: Buat R2 Bucket
```bash
wrangler r2 bucket create vaultic-storage
```

### Step 3: Generate Auth Token
```bash
# Generate random token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
**Catat token ini!** Akan digunakan untuk koneksi dari app.

### Step 4: Set Secret
```bash
wrangler secret put AUTH_TOKEN
# (paste token yang sudah di-generate)
```

### Step 5: Deploy
```bash
wrangler deploy
```

### Step 6: Catat URL Worker
```
https://vaultic-storage.YOUR-USERNAME.workers.dev
```

---

## 4. Deploy ke Multiple Akun (Redundancy)

Untuk setiap akun Cloudflare tambahan:

1. **Login ke akun berbeda**:
   ```bash
   wrangler login
   ```

2. **Copy folder storage** (opsional, bisa pakai folder yang sama):
   ```bash
   cp -r workers/storage workers/storage-account2
   ```

3. **Edit wrangler.toml** - ubah nama worker dan bucket:
   ```toml
   name = "vaultic-storage-2"
   
   [[r2_buckets]]
   bucket_name = "my-storage-bucket-2"
   ```

4. **Create bucket dan deploy**:
   ```bash
   wrangler r2 bucket create my-storage-bucket-2
   wrangler secret put AUTH_TOKEN
   wrangler deploy
   ```

5. **Catat URL dan Token** untuk ditambahkan di app Vaultic

---

## 5. Configure Frontend

Update file `.env` di root project:

```env
VITE_AUTH_WORKER_URL=https://vaultic-auth.YOUR-USERNAME.workers.dev
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 6. Add Storage Providers di App

Setelah login ke Vaultic:

1. Go to **Settings**
2. Klik **Add Provider**
3. Isi:
   - **Name**: Nama untuk provider (e.g., "Cloudflare Account 1")
   - **Worker URL**: `https://vaultic-storage.YOUR-USERNAME.workers.dev`
   - **Auth Token**: Token yang sudah di-generate sebelumnya
4. Klik **Test Connection** untuk verify
5. Save

Ulangi untuk setiap Storage Worker yang sudah di-deploy.

---

## Development Mode

### Auth Worker
```bash
cd workers/auth
pnpm install
pnpm dev
# Running at http://localhost:8787
```

### Storage Worker
```bash
cd workers/storage
pnpm install
pnpm dev
# Running at http://localhost:8788
```

---

## Troubleshooting

### Error: "R2 bucket not found"
```bash
wrangler r2 bucket create <bucket-name>
```

### Error: "Unauthorized" pada Storage Worker
- Pastikan AUTH_TOKEN sudah di-set via `wrangler secret put AUTH_TOKEN`
- Pastikan token di app sama dengan yang di-set di worker

### Error: "OAuth redirect mismatch"
- Pastikan redirect URI di Google Console cocok dengan URL worker
- Format: `https://vaultic-auth.YOUR-USERNAME.workers.dev/auth/callback`

### Error: "CORS blocked"
- Workers sudah include CORS headers
- Pastikan request dari frontend benar

---

## Security Notes

1. **Jangan commit secrets** ke git
2. **AUTH_TOKEN** harus unik per Storage Worker
3. **JWT_SECRET** harus strong (min 32 chars random)
4. **GOOGLE_CLIENT_SECRET** simpan sebagai secret, bukan di wrangler.toml

---

## Quick Reference

| Component | URL Pattern |
|-----------|-------------|
| Auth Worker | `https://vaultic-auth.USERNAME.workers.dev` |
| Storage Worker | `https://vaultic-storage.USERNAME.workers.dev` |
| R2 Console | `https://dash.cloudflare.com/r2` |
| Google Console | `https://console.cloud.google.com/apis/credentials` |
