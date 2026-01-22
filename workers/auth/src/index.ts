interface Env {
  CONFIG_BUCKET: R2Bucket;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface UserConfig {
  userId: string;
  email: string;
  name: string;
  picture: string;
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

    // OAuth: Start Google login
    if (path === '/auth/google' && request.method === 'GET') {
      const redirectUri = `${url.origin}/auth/callback`;
      const scope = 'openid email profile';
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scope);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');

      return Response.redirect(authUrl.toString(), 302);
    }

    // OAuth: Handle callback
    if (path === '/auth/callback' && request.method === 'GET') {
      const code = url.searchParams.get('code');
      if (!code) {
        return Response.redirect(`${env.FRONTEND_URL}/login?error=no_code`, 302);
      }

      try {
        const redirectUri = `${url.origin}/auth/callback`;
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenResponse.ok) {
          return Response.redirect(`${env.FRONTEND_URL}/login?error=token_exchange`, 302);
        }

        const tokens: GoogleTokenResponse = await tokenResponse.json();

        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!userInfoResponse.ok) {
          return Response.redirect(`${env.FRONTEND_URL}/login?error=user_info`, 302);
        }

        const userInfo: GoogleUserInfo = await userInfoResponse.json();

        let config = await getUserConfig(env, userInfo.id);
        if (!config) {
          config = {
            userId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
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
        } else {
          config.name = userInfo.name;
          config.picture = userInfo.picture;
          config.updatedAt = Date.now();
          await saveUserConfig(env, config);
        }

        const accessToken = await createJWT(
          { userId: userInfo.id, email: userInfo.email },
          env.JWT_SECRET,
          3600
        );
        const refreshToken = await createJWT(
          { userId: userInfo.id, email: userInfo.email, type: 'refresh' },
          env.JWT_SECRET,
          14 * 24 * 3600
        );

        const callbackUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
        callbackUrl.searchParams.set('token', accessToken);
        callbackUrl.searchParams.set('refreshToken', refreshToken);

        return Response.redirect(callbackUrl.toString(), 302);
      } catch (error) {
        console.error('OAuth error:', error);
        return Response.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`, 302);
      }
    }

    // Refresh token
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

    // Logout
    if (path === '/auth/logout' && request.method === 'POST') {
      return jsonResponse({ success: true });
    }

    // Get config
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
        providers: config.providers,
        settings: config.settings,
      });
    }

    // Update config
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
        const body = await request.json() as Partial<Pick<UserConfig, 'providers' | 'settings'>>;
        if (body.providers) config.providers = body.providers;
        if (body.settings) config.settings = { ...config.settings, ...body.settings };
        config.updatedAt = Date.now();
        await saveUserConfig(env, config);

        return jsonResponse({ success: true, updatedAt: config.updatedAt });
      } catch {
        return errorResponse('Invalid request body', 400);
      }
    }

    // List providers
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

    // Add provider
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

    // Update provider
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

    // Delete provider
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

    // Test provider connection
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
