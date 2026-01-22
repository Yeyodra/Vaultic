interface Env {
  STORAGE_BUCKET: R2Bucket;
  AUTH_TOKEN: string;
}

interface FileEntry {
  key: string;
  name: string;
  size: number;
  lastModified: number;
  isDirectory: boolean;
}

interface ShareData {
  key: string;
  expiresAt: number;
  downloadLimit?: number;
  downloads: number;
  password?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

function validateAuth(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  return token === env.AUTH_TOKEN;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Public share endpoint
    if (path.startsWith('/s/')) {
      const shareId = path.slice(3);
      const shareData = await env.STORAGE_BUCKET.get(`_shares/${shareId}.json`);
      if (!shareData) {
        return errorResponse('Share not found', 404);
      }

      const share: ShareData = await shareData.json();

      if (share.expiresAt && share.expiresAt < Date.now()) {
        await env.STORAGE_BUCKET.delete(`_shares/${shareId}.json`);
        return errorResponse('Share expired', 410);
      }

      if (share.downloadLimit && share.downloads >= share.downloadLimit) {
        return errorResponse('Download limit reached', 410);
      }

      const password = url.searchParams.get('password');
      if (share.password && share.password !== password) {
        return errorResponse('Password required', 401);
      }

      const file = await env.STORAGE_BUCKET.get(share.key);
      if (!file) {
        return errorResponse('File not found', 404);
      }

      share.downloads++;
      await env.STORAGE_BUCKET.put(`_shares/${shareId}.json`, JSON.stringify(share));

      const filename = share.key.split('/').pop() || 'download';
      return new Response(file.body, {
        headers: {
          'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': file.size.toString(),
          ...corsHeaders,
        },
      });
    }

    // All other endpoints require auth
    if (!validateAuth(request, env)) {
      return errorResponse('Unauthorized', 401);
    }

    // List files
    if (path === '/api/files' && request.method === 'GET') {
      const prefix = url.searchParams.get('prefix') || '';
      const normalizedPrefix = prefix.startsWith('/') ? prefix.slice(1) : prefix;

      const listed = await env.STORAGE_BUCKET.list({
        prefix: normalizedPrefix,
        delimiter: '/',
      });

      const files: FileEntry[] = [];

      for (const obj of listed.objects) {
        if (obj.key.startsWith('_shares/')) continue;
        
        const name = obj.key.split('/').pop() || obj.key;
        files.push({
          key: '/' + obj.key,
          name,
          size: obj.size,
          lastModified: obj.uploaded.getTime(),
          isDirectory: false,
        });
      }

      for (const prefix of listed.delimitedPrefixes || []) {
        if (prefix.startsWith('_shares/')) continue;
        
        const name = prefix.replace(/\/$/, '').split('/').pop() || prefix;
        files.push({
          key: '/' + prefix,
          name,
          size: 0,
          lastModified: Date.now(),
          isDirectory: true,
        });
      }

      return jsonResponse({ files });
    }

    // Upload file
    if (path === '/api/upload' && request.method === 'POST') {
      const contentType = request.headers.get('Content-Type') || '';

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const uploadPath = formData.get('path') as string | null;

        if (!file) {
          return errorResponse('No file provided', 400);
        }

        const key = uploadPath
          ? `${uploadPath.replace(/^\//, '')}/${file.name}`
          : file.name;

        const result = await env.STORAGE_BUCKET.put(key, file.stream(), {
          httpMetadata: {
            contentType: file.type,
          },
        });

        return jsonResponse({
          success: true,
          key: '/' + key,
          size: file.size,
          etag: result.etag,
        });
      }

      return errorResponse('Unsupported content type', 400);
    }

    // Download file
    if (path === '/api/download' && request.method === 'GET') {
      const key = url.searchParams.get('key');
      if (!key) {
        return errorResponse('Key required', 400);
      }

      const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
      const file = await env.STORAGE_BUCKET.get(normalizedKey);

      if (!file) {
        return errorResponse('File not found', 404);
      }

      const filename = normalizedKey.split('/').pop() || 'download';
      return new Response(file.body, {
        headers: {
          'Content-Type': file.httpMetadata?.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': file.size.toString(),
          ...corsHeaders,
        },
      });
    }

    // Delete file
    if (path === '/api/files' && request.method === 'DELETE') {
      const key = url.searchParams.get('key');
      if (!key) {
        return errorResponse('Key required', 400);
      }

      const normalizedKey = key.startsWith('/') ? key.slice(1) : key;
      await env.STORAGE_BUCKET.delete(normalizedKey);

      return jsonResponse({ success: true });
    }

    // Get storage stats
    if (path === '/api/stats' && request.method === 'GET') {
      const listed = await env.STORAGE_BUCKET.list();
      let totalSize = 0;
      let fileCount = 0;

      for (const obj of listed.objects) {
        if (!obj.key.startsWith('_shares/')) {
          totalSize += obj.size;
          fileCount++;
        }
      }

      return jsonResponse({
        used: totalSize,
        limit: 10 * 1024 * 1024 * 1024, // 10GB default limit
        fileCount,
      });
    }

    // Create share link
    if (path === '/api/share' && request.method === 'POST') {
      try {
        const body = await request.json() as {
          key: string;
          expiresIn?: number;
          downloadLimit?: number;
          password?: string;
        };

        if (!body.key) {
          return errorResponse('Key required', 400);
        }

        const normalizedKey = body.key.startsWith('/') ? body.key.slice(1) : body.key;
        const file = await env.STORAGE_BUCKET.head(normalizedKey);
        if (!file) {
          return errorResponse('File not found', 404);
        }

        const shareId = crypto.randomUUID();
        const shareData: ShareData = {
          key: normalizedKey,
          expiresAt: body.expiresIn ? Date.now() + body.expiresIn * 1000 : Date.now() + 7 * 24 * 3600 * 1000,
          downloadLimit: body.downloadLimit,
          downloads: 0,
          password: body.password,
        };

        await env.STORAGE_BUCKET.put(`_shares/${shareId}.json`, JSON.stringify(shareData));

        return jsonResponse({
          shareUrl: `${url.origin}/s/${shareId}`,
          shareId,
          expiresAt: shareData.expiresAt,
        });
      } catch {
        return errorResponse('Invalid request body', 400);
      }
    }

    return errorResponse('Not found', 404);
  },
};
