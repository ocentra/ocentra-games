# Services

App config, orchestration, and verification. **Not** for integration/wiring — that lives in **adapters**.

| Folder | Purpose |
|--------|---------|
| **storage/** | StorageConfig (env/config for R2). Tests for config and for adapters/storage (R2, HotStorage). |
| **verification/** | MatchVerifier, GameReplayVerifier — orchestration across verification-domain, R2, etc. |
| **monitoring/** | MetricsCollector. |
| **core/** | ServiceContainer, ServiceProvider — DI. |

Import integrations from **@/adapters/** (image, assets, network, storage, firebase, solana, tokens, stripe, dev).
