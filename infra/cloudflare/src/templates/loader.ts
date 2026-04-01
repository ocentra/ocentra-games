const matchExplorerHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Match Explorer - Claim Storage</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: {
              50: '#f0f9ff',
              100: '#e0f2fe',
              200: '#bae6fd',
              300: '#7dd3fc',
              400: '#38bdf8',
              500: '#0ea5e9',
              600: '#0284c7',
              700: '#0369a1',
              800: '#075985',
              900: '#0c4a6e',
            }
          }
        }
      }
    }
  </script>
  <style>
    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }
    .shimmer {
      background: linear-gradient(90deg, #1f2937 0%, #374151 50%, #1f2937 100%);
      background-size: 1000px 100%;
      animation: shimmer 2s infinite;
    }
  </style>
</head>
<body class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen text-gray-100">
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <header class="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-2xl shadow-2xl mb-6 p-8 text-center">
      <h1 class="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
        🎮 Match Explorer
      </h1>
      <p class="text-purple-100 text-lg">Browse and explore match records stored in Cloudflare R2</p>
    </header>
    
    <nav class="flex gap-3 mb-6 flex-wrap">
      <a href="{{baseUrl}}/explore" class="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
        Matches
      </a>
      <a href="{{baseUrl}}/explore/leaderboard" class="px-6 py-3 bg-gray-700 text-gray-200 rounded-lg font-semibold hover:bg-gray-600 transition-all">
        Leaderboard
      </a>
      <a href="{{baseUrl}}/explore/benchmark" class="px-6 py-3 bg-gray-700 text-gray-200 rounded-lg font-semibold hover:bg-gray-600 transition-all">
        Benchmarks
      </a>
      <a href="{{baseUrl}}/" class="px-6 py-3 bg-gray-700 text-gray-200 rounded-lg font-semibold hover:bg-gray-600 transition-all">
        ← API
      </a>
    </nav>
    
    <div class="bg-gray-800 rounded-xl p-6 mb-6 shadow-xl border border-gray-700">
      <div class="flex gap-4 flex-wrap items-center">
        <input 
          type="text" 
          id="searchBox" 
          placeholder="Search by match ID, game name, or player ID..." 
          class="flex-1 min-w-[250px] px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        >
        <button 
          onclick="loadMatches()" 
          class="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
    
    <div class="bg-gray-800 rounded-xl p-4 mb-6 shadow-xl border border-gray-700 flex gap-6 flex-wrap text-sm">
      <div class="text-gray-400">Total Matches: <span class="text-purple-400 font-bold" id="totalMatches">-</span></div>
      <div class="text-gray-400">Showing: <span class="text-blue-400 font-bold" id="showingMatches">-</span></div>
      <div class="text-gray-400">Filtered: <span class="text-green-400 font-bold" id="filteredMatches">-</span></div>
    </div>
    
    <div id="matchesContainer">
      <div class="text-center py-12 text-gray-400">
        <div class="inline-block animate-pulse">Loading matches...</div>
      </div>
    </div>
  </div>
  
  <div id="matchDetail" class="fixed inset-0 bg-black bg-opacity-80 hidden items-center justify-center z-50 p-4 overflow-y-auto" onclick="if(event.target === this) closeDetail()">
    <div class="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700" onclick="event.stopPropagation()">
      <div class="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
        <h2 id="detailTitle" class="text-2xl font-bold text-white">Match Details</h2>
        <button onclick="closeDetail()" class="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-all text-xl font-bold">
          ×
        </button>
      </div>
      <div id="detailContent" class="p-6"></div>
    </div>
  </div>

  <script>
    const baseUrl = '{{baseUrl}}';
    let allMatches = [];
    let filteredMatches = [];

    async function loadMatches() {
      const container = document.getElementById('matchesContainer');
      container.innerHTML = '<div class="text-center py-12 text-gray-400"><div class="inline-block animate-pulse">Loading matches...</div></div>';
      
      try {
        const response = await fetch(baseUrl + '/api/explore/matches');
        if (!response.ok) {
          try {
            await response.text();
          } catch {
            void 0;
          }
          throw new Error('Failed to load matches: ' + response.statusText);
        }
        const data = await response.json();
        allMatches = data.matches || [];
        filteredMatches = allMatches;
        
        updateStats();
        renderMatches();
      } catch (error) {
        container.innerHTML = '<div class="bg-red-900 border border-red-700 rounded-lg p-4 text-red-200">Error loading matches: ' + error.message + '</div>';
      }
    }

    function updateStats() {
      document.getElementById('totalMatches').textContent = allMatches.length;
      document.getElementById('showingMatches').textContent = filteredMatches.length;
      document.getElementById('filteredMatches').textContent = allMatches.length - filteredMatches.length;
    }

    function renderMatches() {
      const container = document.getElementById('matchesContainer');
      
      if (filteredMatches.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-gray-400"><p>No matches found</p></div>';
        return;
      }
      
      container.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>';
      const grid = container.querySelector('.grid');
      
      filteredMatches.forEach(match => {
        const card = createMatchCard(match);
        grid.appendChild(card);
      });
    }

    function createMatchCard(match) {
      const card = document.createElement('div');
      card.className = 'bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-all cursor-pointer shadow-lg hover:shadow-2xl transform hover:-translate-y-1';
      
      const matchId = match.match_id || match.matchId || 'Unknown';
      const gameName = match.game?.name || match.gameName || match.game_type || 'Unknown Game';
      const startTime = match.start_time || match.createdAt ? new Date(match.start_time || match.createdAt).toLocaleString() : 'N/A';
      const endTime = match.end_time || match.endedAt ? new Date(match.end_time || match.endedAt).toLocaleString() : 'In Progress';
      const players = match.players || [];
      const moveCount = match.moves?.length || 0;
      
      const playersHtml = players.map(p => {
        const type = p.type || p.player_type || 'unknown';
        const id = p.player_id || p.public_key || 'Unknown';
        const typeColor = type === 'ai' ? 'bg-yellow-900 text-yellow-200' : 'bg-blue-900 text-blue-200';
        return '<span class="' + typeColor + ' px-3 py-1 rounded-full text-xs font-medium mr-2 mb-2 inline-block">' + type + ': ' + id.substring(0, 16) + (id.length > 16 ? '...' : '') + '</span>';
      }).join('');
      
      card.innerHTML = '<div class="font-mono text-xs text-gray-500 mb-3 break-all">' + matchId.substring(0, 40) + (matchId.length > 40 ? '...' : '') + '</div>' +
        '<div class="flex items-center gap-2 mb-4"><span class="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">' + gameName + '</span></div>' +
        '<div class="grid grid-cols-2 gap-4 mb-4 text-sm">' +
        '<div><div class="text-gray-500 text-xs mb-1">Start Time</div><div class="text-gray-200 font-medium">' + startTime + '</div></div>' +
        '<div><div class="text-gray-500 text-xs mb-1">End Time</div><div class="text-gray-200 font-medium">' + endTime + '</div></div>' +
        '<div><div class="text-gray-500 text-xs mb-1">Players</div><div class="text-gray-200 font-medium">' + players.length + '</div></div>' +
        '<div><div class="text-gray-500 text-xs mb-1">Moves</div><div class="text-gray-200 font-medium">' + moveCount + '</div></div>' +
        '</div>' +
        '<div class="border-t border-gray-700 pt-4 mt-4"><div class="text-gray-500 text-xs mb-2">Players:</div><div>' + playersHtml + '</div></div>';
      
      card.onclick = () => showDetail(match);
      return card;
    }

    function showDetail(match) {
      const detail = document.getElementById('matchDetail');
      const title = document.getElementById('detailTitle');
      const content = document.getElementById('detailContent');
      
      title.textContent = 'Match: ' + (match.match_id || match.matchId || 'Unknown');
      content.innerHTML = '<div class="mb-6"><h3 class="text-xl font-bold text-white mb-4">Match Information</h3>' +
        '<div class="grid grid-cols-2 gap-4 mb-4">' +
        '<div class="bg-gray-900 p-4 rounded-lg border border-gray-700"><div class="text-gray-500 text-xs mb-1">Match ID</div><div class="text-gray-200 font-mono text-sm">' + (match.match_id || match.matchId || 'N/A') + '</div></div>' +
        '<div class="bg-gray-900 p-4 rounded-lg border border-gray-700"><div class="text-gray-500 text-xs mb-1">Version</div><div class="text-gray-200 font-medium">' + (match.version || 'N/A') + '</div></div>' +
        '<div class="bg-gray-900 p-4 rounded-lg border border-gray-700"><div class="text-gray-500 text-xs mb-1">Game</div><div class="text-gray-200 font-medium">' + (match.game?.name || match.gameName || 'N/A') + '</div></div>' +
        '<div class="bg-gray-900 p-4 rounded-lg border border-gray-700"><div class="text-gray-500 text-xs mb-1">Ruleset</div><div class="text-gray-200 font-medium">' + (match.game?.ruleset || match.gameType || 'N/A') + '</div></div>' +
        '<div class="bg-gray-900 p-4 rounded-lg border border-gray-700"><div class="text-gray-500 text-xs mb-1">Start Time</div><div class="text-gray-200 font-medium">' + (match.start_time || match.createdAt ? new Date(match.start_time || match.createdAt).toLocaleString() : 'N/A') + '</div></div>' +
        '<div class="bg-gray-900 p-4 rounded-lg border border-gray-700"><div class="text-gray-500 text-xs mb-1">End Time</div><div class="text-gray-200 font-medium">' + (match.end_time || match.endedAt ? new Date(match.end_time || match.endedAt).toLocaleString() : 'In Progress') + '</div></div>' +
        '</div></div>' +
        '<div class="mb-6"><h3 class="text-xl font-bold text-white mb-4">Players (' + (match.players || []).length + ')</h3>' +
        '<div class="bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto">' + JSON.stringify(match.players || [], null, 2) + '</div></div>' +
        '<div class="mb-6"><h3 class="text-xl font-bold text-white mb-4">Moves (' + (match.moves || []).length + ')</h3>' +
        '<div class="bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto max-h-96 overflow-y-auto">' + JSON.stringify(match.moves || [], null, 2) + '</div></div>' +
        '<div><h3 class="text-xl font-bold text-white mb-4">Full JSON</h3>' +
        '<div class="bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto max-h-96 overflow-y-auto">' + JSON.stringify(match, null, 2) + '</div></div>';
      
      detail.classList.remove('hidden');
      detail.classList.add('flex');
    }

    function closeDetail() {
      const detail = document.getElementById('matchDetail');
      detail.classList.add('hidden');
      detail.classList.remove('flex');
    }

    document.getElementById('searchBox').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      
      if (!query) {
        filteredMatches = allMatches;
      } else {
        filteredMatches = allMatches.filter(match => {
          const matchId = (match.match_id || match.matchId || '').toLowerCase();
          const gameName = (match.game?.name || match.gameName || match.game_type || '').toLowerCase();
          const players = (match.players || []).map(p => 
            (p.player_id || p.public_key || '').toLowerCase()
          ).join(' ');
          
          return matchId.includes(query) || gameName.includes(query) || players.includes(query);
        });
      }
      
      updateStats();
      renderMatches();
    });

    loadMatches();
  </script>
