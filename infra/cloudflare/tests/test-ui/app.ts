(function () {
  const API_PREFIX = '/api/v1';

  function getApiBase(): string {
    const q = new URLSearchParams(window.location.search);
    const input = document.getElementById('apiBase') as HTMLInputElement;
    return q.get('apiBase') || input.value.trim() || 'http://localhost:8787';
  }

  function getUserId(): string {
    const input = document.getElementById('userId') as HTMLInputElement;
    return input.value.trim() || 'test-user';
  }

  function getOrigin(): string {
    const input = document.getElementById('origin') as HTMLInputElement;
    return input.value.trim() || window.location.origin;
  }

  function getToken(): string {
    return 'test-token:' + getUserId();
  }

  function log(msg: string, level?: 'error' | 'info'): void {
    const el = document.getElementById('logOut');
    if (!el) return;
    const line = document.createElement('div');
    line.className = level === 'error' ? 'err' : '';
    line.textContent = new Date().toISOString().slice(11, 23) + ' ' + msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
    if (typeof console !== 'undefined') console.log('[test-ui]', msg);
  }

  function setResult(id: string, text: string, isError: boolean): void {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = text;
      el.className = isError ? 'err' : 'ok';
    }
  }

  interface ApiResponse {
    ok: boolean;
    status: number;
    data: unknown;
  }

  async function api(method: string, path: string, body?: unknown): Promise<ApiResponse> {
    const base = getApiBase().replace(/\/+$/, '');
    const url = path.startsWith('http') ? path : base + (path.startsWith('/') ? path : API_PREFIX + '/' + path);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken(),
      'Origin': getOrigin(),
    };
    const opts: RequestInit = { method, headers };
    if (body != null && (method === 'POST' || method === 'PUT')) {
      opts.body = typeof body === 'string' ? body : JSON.stringify(body);
    }
    log(method + ' ' + url);
    try {
      const res = await fetch(url, opts);
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }
      if (!res.ok) {
        log('HTTP ' + res.status + ' ' + JSON.stringify(data), 'error');
        return { ok: false, status: res.status, data };
      }
      log('HTTP ' + res.status);
      return { ok: true, status: res.status, data };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      log('Fetch Error: ' + msg, 'error');
      return { ok: false, status: 0, data: { error: msg } };
    }
  }

  const getEl = (id: string) => document.getElementById(id) as HTMLElement;

  getEl('btnAuth').addEventListener('click', async () => {
    const userId = getUserId();
    const r = await api('GET', API_PREFIX + '/profiles/' + encodeURIComponent(userId));
    setResult('authResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnRoomsList').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/rooms');
    setResult('lobbyResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnRoomCreate').addEventListener('click', async () => {
    const r = await api('POST', API_PREFIX + '/rooms', { hostId: getUserId() });
    setResult('lobbyResult', JSON.stringify(r.data, null, 2), !r.ok);
    const data = r.data as Record<string, unknown>;
    if (r.ok && data && typeof data.roomId === 'string') {
      (document.getElementById('roomId') as HTMLInputElement).value = data.roomId;
    }
  });

  getEl('btnRoomJoin').addEventListener('click', async () => {
    const roomId = (document.getElementById('roomId') as HTMLInputElement).value.trim();
    if (!roomId) {
      setResult('lobbyResult', 'Enter room ID first', true);
      return;
    }
    const r = await api('POST', API_PREFIX + '/rooms/' + encodeURIComponent(roomId) + '/join', { userId: getUserId() });
    setResult('lobbyResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnRoomLeave').addEventListener('click', async () => {
    const roomId = (document.getElementById('roomId') as HTMLInputElement).value.trim();
    if (!roomId) {
      setResult('lobbyResult', 'Enter room ID first', true);
      return;
    }
    const r = await api('POST', API_PREFIX + '/rooms/' + encodeURIComponent(roomId) + '/leave', { userId: getUserId() });
    setResult('lobbyResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnQueueJoin').addEventListener('click', async () => {
    const r = await api('POST', API_PREFIX + '/matchmaking/queue', { userId: getUserId() });
    setResult('matchmakingResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnQueueLeave').addEventListener('click', async () => {
    const r = await api('POST', API_PREFIX + '/matchmaking/leave', { userId: getUserId() });
    setResult('matchmakingResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnQueueStatus').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/matchmaking/status?userId=' + encodeURIComponent(getUserId()));
    setResult('matchmakingResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnPresenceGet').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/presence/' + encodeURIComponent(getUserId()));
    setResult('presenceResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnPresenceUpdate').addEventListener('click', async () => {
    const status = (document.getElementById('presenceStatus') as HTMLSelectElement).value;
    const r = await api('POST', API_PREFIX + '/presence/' + encodeURIComponent(getUserId()), { status });
    setResult('presenceResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  // Audit section
  getEl('btnAuditLog').addEventListener('click', async () => {
    const event = {
      eventId: crypto.randomUUID(),
      eventType: 'test.event',
      category: 'test',
      actor: { type: 'user', id: getUserId() },
      target: { type: 'resource', id: 'res-1' },
      action: { type: 'read', status: 'success' },
      context: { timestamp: Date.now(), requestId: 'req-1', traceId: 'trace-1' },
      classification: { sensitivity: 'user', retention: 'short' },
    };
    const r = await api('POST', API_PREFIX + '/audit/log', event);
    setResult('auditResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnAuditQuery').addEventListener('click', async () => {
    const r = await api('POST', API_PREFIX + '/audit/query', { filters: {} });
    setResult('auditResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnAuditVerify').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/audit/verify?userId=' + encodeURIComponent(getUserId()));
    setResult('auditResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnAuditExport').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/audit/export?userId=' + encodeURIComponent(getUserId()));
    setResult('auditResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  // Transparency section
  getEl('btnTransparencyGet').addEventListener('click', async () => {
    const matchId = (document.getElementById('transparencyMatchId') as HTMLInputElement).value.trim();
    if (!matchId) {
      setResult('transparencyResult', 'Enter match ID first', true);
      return;
    }
    const r = await api('GET', API_PREFIX + '/matches/' + encodeURIComponent(matchId) + '/transparency');
    setResult('transparencyResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnTransparencyVerify').addEventListener('click', async () => {
    const matchId = (document.getElementById('transparencyMatchId') as HTMLInputElement).value.trim();
    if (!matchId) {
      setResult('transparencyResult', 'Enter match ID first', true);
      return;
    }
    const r = await api('GET', API_PREFIX + '/matches/' + encodeURIComponent(matchId) + '/verify');
    setResult('transparencyResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnTransparencyReplay').addEventListener('click', async () => {
    const matchId = (document.getElementById('transparencyMatchId') as HTMLInputElement).value.trim();
    if (!matchId) {
      setResult('transparencyResult', 'Enter match ID first', true);
      return;
    }
    const r = await api('GET', API_PREFIX + '/matches/' + encodeURIComponent(matchId) + '/replay');
    setResult('transparencyResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnTransparencyAIDecisions').addEventListener('click', async () => {
    const matchId = (document.getElementById('transparencyMatchId') as HTMLInputElement).value.trim();
    if (!matchId) {
      setResult('transparencyResult', 'Enter match ID first', true);
      return;
    }
    const r = await api('GET', API_PREFIX + '/matches/' + encodeURIComponent(matchId) + '/ai-decisions');
    setResult('transparencyResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  // Compliance section
  getEl('btnComplianceReport').addEventListener('click', async () => {
    const reportType = (document.getElementById('complianceReportType') as HTMLSelectElement).value;
    const startDate = (document.getElementById('complianceStartDate') as HTMLInputElement).value;
    const endDate = (document.getElementById('complianceEndDate') as HTMLInputElement).value;
    
    let url = API_PREFIX + '/compliance/report?reportType=' + reportType;
    if (startDate) url += '&startDate=' + startDate;
    if (endDate) url += '&endDate=' + endDate;
    
    const r = await api('GET', url);
    setResult('complianceResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  // Data (GDPR) section
  getEl('btnDataExport').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/data-export/' + encodeURIComponent(getUserId()));
    setResult('dataResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnDataDelete').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete your data? This cannot be undone.')) {
      return;
    }
    const r = await api('DELETE', API_PREFIX + '/data/' + encodeURIComponent(getUserId()), { confirm: true });
    setResult('dataResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnShopList').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/shop/products');
    setResult('shopResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnShopGet').addEventListener('click', async () => {
    const productId = (document.getElementById('shopProductId') as HTMLInputElement).value.trim();
    if (!productId) {
      setResult('shopResult', 'Enter product ID first', true);
      return;
    }
    const r = await api('GET', API_PREFIX + '/shop/products/' + encodeURIComponent(productId));
    setResult('shopResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnAdminProductsList').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/admin/products');
    setResult('adminProductsResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnAdminProductsGet').addEventListener('click', async () => {
    const productId = (document.getElementById('adminProductId') as HTMLInputElement).value.trim();
    if (!productId) {
      setResult('adminProductsResult', 'Enter product ID first', true);
      return;
    }
    const r = await api('GET', API_PREFIX + '/admin/products/' + encodeURIComponent(productId));
    setResult('adminProductsResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnSyncHealth').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/sync/health');
    setResult('syncReplayResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnReplayGet').addEventListener('click', async () => {
    const matchId = (document.getElementById('replayMatchId') as HTMLInputElement).value.trim();
    if (!matchId) {
      setResult('syncReplayResult', 'Enter match ID first', true);
      return;
    }
    const r = await api('GET', API_PREFIX + '/replay/' + encodeURIComponent(matchId));
    setResult('syncReplayResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnProgressionXp').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/progression/xp');
    setResult('progressionRewardsResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnRewardsDaily').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/rewards/daily');
    setResult('progressionRewardsResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnRewardsDailyClaim').addEventListener('click', async () => {
    const r = await api('POST', API_PREFIX + '/rewards/daily/claim', {});
    setResult('progressionRewardsResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnFraudCheck').addEventListener('click', async () => {
    const r = await api('POST', API_PREFIX + '/fraud/check', {});
    setResult('guardianShieldResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnAnticheatReport').addEventListener('click', async () => {
    const r = await api('POST', API_PREFIX + '/anticheat/report', { eventType: 'test', payload: {} });
    setResult('guardianShieldResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnSecurityEvent').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/security/status');
    setResult('guardianShieldResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnMessageList').addEventListener('click', async () => {
    const convId = (document.getElementById('socialConvId') as HTMLInputElement).value.trim() || 'default';
    const r = await api('GET', API_PREFIX + '/messages/' + encodeURIComponent(convId));
    setResult('socialResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnFeedList').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/feed/list');
    setResult('socialResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnPartyCreate').addEventListener('click', async () => {
    const r = await api('POST', API_PREFIX + '/party', {});
    setResult('socialResult', JSON.stringify(r.data, null, 2), !r.ok);
    const data = r.data as Record<string, unknown>;
    if (r.ok && data && typeof data.partyId === 'string') {
      (document.getElementById('socialPartyId') as HTMLInputElement).value = data.partyId;
    }
  });

  getEl('btnPartyState').addEventListener('click', async () => {
    const partyId = (document.getElementById('socialPartyId') as HTMLInputElement).value.trim();
    if (!partyId) {
      setResult('socialResult', 'Enter party ID first', true);
      return;
    }
    const r = await api('GET', API_PREFIX + '/party/' + encodeURIComponent(partyId));
    setResult('socialResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnNotificationList').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/notifications/list');
    setResult('socialResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnMarketplaceList').addEventListener('click', async () => {
    const r = await api('GET', API_PREFIX + '/marketplace/list');
    setResult('marketplaceTournamentResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  getEl('btnTournamentBracket').addEventListener('click', async () => {
    const tournamentId = (document.getElementById('tournamentId') as HTMLInputElement).value.trim();
    if (!tournamentId) {
      setResult('marketplaceTournamentResult', 'Enter tournament ID first', true);
      return;
    }
    const r = await api('GET', API_PREFIX + '/tournament/' + encodeURIComponent(tournamentId) + '/bracket');
    setResult('marketplaceTournamentResult', JSON.stringify(r.data, null, 2), !r.ok);
  });

  const params = new URLSearchParams(window.location.search);
  const apiBaseInput = document.getElementById('apiBase') as HTMLInputElement;
  if (params.get('apiBase')) apiBaseInput.value = params.get('apiBase') || 'http://localhost:8787';
  
  // Set default dates for compliance
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  (document.getElementById('complianceEndDate') as HTMLInputElement).value = today.toISOString().split('T')[0];
  (document.getElementById('complianceStartDate') as HTMLInputElement).value = thirtyDaysAgo.toISOString().split('T')[0];
  
  log('Test UI loaded. API base: ' + getApiBase() + ', user: ' + getUserId());
})();
