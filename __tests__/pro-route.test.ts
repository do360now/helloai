/**
 * Regression: unsupported LN_BACKEND used to escape as an unhandled exception.
 */
describe('/api/pro/recommend error handling', () => {
  const savedEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...savedEnv };
    jest.resetModules();
  });

  it('returns a clean 500 JSON body when the backend is misconfigured', async () => {
    process.env.LN_BACKEND = 'unsupported-backend';
    // Non-mock backend requires real secrets after Task 2's guard:
    process.env.LEDGER_SIGNING_KEY = 'test-signing-key';
    process.env.ACCUMULATION_ADDRESS = 'bc1qtestaddress';
    jest.resetModules();
    const { GET } = await import('@/app/api/pro/recommend/route');
    const { NextRequest } = await import('next/server');
    const res = await GET(new NextRequest('http://localhost/api/pro/recommend?task=coding'));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'Internal server error' });
  });
});
