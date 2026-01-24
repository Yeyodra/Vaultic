interface Env {
  CONFIG_BUCKET: R2Bucket;
  USERS_KV: KVNamespace;
  JWT_SECRET: string;
  FRONTEND_URL: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
}

interface UserConfig {
  userId: string;
  email: string;
  name: string;
  providers: ProviderConfig[];
  settings: {
    defaultUploadTargets: string[];
    theme: 'light' | 'dark' | 'system';
    quotaAlertThreshold: number;
  };
  createdAt: number;
  updatedAt: number;
}

interface ProviderConfig {
  id: string;
  name: string;
  type: 'r2_worker';
  workerUrl: string;
  authToken: string;
  isActive: boolean;
  addedAt: number;
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

// Password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

async function createJWT(payload: object, secret: string, expiresIn: number): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresIn };

  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const headerB64 = encode(header);
  const payloadB64 = encode(fullPayload);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

async function verifyJWT(token: string, secret: string): Promise<{ userId: string; email: string } | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );

    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

async function getAuthUser(request: Request, env: Env): Promise<{ userId: string; email: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyJWT(token, env.JWT_SECRET);
}

async function getUserConfig(env: Env, userId: string): Promise<UserConfig | null> {
  const obj = await env.CONFIG_BUCKET.get(`users/${userId}.json`);
  if (!obj) return null;
  return obj.json();
}

