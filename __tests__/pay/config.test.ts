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
    process.env.LEDGER_SIGNING_KEY = 'real-key';
    process.env.ACCUMULATION_ADDRESS = 'bc1qrealaddress';
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

describe('getConfig default-secret guard', () => {
  const ORIG = { ...process.env };
  afterEach(() => { process.env = { ...ORIG }; });

  test('throws when LN_BACKEND is non-mock and LEDGER_SIGNING_KEY is unset', () => {
    process.env.LN_BACKEND = 'lnd';
    delete process.env.LEDGER_SIGNING_KEY;
    delete process.env.ACCUMULATION_ADDRESS;
    expect(() => getConfig()).toThrow(/LEDGER_SIGNING_KEY/);
  });

  test('throws when LN_BACKEND is non-mock and both secrets are empty strings', () => {
    process.env.LN_BACKEND = 'lnd';
    process.env.LEDGER_SIGNING_KEY = '';
    process.env.ACCUMULATION_ADDRESS = '';
    expect(() => getConfig()).toThrow(/LEDGER_SIGNING_KEY/);
  });

  test('throws when MAINNET_ENABLED=true with default secrets', () => {
    process.env.MAINNET_ENABLED = 'true';
    delete process.env.LEDGER_SIGNING_KEY;
    expect(() => getConfig()).toThrow(/LEDGER_SIGNING_KEY/);
  });

  test('does not throw in default mock mode', () => {
    delete process.env.LN_BACKEND;
    delete process.env.MAINNET_ENABLED;
    delete process.env.LEDGER_SIGNING_KEY;
    expect(() => getConfig()).not.toThrow();
  });

  test('does not throw outside mock mode when both secrets are set', () => {
    process.env.LN_BACKEND = 'lnd';
    process.env.LEDGER_SIGNING_KEY = 'real-key';
    process.env.ACCUMULATION_ADDRESS = 'bc1qrealaddress';
    expect(() => getConfig()).not.toThrow();
  });
});
