# Storage Worker Setup Guide

Panduan lengkap untuk deploy **Storage Worker** ke Cloudflare. Worker ini bisa di-deploy ke **banyak akun Cloudflare** untuk redundancy.

---

## Prerequisites

1. **Akun Cloudflare** dengan R2 enabled (free tier cukup)
2. **Node.js** 18+
3. **Wrangler CLI** (sudah ada di `node_modules`)

---

## Quick Setup (5 Menit)

### Step 1: Masuk ke Folder Storage Worker

```bash
cd workers/storage
```

### Step 2: Login ke Cloudflare

```bash
npx wrangler login
```

Browser akan terbuka, login dengan akun Cloudflare Anda.

### Step 3: Buat R2 Bucket

```bash
npx wrangler r2 bucket create vaultic-storage
```

Output:
```
✅ Created bucket 'vaultic-storage'
```

**Catatan:** Jika bucket sudah ada (error 10004), skip step ini.

### Step 4: Generate Auth Token

Jalankan command ini untuk generate random token:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Contoh output:
```
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

**📝 PENTING: Copy dan simpan token ini!** Anda akan memasukkan token ini di:
1. Cloudflare Worker (secret)
2. Aplikasi Vaultic (saat add provider)

### Step 5: Set Auth Token sebagai Secret

```bash
npx wrangler secret put AUTH_TOKEN
```

Ketika diminta, **paste token yang sudah di-generate** di Step 4.

```
√ Enter a secret value: ... a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
✨ Success! Uploaded secret AUTH_TOKEN
```

### Step 6: Deploy Worker

```bash
npx wrangler deploy
```

Output:
```
Total Upload: 8.23 KiB / gzip: 2.14 KiB
Uploaded vaultic-storage (5.32 sec)
Deployed vaultic-storage triggers (12.45 sec)
  https://vaultic-storage.YOUR-SUBDOMAIN.workers.dev
```

**📝 CATAT URL Worker ini!** Format: `https://vaultic-storage.YOUR-SUBDOMAIN.workers.dev`

### Step 7: Test Worker (Opsional)

Test apakah worker sudah berjalan:

```bash
curl https://vaultic-storage.YOUR-SUBDOMAIN.workers.dev/api/stats \
  -H "Authorization: Bearer YOUR-AUTH-TOKEN"
```

Response sukses:
```json
{
  "used": 0,
  "limit": 10737418240,
  "fileCount": 0
}
```

---

## ✅ Setup Complete!

Anda sekarang punya:

| Item | Value |
|------|-------|
| **Worker URL** | `https://vaultic-storage.YOUR-SUBDOMAIN.workers.dev` |
| **Auth Token** | Token random yang sudah di-generate |
| **R2 Bucket** | `vaultic-storage` |

---

## Menambahkan ke Aplikasi Vaultic

1. Buka aplikasi Vaultic: `http://localhost:5173`
2. Login ke akun Anda
3. Buka **Settings**
4. Klik **Add Provider**
5. Isi form:
   - **Name**: "Cloudflare Account 1" (atau nama bebas)
   - **Worker URL**: `https://vaultic-storage.YOUR-SUBDOMAIN.workers.dev`
   - **Auth Token**: Token yang di-generate di Step 4
6. Klik **Test Connection** untuk verify
7. Save

---

## Deploy ke Akun Cloudflare Lain (Redundancy)

Untuk menambah storage provider di akun Cloudflare yang berbeda:

### Cara 1: Pakai Folder yang Sama

```bash
# 1. Logout dari akun sebelumnya
npx wrangler logout

# 2. Login ke akun Cloudflare yang lain
npx wrangler login

# 3. Buat bucket baru (nama bisa sama atau beda)
npx wrangler r2 bucket create vaultic-storage-2

# 4. Update wrangler.toml - ganti nama worker dan bucket
```

Edit `workers/storage/wrangler.toml`:
```toml
name = "vaultic-storage-2"  # Ganti nama worker

[[r2_buckets]]
bucket_name = "vaultic-storage-2"  # Ganti nama bucket
```

```bash
# 5. Generate token BARU (jangan pakai yang sama!)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 6. Set secret
npx wrangler secret put AUTH_TOKEN

# 7. Deploy
npx wrangler deploy
```

