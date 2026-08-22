// Runnable check for the API client with global fetch stubbed: it targets the
// right method+path, attaches the bearer token and a JSON body, parses success,
// maps a non-2xx {error} into a thrown ApiError, and fires the unauthorized
// handler on a 401. No network, no server. `pnpm check:client` (tsx).

import { api, ApiError, setAuthToken, setUnauthorizedHandler } from './client';

let passed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error('FAIL: ' + msg);
  passed++;
  console.log('  ok -', msg);
}
function eq<T>(actual: T, expected: T, msg: string) {
  ok(
    actual === expected,
    `${msg} (got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)})`,
  );
}

interface Captured {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
}
let last: Captured | null = null;

function stubFetch(status: number, payload: unknown) {
  globalThis.fetch = (async (
    url: string,
    init: { method?: string; headers?: Record<string, string>; body?: string } = {},
  ) => {
    last = {
      url: String(url),
      method: init.method ?? 'GET',
      headers: init.headers ?? {},
      body: init.body,
    };
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (payload === undefined ? '' : JSON.stringify(payload)),
    };
  }) as unknown as typeof fetch;
}

async function main() {
  console.log('api client');

  // 1. login: POST /auth/login with a JSON body, no token attached yet
  setAuthToken(null);
  stubFetch(200, {
    token: 'jwt-abc',
    user: { id: 't1', role: 'teacher', name: 'A', email: 'a@b.c' },
  });
  const auth = await api.login({ email: 'a@b.c', password: 'pw', role: 'teacher' });
  eq(last!.method, 'POST', 'login uses POST');
  ok(last!.url.endsWith('/auth/login'), 'login hits /auth/login');
  eq(last!.headers['content-type'], 'application/json', 'a body sets content-type');
  eq(JSON.parse(last!.body!).email, 'a@b.c', 'login body carries the email');
  ok(last!.headers.authorization === undefined, 'no auth header before a token is set');
  eq(auth.token, 'jwt-abc', 'login parses the token from the response');

  // 2. once a token is set, reads attach it as a bearer and send no body
  setAuthToken('jwt-abc');
  stubFetch(200, []);
  await api.myClasses();
  eq(last!.method, 'GET', 'myClasses uses GET');
  ok(last!.url.endsWith('/me/classes'), 'myClasses hits /me/classes');
  eq(last!.headers.authorization, 'Bearer jwt-abc', 'the token rides as a bearer header');
  ok(last!.body === undefined, 'a GET sends no body');

  // 3. path building interpolates params
  stubFetch(200, { summary: {}, concepts: [], studentsByNeed: [], avgMasteryPct: 90, narration: '' });
  await api.insights('class-1');
  ok(last!.url.endsWith('/classes/class-1/insights'), 'insights builds the class path');

  // 4. a non-2xx maps the server {error} into a thrown ApiError
  stubFetch(404, { error: 'concept not found' });
  let thrown: unknown;
  try {
    await api.conceptDetail('class-1', 'c-x');
  } catch (e) {
    thrown = e;
  }
  ok(thrown instanceof ApiError, 'a non-2xx throws ApiError');
  eq((thrown as ApiError).status, 404, 'the ApiError carries the status');
  eq((thrown as ApiError).message, 'concept not found', 'the ApiError carries the server message');

  // 5. a 401 fires the unauthorized handler (so an expired session logs out)
  let unauthorized = 0;
  setUnauthorizedHandler(() => {
    unauthorized++;
  });
  stubFetch(401, { error: 'invalid or expired token' });
  try {
    await api.myClasses();
  } catch {
    /* expected */
  }
  eq(unauthorized, 1, 'a 401 triggers the unauthorized handler');
  setUnauthorizedHandler(null);

  console.log(`\nAll ${passed} assertions passed.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
