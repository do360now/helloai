import { getConfig } from '@/lib/pay/config';

describe('getConfig', () => {
  const ORIG = { ...process.env };
  afterEach(() => { process.env = { ...ORIG }; });

  test('provides safe defaults', () => {
    delete process.env.LN_BACKEND;
    delete process.env.PRO_PRICE_SATS;
    delete process.env.FUNDING_THRESHOLD_SATS;
    delete process.env.MAINNET_ENABLED;
    const cfg = getConfig();
    expect(cfg.lnBackend).toBe('mock');
    expect(cfg.proPriceSats).toBe(100);
    expect(cfg.fundingThresholdSats).toBe(1000);
    expect(cfg.maxSweepSats).toBe(100000);
    expect(cfg.mainnetEnabled).toBe(false);
    expect(cfg.ledgerDir).toBe('data/ledger');
  });

  test('reads overrides from env', () => {
    process.env.PRO_PRICE_SATS = '250';
    process.env.MAINNET_ENABLED = 'true';
    const cfg = getConfig();
    expect(cfg.proPriceSats).toBe(250);
    expect(cfg.mainnetEnabled).toBe(true);
  });

  test('rejects non-integer sats', () => {
    process.env.PRO_PRICE_SATS = 'abc';
    expect(() => getConfig()).toThrow(/PRO_PRICE_SATS/);
  });

  test('rejects fractional sats (would otherwise make the endpoint free)', () => {
    process.env.PRO_PRICE_SATS = '0.5';
    expect(() => getConfig()).toThrow(/PRO_PRICE_SATS/);
  });
});