### Cara 2: Copy Folder (Lebih Rapi)

```bash
# 1. Copy folder storage
cp -r workers/storage workers/storage-account2

# 2. Masuk ke folder baru
cd workers/storage-account2

# 3. Edit wrangler.toml
```

Edit `wrangler.toml`:
```toml
name = "my-storage-2"

[[r2_buckets]]
bucket_name = "my-storage-bucket-2"
```

```bash
# 4. Login ke akun Cloudflare lain
npx wrangler login

# 5. Buat bucket
npx wrangler r2 bucket create my-storage-bucket-2

# 6. Generate dan set token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put AUTH_TOKEN

# 7. Deploy
npx wrangler deploy
```

---

## API Endpoints

Storage Worker menyediakan endpoints berikut:

| Endpoint | Method | Deskripsi |
|----------|--------|-----------|
| `/api/files?prefix=/path` | GET | List files di folder |
| `/api/upload` | POST | Upload file (multipart/form-data) |
| `/api/download?key=/path/file.txt` | GET | Download file |
| `/api/files?key=/path/file.txt` | DELETE | Hapus file |
| `/api/stats` | GET | Storage usage stats |
| `/api/share` | POST | Create public share link |
| `/s/:shareId` | GET | Public file download |

**Semua endpoint** (kecuali `/s/:shareId`) membutuhkan header:
```
Authorization: Bearer YOUR-AUTH-TOKEN
```

---

## Troubleshooting

### Error: "Unauthorized" (401)

**Penyebab:** Token salah atau belum di-set.

**Solusi:**
```bash
npx wrangler secret put AUTH_TOKEN
```
Pastikan token yang dimasukkan sama dengan yang ada di aplikasi Vaultic.

---

### Error: "Bucket not found"

**Penyebab:** Bucket belum dibuat atau nama salah.

**Solusi:**
```bash
npx wrangler r2 bucket create vaultic-storage
```

Atau cek nama bucket di wrangler.toml harus sama dengan yang dibuat.

---

### Error: "Worker not found" saat deploy

**Penyebab:** Wrangler belum login atau salah akun.

**Solusi:**
```bash
npx wrangler logout
npx wrangler login
```

---

### Error: "CORS blocked" di aplikasi

**Solusi:** Worker sudah include CORS headers. Pastikan:
1. URL worker di aplikasi benar (https://)
2. Token valid

---

## Development Mode

Untuk testing lokal sebelum deploy:

```bash
cd workers/storage
npx wrangler dev
```

Worker akan jalan di `http://localhost:8787`

Test dengan:
```bash
curl http://localhost:8787/api/stats \
  -H "Authorization: Bearer test-token"
```

**Catatan:** Di dev mode, gunakan token apapun karena secret belum ter-load.

---

## Update Worker

Jika ada perubahan kode:

```bash
cd workers/storage
npx wrangler deploy
```

Tidak perlu set secret lagi, secret tersimpan di Cloudflare.

---

## Keamanan

1. **AUTH_TOKEN harus UNIK** per worker
2. **Jangan share token** ke orang lain
3. **Jangan commit token** ke git
4. Token disimpan sebagai **Cloudflare Secret** (encrypted)
5. Jika token bocor, generate baru dan update di app

---

## Biaya

**Cloudflare R2 Free Tier:**
- **Storage**: 10 GB gratis
- **Class A Operations**: 1 juta/bulan (upload, list)
- **Class B Operations**: 10 juta/bulan (download)

**Workers Free Tier:**
- **Requests**: 100,000/hari
- **CPU Time**: 10ms per request

Untuk personal use, **free tier lebih dari cukup**.

---

## Summary Checklist

Setelah setup berhasil, Anda harus punya:

- [x] Worker deployed di Cloudflare
- [x] R2 bucket created
- [x] AUTH_TOKEN set sebagai secret
- [x] Worker URL tercatat
- [x] Token tercatat (untuk add provider di app)

---

## Butuh Bantuan?

Jika ada masalah:
1. Cek logs: `npx wrangler tail`
2. Baca troubleshooting di atas
3. Open issue di repository
