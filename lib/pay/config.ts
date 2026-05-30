export interface PayConfig {
  lnBackend: string;
  proPriceSats: number;
  fundingThresholdSats: number;
  maxSweepSats: number;
  ledgerSigningKey: string;
  ledgerDir: string;
  accumulationAddress: string;
  mainnetEnabled: boolean;
}

function intEnv(name: string, def: number): number {
  const v = process.env[name];
  if (v == null || v === '') return def;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be a non-negative integer, got: ${v}`);
  return n;
}

export function getConfig(): PayConfig {
  return {
    lnBackend: process.env.LN_BACKEND ?? 'mock',
    proPriceSats: intEnv('PRO_PRICE_SATS', 100),
    fundingThresholdSats: intEnv('FUNDING_THRESHOLD_SATS', 1000),
    maxSweepSats: intEnv('MAX_SWEEP_SATS', 100000),
    ledgerSigningKey: process.env.LEDGER_SIGNING_KEY ?? 'dev-insecure-key-change-me',
    ledgerDir: process.env.LEDGER_DIR ?? 'data/ledger',
    accumulationAddress:
      process.env.ACCUMULATION_ADDRESS ?? 'bcrt1qmockplaceholderaddressxxxxxxxxxxxxxxxx',
    mainnetEnabled: (process.env.MAINNET_ENABLED ?? 'false') === 'true',
  };
}
