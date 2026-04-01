# AI Domain – Tests

All tests for `@ocentra/ai-domain` live under this folder.

| Folder        | Purpose |
|---------------|---------|
| **unit**      | Unit tests (pure logic, no worker/runtime). |
| **integration** | Tests that use real or emulated dependencies (e.g. provider adapters). |
| **e2e**       | End-to-end tests (full flow, may hit real APIs or worker). |
| **contracts** | Contract tests (consumer/provider pacts, if used). |
| **helpers**   | Shared test helpers, factories, mocks. |
| **fixtures**  | Test data (JSON, prompts, etc.). |

Same layout idea as `infra/cloudflare/tests`. Add `*.test.ts` (or `*.spec.ts`) in the appropriate subfolder.
