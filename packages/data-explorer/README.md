# Card Games Data Explorer

A local static website for exploring the card games database - see what's complete, what's missing, and what needs work.

## 🎯 Purpose

This tool helps you:
- **Visualize data completeness** across all 1,000+ games
- **Identify gaps** in game information
- **Filter and search** games by quality level
- **Track progress** as you add more data

## 🚀 Quick Start

### Option 1: View Demo (No Build Required)
Just open `index.html` in your browser. It includes sample data for 4 games to demonstrate the UI.

### Option 2: Full Data with DuckDB (Recommended)
Two **separate** processes:

**1. Ingest (run when you have new/changed data)**  
Fills `packages/card-games/db/games.duckdb` from sources. Run from this package (or from `packages/card-games`):

```bash
npm run db:init
npm run ingest
```

After that, DuckDB is just a file on disk — no server, no dependency on ingest.

**2. Site (only queries DuckDB)**  
Start the dev server from this package. It opens DuckDB once (in `packages/card-games/db/games.duckdb`) and serves every request by querying that file. Refresh the page = re-query DuckDB.

```bash
cd packages/data-explorer
npm install
npm run dev
```

Open http://localhost:52741. Whatever is in DuckDB is what you see. Change data in DuckDB (re-run ingest from card-games or via `npm run ingest` here), then **restart the dev server** and refresh to see updates.

### Option 3: Production Build
Build the application for production (ingest first so `packages/card-games/db/games.duckdb` exists, then build):

```bash
cd packages/data-explorer
npm install
npm run db:init && npm run ingest
npm run build
```

The production-ready files will be in the `dist/` folder.

## 📁 Files

| File | Purpose |
|------|---------|
| `index.html` | Vite application entry point |
| `src/App.tsx` | Main React application component |
| `src/App.css` | Application styles |
| `vite.config.ts` | Vite configuration |
| `tsconfig.json` | TypeScript configuration |
| `package.json` | Dependencies and scripts |
| `build-data.cjs` | Node.js script to generate `games-data.json` from ../games/ |
| `games-data.json` | Generated data file (created by build-data.cjs) |

## 🎨 Features

### Dashboard
- **Stats cards** - Total, complete, partial, and placeholder games
- **Progress bars** - Section-by-section completion rates
- **Coverage percentage** - Overall data completeness

### Game Browser
- **Search** - Find games by name, type, origin
- **Filters** - Show/hide by quality level
- **Missing sections filter** - Find games lacking specific data
- **Visual indicators** - Color-coded dots show which sections exist

### Detail Panel
- **Game overview** - Name, filename, quality score
- **Section breakdown** - What's complete vs missing
- **Content preview** - See actual extracted data
- **Missing tags** - Quick list of what needs to be added

## 🔄 Ingest vs site (two separate processes)

| Process | What it does | When to run |
|--------|----------------|-------------|
| **Ingest** | Writes into `db/games.duckdb` from `game_names_pagat.txt` and `processed-games/*.json`. | When you add or change source data. |
| **Site** | Reads from `db/games.duckdb` only. No dependency on ingest at runtime. | `npm run dev`; then refresh = re-query DuckDB. |

The site does **not** run ingest. It only queries whatever is already in DuckDB. So: ingest once (or when data changes), then the site just reads. If you re-run ingest to update the DB, restart the dev server and refresh to see the new data.

## 🔄 Workflow

```
1. Ingest (once or when data changes):
   npm run db:init && npm run ingest
        ↓
2. Run: npm run dev
        ↓
3. Open browser at http://localhost:52741 — site queries DuckDB
        ↓
4. Refresh = re-query DuckDB (no ingest)
        ↓
5. To see new ingest data: re-run ingest, restart dev, refresh
```

## 📝 Data Quality Levels

| Level | Criteria | Color |
|-------|----------|-------|
| **Complete** | 7+ sections filled | 🟢 Green |
| **Partial** | 4-6 sections filled | 🟡 Yellow |
| **Placeholder** | <4 sections filled | 🔴 Red |

## 🔍 What Gets Detected

The parser looks for these sections:

- ✅ **Overview** - Description, type, players, deck
- ✅ **History** - Origins, timeline, evolution
- ✅ **Setup** - Player count, deck, equipment
- ✅ **Rules** - Objective, gameplay, scoring
- ✅ **Strategy** - Basic, intermediate, advanced
- ✅ **Variations** - Regional variants
- ✅ **AI** - Difficulty levels
- ✅ **Sources** - References and links

## 🛠️ For Developers

### Adding New Sections

1. Update `build-data.cjs` - Add extraction logic
2. Update `src/App.tsx` - Add rendering logic
3. Update `index.html` - Add UI if needed

### Customizing the UI

The CSS is in `src/App.css`. Key variables:

```css
:root {
  --bg-primary: #0f172a;    /* Main background */
  --bg-secondary: #1e293b;  /* Card backgrounds */
  --accent-primary: #3b82f6; /* Blue accent */
  --success: #22c55e;        /* Green for complete */
  --warning: #f59e0b;        /* Yellow for partial */
  --error: #ef4444;          /* Red for missing */
}
```

## 📊 Sample Output

When you run `npm run build-data`, you'll see:

```
📊 Summary:
  Total games: 1045
  Complete: 12 (1%)
  Partial: 89 (9%)
  Needs work: 944 (90%)

📈 Section Completion:
  overview     ████░░░░░░░░░░░░░░░░ 15% (157)
  history      ██░░░░░░░░░░░░░░░░░░ 8% (84)
  setup        ███░░░░░░░░░░░░░░░░░ 12% (125)
  rules        ██░░░░░░░░░░░░░░░░░░ 7% (73)
  strategy     █░░░░░░░░░░░░░░░░░░░ 3% (31)
  variations   █░░░░░░░░░░░░░░░░░░░ 2% (21)
  ai           █░░░░░░░░░░░░░░░░░░░ 1% (10)
  sources      ████░░░░░░░░░░░░░░░░ 18% (188)
```

## 🎮 Tips

- Use the **"Missing" filters** to find games needing specific sections
- Click any game card to see detailed breakdown
- The **search box** searches names, types, and origins
- **Quality badges** on cards show completeness at a glance

---

*Built for the Ocentra Games card game database*