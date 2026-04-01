export const SolanaCluster = {
  Devnet: 'devnet',
  Testnet: 'testnet',
  MainnetBeta: 'mainnet-beta',
  Localnet: 'localnet',
} as const;

export type SolanaCluster = typeof SolanaCluster[keyof typeof SolanaCluster];

export const SolanaRpcUrl = {
  Devnet: 'https://api.devnet.solana.com',
  Testnet: 'https://api.testnet.solana.com',
  MainnetBeta: 'https://api.mainnet-beta.solana.com',
  Localnet: 'http://localhost:8899',
} as const;

export type SolanaRpcUrl = typeof SolanaRpcUrl[keyof typeof SolanaRpcUrl];

const CLUSTER_RPC: Record<SolanaCluster, string> = {
  [SolanaCluster.Devnet]: SolanaRpcUrl.Devnet,
  [SolanaCluster.Testnet]: SolanaRpcUrl.Testnet,
  [SolanaCluster.MainnetBeta]: SolanaRpcUrl.MainnetBeta,
  [SolanaCluster.Localnet]: SolanaRpcUrl.Localnet,
};

export function getSolanaRpcUrl(cluster: SolanaCluster): string {
  return CLUSTER_RPC[cluster];
}

export const SolanaProgramId = {
  GameState: 'GameState1111111111111111111111111111111111',
  MatchEscrow: 'MatchEscrow11111111111111111111111111111111',
  TokenRewards: 'TokenRewards111111111111111111111111111111',
} as const;

export type SolanaProgramId = typeof SolanaProgramId[keyof typeof SolanaProgramId];

export const SolanaCommitment = {
  Processed: 'processed',
  Confirmed: 'confirmed',
  Finalized: 'finalized',
} as const;

export type SolanaCommitment = typeof SolanaCommitment[keyof typeof SolanaCommitment];

export const DEFAULT_COMMITMENT = SolanaCommitment.Confirmed;
