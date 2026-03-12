/**
 * Shared E2E test helpers for Supabase-based API calls.
 */

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

export function getSupabaseUrl(): string {
  return SUPABASE_URL;
}

export function getAnonKey(): string {
  return SUPABASE_ANON_KEY;
}

/** Sign in via Supabase Auth and return the access token. */
export async function signInAndGetToken(
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    }
  );
  if (!res.ok) {
    throw new Error(`Auth failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

/** Extract user ID from a Supabase JWT token. */
export function getUserIdFromToken(token: string): string {
  const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  return payload.sub;
}

/** Headers for authenticated edge function calls. */
export function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    apikey: SUPABASE_ANON_KEY,
  };
}

/** Headers for unauthenticated edge function calls. */
export function anonHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_ANON_KEY,
  };
}

/** Call a Supabase edge function. */
export async function callEdgeFunction(
  functionName: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
  } = {}
): Promise<Response> {
  const { method = "POST", body, token } = options;
  const headers = token ? authHeaders(token) : anonHeaders();
  return fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Query the Supabase REST API (PostgREST). */
export async function restQuery(
  table: string,
  options: {
    query?: string;
    method?: string;
    body?: unknown;
    token?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<Response> {
  const { query = "", method = "GET", body, token, headers: extraHeaders } = options;
  const hdrs: Record<string, string> = token
    ? authHeaders(token)
    : anonHeaders();
  if (extraHeaders) {
    Object.assign(hdrs, extraHeaders);
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
  return fetch(url, {
    method,
    headers: hdrs,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Sign up a user via Supabase Auth and return the session. */
export async function signUpUser(
  email: string,
  password: string,
  name?: string
): Promise<{ accessToken: string; userId: string }> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      data: { name: name || "Test User" },
    }),
  });
  if (!res.ok) {
    throw new Error(`Signup failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token,
    userId: data.user?.id,
  };
}
