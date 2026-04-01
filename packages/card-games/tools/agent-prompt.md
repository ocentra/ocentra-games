Agent {{runId}} - Fix or Enrich {{rel}}

MODE: You are in YOLO / auto-run mode. Execute each step immediately. Do NOT wait for confirmation. Run the commands as instructed.

== STEP 1: UNDERSTAND THE RULES FIRST ==
Read these files carefully BEFORE you touch anything and follow them correctly:
- @packages/card-games/docs/GameReadyValidation.md (validation rules, Ready Gate checklist, deck rules, what buildable means)
- @packages/card-games/docs/GapFillRegulation.md (what you can/cannot do, no BS fill, no cheating)
You must understand: what counts as a gap, how playerActions work, why Custom deckType is forbidden, what the Ready Gate checklist requires. Follow GameReadyValidation.md and GapFillRegulation.md exactly. Do NOT skip this.

== STEP 2: REPORT STARTED ==
Run this command to tell the boss you're working:
{{reportStart}}

== STEP 2.1: READ ALL SOURCES & VERIFY URLS ==
File: {{rel}} — work ONLY on this JSON; do NOT read or edit other JSON files.

Do this BEFORE fixing. Open {{rel}} and check sources.primary and sources.additional.

- LOCAL FIRST: Always read from src/SourceHtml/ (localHtml) if it exists. Do NOT fetch from URL. Only use URL if localHtml is missing.
- READ ALL SOURCES: If there are multiple sources (Pagat, Wikipedia, wiki, additional URLs), read them all. You will use primary and additional together in STEP 3.
- URL check: Verify ALL URLs (sources.primary and sources.additional) are correct, reachable, and for THIS game (not a different game). If any URL is wrong or unreachable, find the correct URL and update it.
- If localHtml is missing for a source, you may download the HTML from the URL and add it to src/SourceHtml/ — but ALWAYS check locally first; use existing localHtml if it exists.
- Refer to packages/card-games/src/SourceHtml/manifest.json to find sources.

== STEP 3: FIX OR ENRICH THE FILE ==
File: {{rel}} (same as STEP 2.1)

{{taskContext}}

- Use the sources you read in STEP 2.1. If multiple (Pagat, Wikipedia, wiki, etc.), cross-check and enrich from each source.
- Fix validation errors OR enrich minimal content — replace 1-line BS, "See Pagat", "Documented in...", or placeholder text with REAL data from sources.
- Fill all Unknown/NA/empty fields with real data from those sources.
- If validation fails with "no reachable URL" or "sources.primary (url)", go back to STEP 2.1 — fix the URL, then re-validate.
- When you fill a section (history, setup, rules, strategy, variations, ai), set completeness.<section> = true for that section in the same edit.
- AI guide blank: If ai.difficulty (easy/medium/hard) are all null and ai.considerations is empty, add ai.nullReasons (min one key, 15+ chars each), e.g. { easy: "No AI implementation yet; sources do not describe AI strategy for this game." }
- Variations empty: If variations.list is empty, add variations.noVariationsReason (min 15 chars), e.g. "Sources describe only the standard form; no regional or rule variations documented."
- Do NOT delete keys. Do NOT edit other files. No Custom deckType.
- Goal: a buildable game with real data — not 1-line placeholders or stub content.
- IMPORTANT: Check overall data correctness; previous agents may have filled from wrong source. ALWAYS DO THIS PASS.
- SUPER CRITICAL: NEVER USE BULK EDIT or Script to fill — open JSON and manually fill from sources.
- If origin is multiple countries, add multiple countries and edit history accordingly.

== STEP 4: VALIDATE (this file only) ==
Run this exact command from packages/card-games (no braces, no redirect):
  npm run validate:one -- src/processed-games/{{jsonFile}} -- --strict
Keep fixing until that command reports no errors for this file. If you ever wrote a temp .txt (e.g. in tools/logs or package root) to read validation output back, delete that file before STEP 5.
Before finishing, run the Ready Gate checklist from docs/GameReadyValidation.md — ask yourself: Can I build this game from this JSON?

== STEP 5: REPORT DONE ==
If you created any temporary file (e.g. tools/logs/*.txt or any validate-*.txt) to capture validation output, delete it now. Then run this command ONLY when validation passes:
{{reportDone}}

IMPORTANT: After running the done command above, STOP IMMEDIATELY. Do not summarize, do not explain what you did, do not output anything else. Just run the command and stop. The boss is watching and will close this terminal and assign the next task.

Do NOT run the boss script or start another boss. You are an agent; the boss assigns your tasks.
