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

const DEFAULT_SIGNING_KEY = 'dev-insecure-key-change-me';
const DEFAULT_ACCUMULATION_ADDRESS = 'bcrt1qmockplaceholderaddressxxxxxxxxxxxxxxxx';

export function getConfig(): PayConfig {
  const cfg: PayConfig = {
    lnBackend: process.env.LN_BACKEND ?? 'mock',
    proPriceSats: intEnv('PRO_PRICE_SATS', 100),
    fundingThresholdSats: intEnv('FUNDING_THRESHOLD_SATS', 1000),
    maxSweepSats: intEnv('MAX_SWEEP_SATS', 100000),
    ledgerSigningKey: process.env.LEDGER_SIGNING_KEY ?? DEFAULT_SIGNING_KEY,
    ledgerDir: process.env.LEDGER_DIR ?? 'data/ledger',
    accumulationAddress:
      process.env.ACCUMULATION_ADDRESS ?? DEFAULT_ACCUMULATION_ADDRESS,
    mainnetEnabled: (process.env.MAINNET_ENABLED ?? 'false') === 'true',
  };

  const usingDefaultSecrets =
    cfg.ledgerSigningKey === DEFAULT_SIGNING_KEY ||
    cfg.accumulationAddress === DEFAULT_ACCUMULATION_ADDRESS;
  if ((cfg.mainnetEnabled || cfg.lnBackend !== 'mock') && usingDefaultSecrets) {
    throw new Error(
      'Refusing to run outside mock mode with default secrets: set LEDGER_SIGNING_KEY and ACCUMULATION_ADDRESS'
    );
  }

  return cfg;
}