</body>
</html>`;

const leaderboardExplorerHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leaderboard Explorer - Claim Storage</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
    }
  </script>
</head>
<body class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen text-gray-100">
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <header class="bg-gradient-to-r from-pink-600 via-red-500 to-pink-600 rounded-2xl shadow-2xl mb-6 p-8 text-center">
      <h1 class="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-pink-200">
        🏆 Leaderboard Explorer
      </h1>
      <p class="text-pink-100 text-lg">Per Game Type + Per Season Leaderboards</p>
    </header>
    
    <nav class="flex gap-3 mb-6 flex-wrap">
      <a href="{{baseUrl}}/explore" class="px-6 py-3 bg-gray-700 text-gray-200 rounded-lg font-semibold hover:bg-gray-600 transition-all">
        Matches
      </a>
      <a href="{{baseUrl}}/explore/leaderboard" class="px-6 py-3 bg-gradient-to-r from-pink-600 to-red-500 text-white rounded-lg font-semibold hover:from-pink-700 hover:to-red-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
        Leaderboard
      </a>
      <a href="{{baseUrl}}/explore/benchmark" class="px-6 py-3 bg-gray-700 text-gray-200 rounded-lg font-semibold hover:bg-gray-600 transition-all">
        Benchmarks
      </a>
      <a href="{{baseUrl}}/" class="px-6 py-3 bg-gray-700 text-gray-200 rounded-lg font-semibold hover:bg-gray-600 transition-all">
        ← API
      </a>
    </nav>
    
    <div class="bg-gray-800 rounded-xl p-8 shadow-xl border border-gray-700">
      <div class="bg-yellow-900 border border-yellow-700 rounded-lg p-6 mb-8">
        <h3 class="text-yellow-200 font-bold text-lg mb-3">⚠️ Implementation Status</h3>
        <p class="text-yellow-100 leading-relaxed">
          <strong>Leaderboard endpoints are currently placeholder (501 Not Implemented).</strong><br>
          Per spec Section 20.1.6, leaderboards require either:<br>
          • Off-chain indexer (PostgreSQL + Redis) for full rankings<br>
          • Solana RPC queries to GameLeaderboard PDAs for top 100<br><br>
          <strong>Structure:</strong> One leaderboard per game type per season (top 100 on-chain, full rankings off-chain)<br>
          <strong>Tiers:</strong> Computed off-chain from lifetime_gp_earned (Bronze: 0-999, Silver: 1000-4999, Gold: 5000-19999, Platinum: 20000-49999, Diamond: 50000-99999, Master: 100000+)<br>
          <strong>Score Formula:</strong> score = (wins * 1,000,000) + (wins * 10,000 / games_played.max(1))
        </p>
      </div>
      
      <h2 class="text-2xl font-bold text-white mb-4">Leaderboard Structure (Per Spec)</h2>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-gray-900 border-b border-gray-700">
              <th class="px-6 py-4 text-left text-gray-300 font-semibold">Rank</th>
              <th class="px-6 py-4 text-left text-gray-300 font-semibold">User ID</th>
              <th class="px-6 py-4 text-left text-gray-300 font-semibold">Score</th>
              <th class="px-6 py-4 text-left text-gray-300 font-semibold">Wins</th>
              <th class="px-6 py-4 text-left text-gray-300 font-semibold">Games</th>
              <th class="px-6 py-4 text-left text-gray-300 font-semibold">Win Rate</th>
              <th class="px-6 py-4 text-left text-gray-300 font-semibold">Tier</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-b border-gray-700 hover:bg-gray-900 transition-colors">
              <td class="px-6 py-4"><span class="w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 text-gray-900 rounded-full flex items-center justify-center font-bold">1</span></td>
              <td class="px-6 py-4 text-gray-300 font-mono text-sm">user_abc123...</td>
              <td class="px-6 py-4 text-gray-200 font-semibold">15,250,000</td>
              <td class="px-6 py-4 text-gray-300">15</td>
              <td class="px-6 py-4 text-gray-300">20</td>
              <td class="px-6 py-4 text-green-400 font-semibold">75%</td>
              <td class="px-6 py-4"><span class="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">Master</span></td>
            </tr>
            <tr class="border-b border-gray-700 hover:bg-gray-900 transition-colors">
              <td class="px-6 py-4"><span class="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900 rounded-full flex items-center justify-center font-bold">2</span></td>
              <td class="px-6 py-4 text-gray-300 font-mono text-sm">user_def456...</td>
              <td class="px-6 py-4 text-gray-200 font-semibold">12,100,000</td>
              <td class="px-6 py-4 text-gray-300">12</td>
              <td class="px-6 py-4 text-gray-300">15</td>
              <td class="px-6 py-4 text-green-400 font-semibold">80%</td>
              <td class="px-6 py-4"><span class="bg-cyan-500 text-gray-900 px-3 py-1 rounded-full text-xs font-semibold">Diamond</span></td>
            </tr>
            <tr class="border-b border-gray-700 hover:bg-gray-900 transition-colors">
              <td class="px-6 py-4"><span class="w-8 h-8 bg-gradient-to-br from-orange-600 to-orange-800 text-white rounded-full flex items-center justify-center font-bold">3</span></td>
              <td class="px-6 py-4 text-gray-300 font-mono text-sm">user_ghi789...</td>
              <td class="px-6 py-4 text-gray-200 font-semibold">10,050,000</td>
              <td class="px-6 py-4 text-gray-300">10</td>
              <td class="px-6 py-4 text-gray-300">12</td>
              <td class="px-6 py-4 text-green-400 font-semibold">83%</td>
              <td class="px-6 py-4"><span class="bg-gray-400 text-gray-900 px-3 py-1 rounded-full text-xs font-semibold">Platinum</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <h2 class="text-2xl font-bold text-white mt-8 mb-4">API Endpoints (When Implemented)</h2>
      <ul class="space-y-2 text-gray-300">
        <li class="flex items-center gap-2"><code class="bg-gray-900 px-3 py-1 rounded text-sm text-purple-300">GET /api/leaderboard/:game_type</code><span class="text-gray-500">- Top N for game type</span></li>
        <li class="flex items-center gap-2"><code class="bg-gray-900 px-3 py-1 rounded text-sm text-purple-300">GET /api/leaderboard/:game_type/user/:user_id</code><span class="text-gray-500">- User rank and stats</span></li>
        <li class="flex items-center gap-2"><code class="bg-gray-900 px-3 py-1 rounded text-sm text-purple-300">GET /api/leaderboard/:game_type/tier?tier=X</code><span class="text-gray-500">- Filter by tier</span></li>
        <li class="flex items-center gap-2"><code class="bg-gray-900 px-3 py-1 rounded text-sm text-purple-300">GET /api/leaderboard/:game_type/nearby/:user_id?range=5</code><span class="text-gray-500">- Players above/below</span></li>
      </ul>
    </div>
  </div>
</body>
</html>`;