async function saveUserConfig(env: Env, config: UserConfig): Promise<void> {
  await env.CONFIG_BUCKET.put(`users/${config.userId}.json`, JSON.stringify(config));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ========================================
    // AUTH: Register
    // ========================================
    if (path === '/auth/register' && request.method === 'POST') {
      try {
        const body = await request.json() as { email?: string; password?: string; name?: string };
        
        if (!body.email || !body.password) {
          return errorResponse('Email and password required', 400);
        }

        if (body.password.length < 6) {
          return errorResponse('Password must be at least 6 characters', 400);
        }

        // Check if user exists
        const existingUser = await env.USERS_KV.get(`user:${body.email}`);
        if (existingUser) {
          return errorResponse('Email already registered', 409);
        }

        // Create user
        const userId = crypto.randomUUID();
        const passwordHash = await hashPassword(body.password);
        
        const user: User = {
          id: userId,
          email: body.email,
          name: body.name || body.email.split('@')[0],
          passwordHash,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Save user to KV
        await env.USERS_KV.put(`user:${body.email}`, JSON.stringify(user));
        await env.USERS_KV.put(`userId:${userId}`, body.email);

        // Create user config in R2
        const config: UserConfig = {
          userId,
          email: body.email,
          name: user.name,
          providers: [],
          settings: {
            defaultUploadTargets: [],
            theme: 'system',
            quotaAlertThreshold: 80,
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await saveUserConfig(env, config);

        // Generate tokens
        const accessToken = await createJWT(
          { userId, email: body.email },
          env.JWT_SECRET,
          3600 // 1 hour
        );
        const refreshToken = await createJWT(
          { userId, email: body.email, type: 'refresh' },
          env.JWT_SECRET,
          14 * 24 * 3600 // 14 days
        );

        return jsonResponse({
          success: true,
          token: accessToken,
          refreshToken,
          user: {
            userId,
            email: body.email,
            name: user.name,
          },
        });
      } catch {
        return errorResponse('Invalid request', 400);
      }
    }

    // ========================================
    // AUTH: Login
    // ========================================
    if (path === '/auth/login' && request.method === 'POST') {
      try {
        const body = await request.json() as { email?: string; password?: string };
        
        if (!body.email || !body.password) {
          return errorResponse('Email and password required', 400);
        }

        // Get user from KV
        const userData = await env.USERS_KV.get(`user:${body.email}`);
        if (!userData) {
          return errorResponse('Invalid email or password', 401);
        }

        const user: User = JSON.parse(userData);

        // Verify password
        const validPassword = await verifyPassword(body.password, user.passwordHash);
        if (!validPassword) {
          return errorResponse('Invalid email or password', 401);
        }

        // Generate tokens
        const accessToken = await createJWT(
          { userId: user.id, email: user.email },
          env.JWT_SECRET,
          3600 // 1 hour
        );
        const refreshToken = await createJWT(
          { userId: user.id, email: user.email, type: 'refresh' },
          env.JWT_SECRET,
          14 * 24 * 3600 // 14 days
        );

        return jsonResponse({
          success: true,
          token: accessToken,
          refreshToken,
          user: {
            userId: user.id,
            email: user.email,
            name: user.name,
          },
        });
      } catch {
        return errorResponse('Invalid request', 400);
      }
    }

    // ========================================
    // AUTH: Refresh Token
    // ========================================
    if (path === '/auth/refresh' && request.method === 'POST') {
      try {
        const body = await request.json() as { refreshToken?: string };
        if (!body.refreshToken) {
          return errorResponse('Refresh token required', 400);
        }

        const payload = await verifyJWT(body.refreshToken, env.JWT_SECRET);
        if (!payload) {
          return errorResponse('Invalid refresh token', 401);
        }

        const accessToken = await createJWT(
          { userId: payload.userId, email: payload.email },
          env.JWT_SECRET,
          3600
        );
        const refreshToken = await createJWT(
          { userId: payload.userId, email: payload.email, type: 'refresh' },
          env.JWT_SECRET,
          14 * 24 * 3600
        );

        return jsonResponse({ token: accessToken, refreshToken });
      } catch {
        return errorResponse('Invalid request', 400);
      }
    }

    // ========================================
    // AUTH: Logout
    // ========================================
    if (path === '/auth/logout' && request.method === 'POST') {
      return jsonResponse({ success: true });
    }

    // ========================================
    // AUTH: Get current user
    // ========================================
    if (path === '/auth/me' && request.method === 'GET') {
      const user = await getAuthUser(request, env);
      if (!user) {
        return errorResponse('Unauthorized', 401);
      }

      const config = await getUserConfig(env, user.userId);
      if (!config) {
        return errorResponse('User not found', 404);
      }

      return jsonResponse({
        userId: config.userId,
        email: config.email,
        name: config.name,
      });
    }

    // ========================================
    // CONFIG: Get config
    // ========================================
    if (path === '/config' && request.method === 'GET') {
      const user = await getAuthUser(request, env);
      if (!user) {
        return errorResponse('Unauthorized', 401);
      }

      const config = await getUserConfig(env, user.userId);
      if (!config) {
        return errorResponse('Config not found', 404);
      }

      return jsonResponse({
        userId: config.userId,
        email: config.email,
        name: config.name,
        providers: config.providers,
        settings: config.settings,
      });
    }

    // ========================================
    // CONFIG: Update config
    // ========================================
    if (path === '/config' && request.method === 'PUT') {
      const user = await getAuthUser(request, env);
      if (!user) {
        return errorResponse('Unauthorized', 401);
      }

      const config = await getUserConfig(env, user.userId);
      if (!config) {
        return errorResponse('Config not found', 404);
      }

      try {
        const body = await request.json() as Partial<Pick<UserConfig, 'providers' | 'settings' | 'name'>>;
        if (body.providers) config.providers = body.providers;
        if (body.settings) config.settings = { ...config.settings, ...body.settings };
        if (body.name) config.name = body.name;
        config.updatedAt = Date.now();
        await saveUserConfig(env, config);

        return jsonResponse({ success: true, updatedAt: config.updatedAt });
      } catch {
        return errorResponse('Invalid request body', 400);
      }
    }

    // ========================================
    // PROVIDERS: List
    // ========================================
    if (path === '/providers' && request.method === 'GET') {
      const user = await getAuthUser(request, env);
      if (!user) {
        return errorResponse('Unauthorized', 401);
      }

      const config = await getUserConfig(env, user.userId);
      if (!config) {
        return errorResponse('Config not found', 404);
      }

      return jsonResponse({ providers: config.providers });
    }

    // ========================================
    // PROVIDERS: Add
    // ========================================
    if (path === '/providers' && request.method === 'POST') {
      const user = await getAuthUser(request, env);
      if (!user) {
        return errorResponse('Unauthorized', 401);
      }

      const config = await getUserConfig(env, user.userId);
      if (!config) {
        return errorResponse('Config not found', 404);
      }

      try {
        const body = await request.json() as { name: string; workerUrl: string; authToken: string };
        const provider: ProviderConfig = {
          id: crypto.randomUUID(),
          name: body.name,
          type: 'r2_worker',
          workerUrl: body.workerUrl,
          authToken: body.authToken,
          isActive: true,
          addedAt: Date.now(),
        };

        config.providers.push(provider);
        config.updatedAt = Date.now();
        await saveUserConfig(env, config);

        return jsonResponse({ success: true, provider });
      } catch {
        return errorResponse('Invalid request body', 400);
      }
    }

    // ========================================
    // PROVIDERS: Update
    // ========================================
    const providerMatch = path.match(/^\/providers\/([^/]+)$/);
    if (providerMatch && request.method === 'PUT') {
      const user = await getAuthUser(request, env);
      if (!user) {
        return errorResponse('Unauthorized', 401);
      }

      const config = await getUserConfig(env, user.userId);
      if (!config) {
        return errorResponse('Config not found', 404);
      }

      const providerId = providerMatch[1];
      const providerIndex = config.providers.findIndex((p) => p.id === providerId);
      if (providerIndex === -1) {
        return errorResponse('Provider not found', 404);
      }

      try {
        const body = await request.json() as Partial<ProviderConfig>;
        config.providers[providerIndex] = { ...config.providers[providerIndex], ...body };
        config.updatedAt = Date.now();
        await saveUserConfig(env, config);

        return jsonResponse({ success: true, provider: config.providers[providerIndex] });
      } catch {
        return errorResponse('Invalid request body', 400);
      }
    }

    // ========================================
    // PROVIDERS: Delete
    // ========================================
    if (providerMatch && request.method === 'DELETE') {
      const user = await getAuthUser(request, env);
      if (!user) {
        return errorResponse('Unauthorized', 401);
      }

      const config = await getUserConfig(env, user.userId);
      if (!config) {
        return errorResponse('Config not found', 404);
      }

      const providerId = providerMatch[1];
      const providerIndex = config.providers.findIndex((p) => p.id === providerId);
      if (providerIndex === -1) {
        return errorResponse('Provider not found', 404);
      }

      config.providers.splice(providerIndex, 1);
      config.updatedAt = Date.now();
      await saveUserConfig(env, config);

      return jsonResponse({ success: true });
    }

    // ========================================
    // PROVIDERS: Test connection
    // ========================================
    const testMatch = path.match(/^\/providers\/([^/]+)\/test$/);
    if (testMatch && request.method === 'POST') {
      const user = await getAuthUser(request, env);
      if (!user) {
        return errorResponse('Unauthorized', 401);
      }

      const config = await getUserConfig(env, user.userId);
      if (!config) {
        return errorResponse('Config not found', 404);
      }

      const providerId = testMatch[1];
      const provider = config.providers.find((p) => p.id === providerId);
      if (!provider) {
        return errorResponse('Provider not found', 404);
      }

      try {
        const testResponse = await fetch(`${provider.workerUrl}/api/stats`, {
          headers: { Authorization: `Bearer ${provider.authToken}` },
        });

        if (testResponse.ok) {
          return jsonResponse({ success: true, message: 'Connection successful' });
        } else {
          return jsonResponse({ success: false, message: 'Connection failed' }, 400);
        }
      } catch {
        return jsonResponse({ success: false, message: 'Connection failed' }, 400);
      }
    }

    return errorResponse('Not found', 404);
  },
};
