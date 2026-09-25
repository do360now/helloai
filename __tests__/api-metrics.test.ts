import { recordApiRequest, usageSnapshot, resetUsageForTests } from '@/lib/api-metrics';

const IP = '198.51.100.77';
const base = { path: '/api/recommend', userAgent: 'curl/8.5.0', ip: IP, params: { task: 'coding', max_cost: '10' }, rateLimited: false };

describe('recordApiRequest', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    resetUsageForTests();
    delete process.env.API_METRICS_STDOUT;
    spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => spy.mockRestore());

  it('writes one [api-metrics] line with parseable JSON', () => {
    recordApiRequest(base);
    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0][0] as string;
    expect(line.startsWith('[api-metrics] ')).toBe(true);
    const json = JSON.parse(line.slice('[api-metrics] '.length));
    expect(json.path).toBe('/api/recommend');
    expect(json.ua).toBe('tool');
    expect(json.rate_limited).toBe(false);
    expect(json.param_keys).toEqual(['task', 'max_cost']);
    expect(json.ip_hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('never logs the raw IP or param values', () => {
    recordApiRequest(base);
    const line = spy.mock.calls[0][0] as string;
    expect(line).not.toContain(IP);
    expect(line).not.toContain('coding');
  });

  it('hashes the same IP the same way within a day', () => {
    recordApiRequest(base);
    recordApiRequest(base);
    const a = JSON.parse((spy.mock.calls[0][0] as string).slice(14)).ip_hash;
    const b = JSON.parse((spy.mock.calls[1][0] as string).slice(14)).ip_hash;
    expect(a).toBe(b);
  });

  it('does not throw when console.log throws', () => {
    spy.mockImplementation(() => { throw new Error('stdout closed'); });
    expect(() => recordApiRequest(base)).not.toThrow();
  });

  it('writes nothing when API_METRICS_STDOUT=false, but still counts', () => {
    process.env.API_METRICS_STDOUT = 'false';
    recordApiRequest(base);
    expect(spy).not.toHaveBeenCalled();
    expect(usageSnapshot().total).toBe(1);
  });

  it('counts by ua class and path, with an ISO since', () => {
    recordApiRequest(base);
    recordApiRequest({ ...base, userAgent: '', path: '/api/models' });
    const u = usageSnapshot();
    expect(u.total).toBe(2);
    expect(u.by_ua.tool).toBe(1);
    expect(u.by_ua.empty).toBe(1);
    expect(u.by_path['/api/recommend']).toBe(1);
    expect(u.by_path['/api/models']).toBe(1);
    expect(new Date(u.since).toISOString()).toBe(u.since);
  });

  it('shares counters across separately loaded copies of the module (proxy vs route bundle)', async () => {
    let writer!: typeof import('@/lib/api-metrics');
    let reader!: typeof import('@/lib/api-metrics');
    await jest.isolateModulesAsync(async () => { writer = await import('@/lib/api-metrics'); });
    await jest.isolateModulesAsync(async () => { reader = await import('@/lib/api-metrics'); });
    expect(writer).not.toBe(reader);
    writer.recordApiRequest(base);
    expect(reader.usageSnapshot().total).toBe(1);
  });
});
