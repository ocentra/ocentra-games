# Fill-the-gap agent runner

From `packages/card-games`, run the boss script to spawn one or more agents. The boss runs validation, builds a queue of failing JSONs, assigns files to agents, and reassigns the next file when each agent reports done.

**Required reading (agents must follow correctly):**
- `docs/GameReadyValidation.md` — validation rules, Ready Gate, engine requirements
- `docs/GapFillRegulation.md` — process rules (real data, no placeholders, one game at a time)

## Run agents

**Validation-fix mode** (default — fixes failing files):
```powershell
cd packages/card-games
npm run fill:start-boss
```
Or: `.\tools\run-fill-agent.ps1 -NumAgents 1 -NumFiles 10`

**Gap-fill mode** (when all validate — enriches games with minimal content):
```powershell
npm run fill:gap-fill
```
Or: `.\tools\run-fill-agent.ps1 -GapFill`

Use `-GapFill` when all files pass validation but you want AI agents to enrich history, setup, rules, strategy with real content from sources (replacing BS 1-line placeholders). Run `npm run ingest` first.

**Dry run** — prints prompt in boss terminal, adds instruction to explain (not fix), spawns one agent:
```powershell
npm run fill:dry-run
```
Or: `.\tools\run-fill-agent.ps1 -DryRun`

Each agent will:

1. Receive one file from the boss (from the failing list or gap-fill list).
2. Fix or enrich the file per `agent-prompt.md`, run validation, report **done** when it passes.
3. The boss kills that agent and assigns the next file to the same slot.
4. Repeat until the queue is empty.

## Boss check

- Status file: `tools/logs/status.ndjson` — who got what, done/assigned.
- To see current failures: `npm run validate` (full) or `npm run validate:list:n5` (first 5) / `validate:list:n20` etc.

## Agent command

Default is `cursor-agent`. If you use another runner (e.g. a wrapper that invokes Cursor), pass it:

```powershell
.\tools\run-fill-agent.ps1 -AgentCommand "your-agent-cli"
```

## Agent prompt template (Boss mode -Full)

The prompt sent to each agent is built from `tools/agent-prompt.md`. One prompt handles both validation-fix and gap-fill modes. Edit that file to change instructions. Placeholders:
- `{{runId}}` — agent run ID
- `{{rel}}` — path e.g. `src/processed-games/foo.json`
- `{{jsonFile}}` — filename e.g. `foo.json`
- `{{taskContext}}` — validation errors (fix mode) or enrich instruction (gap-fill mode)
- `{{reportStart}}` — command to report started
- `{{reportDone}}` — command to report done

## Logs

Per-run logs: `packages/card-games/tools/logs/<AgentName>_<filename>.log`

When running with "background (minimized)" and a slot exits without done, the boss writes `tools/logs/agent-slot<N>-<file>.err.log` with exit details. Run without hidden to see agent output directly in the terminal.