const benchmarkExplorerHtml = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Benchmark Explorer - Claim Storage</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
    }
  </script>
</head>
<body class="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen text-gray-100">
  <div class="container mx-auto px-4 py-8 max-w-7xl">
    <header class="bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 rounded-2xl shadow-2xl mb-6 p-8 text-center">
      <h1 class="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-cyan-200">
        🔬 Benchmark Explorer
      </h1>
      <p class="text-cyan-100 text-lg">AI vs AI Reproducible Benchmark Matches</p>
    </header>
    
    <nav class="flex gap-3 mb-6 flex-wrap">
      <a href="{{baseUrl}}/explore" class="px-6 py-3 bg-gray-700 text-gray-200 rounded-lg font-semibold hover:bg-gray-600 transition-all">
        Matches
      </a>
      <a href="{{baseUrl}}/explore/leaderboard" class="px-6 py-3 bg-gray-700 text-gray-200 rounded-lg font-semibold hover:bg-gray-600 transition-all">
        Leaderboard
      </a>
      <a href="{{baseUrl}}/explore/benchmark" class="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-gray-900 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
        Benchmarks
      </a>
      <a href="{{baseUrl}}/" class="px-6 py-3 bg-gray-700 text-gray-200 rounded-lg font-semibold hover:bg-gray-600 transition-all">
        ← API
      </a>
    </nav>
    
    <div class="bg-gray-800 rounded-xl p-6 mb-6 shadow-xl border border-gray-700">
      <div class="flex gap-4 flex-wrap items-center">
        <input 
          type="text" 
          id="searchBox" 
          placeholder="Search by model name, match ID, or seed..." 
          class="flex-1 min-w-[250px] px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
        >
        <button 
          onclick="loadBenchmarks()" 
          class="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-gray-900 rounded-lg font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
    
    <div id="benchmarksContainer">
      <div class="text-center py-12 text-gray-400">
        <div class="inline-block animate-pulse">Loading benchmark matches...</div>
      </div>
    </div>
  </div>

  <script>
    const baseUrl = '{{baseUrl}}';
    let allBenchmarks = [];
    let filteredBenchmarks = [];

    async function loadBenchmarks() {
      const container = document.getElementById('benchmarksContainer');
      container.innerHTML = '<div class="text-center py-12 text-gray-400"><div class="inline-block animate-pulse">Loading benchmark matches...</div></div>';
      
      try {
        const response = await fetch(baseUrl + '/api/explore/benchmarks');
        if (!response.ok) {
          try {
            await response.text();
          } catch {
            void 0;
          }
          throw new Error('Failed to load benchmarks: ' + response.statusText);
        }
        const data = await response.json();
        allBenchmarks = data.benchmarks || [];
        filteredBenchmarks = allBenchmarks;
        renderBenchmarks();
      } catch (error) {
        container.innerHTML = '<div class="bg-red-900 border border-red-700 rounded-lg p-4 text-red-200">Error: ' + error.message + '</div>';
      }
    }

    function renderBenchmarks() {
      const container = document.getElementById('benchmarksContainer');
      
      if (filteredBenchmarks.length === 0) {
        container.innerHTML = '<div class="text-center py-12 text-gray-400"><p>No benchmark matches found. Benchmark matches are AI vs AI matches with model metadata.</p></div>';
        return;
      }
      
      container.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>';
      const grid = container.querySelector('.grid');
      
      filteredBenchmarks.forEach(benchmark => {
        const card = createBenchmarkCard(benchmark);
        grid.appendChild(card);
      });
    }

    function createBenchmarkCard(benchmark) {
      const card = document.createElement('div');
      card.className = 'bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-cyan-500 transition-all shadow-lg hover:shadow-2xl transform hover:-translate-y-1';
      
      const matchId = benchmark.match_id || benchmark.matchId || 'Unknown';
      const models = (benchmark.players || []).filter(p => p.type === 'ai' || p.player_type === 'ai').map(p => 
        p.metadata?.model_name || p.metadata?.model_id || 'Unknown Model'
      );
      const seed = benchmark.seed || 'N/A';
      const chainOfThought = benchmark.chain_of_thought ? 'Yes' : 'No';
      
      const matchIdShort = matchId.substring(0, 32);
      const modelsHtml = models.map(m => '<span class="bg-gradient-to-r from-cyan-500 to-blue-500 text-gray-900 px-3 py-1 rounded-full text-xs font-semibold mr-2 mb-2 inline-block">' + m + '</span>').join('');
      const timestamp = benchmark.start_time || benchmark.createdAt ? new Date(benchmark.start_time || benchmark.createdAt).toLocaleString() : 'N/A';
      card.innerHTML = '<div class="font-mono text-xs text-gray-500 mb-3 break-all">' + matchIdShort + '...</div>' +
        '<div class="mb-4"><div class="text-gray-400 text-xs mb-2 font-semibold">Models:</div><div>' + modelsHtml + '</div></div>' +
        '<div class="space-y-2 mb-4 text-sm">' +
        '<div class="flex justify-between"><span class="text-gray-500">Seed:</span><code class="bg-gray-900 px-2 py-1 rounded text-gray-300 text-xs">' + seed + '</code></div>' +
        '<div class="flex justify-between"><span class="text-gray-500">Chain of Thought:</span><span class="text-gray-200 font-medium">' + chainOfThought + '</span></div>' +
        '<div class="flex justify-between"><span class="text-gray-500">Moves:</span><span class="text-gray-200 font-medium">' + (benchmark.moves || []).length + '</span></div>' +
        '</div>' +
        '<div class="text-xs text-gray-500 border-t border-gray-700 pt-3 mt-4">' + timestamp + '</div>';
      
      return card;
    }

    document.getElementById('searchBox').addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        filteredBenchmarks = allBenchmarks;
      } else {
        filteredBenchmarks = allBenchmarks.filter(b => {
          const matchId = (b.match_id || b.matchId || '').toLowerCase();
          const models = (b.players || []).map(p => 
            (p.metadata?.model_name || p.metadata?.model_id || '').toLowerCase()
          ).join(' ');
          const seed = (b.seed || '').toLowerCase();
          return matchId.includes(query) || models.includes(query) || seed.includes(query);
        });
      }
      renderBenchmarks();
    });

    loadBenchmarks();
  </script>
</body>
</html>`;

/**
 * Simple HTML escape function to prevent basic XSS
 * FIX 3.4: XSS Protection
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const templates = {
  matchExplorer: (baseUrl: string): string => {
    const escapedBaseUrl = escapeHtml(baseUrl);
    return matchExplorerHtml
      .replace(/\{\{baseUrl\}\}/g, escapedBaseUrl)
      .replace('https://cdn.tailwindcss.com', 'https://cdn.tailwindcss.com/3.4.1');
  },
  leaderboardExplorer: (baseUrl: string): string => {
    const escapedBaseUrl = escapeHtml(baseUrl);
    return leaderboardExplorerHtml.replace(/\{\{baseUrl\}\}/g, escapedBaseUrl);
  },
  benchmarkExplorer: (baseUrl: string): string => {
    const escapedBaseUrl = escapeHtml(baseUrl);
    return benchmarkExplorerHtml.replace(/\{\{baseUrl\}\}/g, escapedBaseUrl);
  },
};
