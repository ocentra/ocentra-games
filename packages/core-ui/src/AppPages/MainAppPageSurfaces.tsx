import { useMemo, useState, type ReactNode } from 'react';
import './MainAppPageSurfaces.css';

export type SocialFriend = { friendId: string };
export type SocialPartyMember = { userId: string };
export type SocialMessage = { messageId: string; senderId: string; content: string };
export type SocialNotification = { id: string; type: string; title: string; body: string; read: boolean };
export type SocialFeedItem = { id: string; type: string; payload: Record<string, unknown> };

export type LeaderboardRow = {
  user_id: string;
  rank: number;
  score: number;
  wins?: number;
  losses?: number;
};

export type TournamentRound = {
  round: number;
  matches?: unknown[];
};

export type PlayerHubProfile = Record<string, unknown>;
export type PlayerHubInventoryItem = { itemId: string; quantity: number };
export type PlayerHubMarketplaceListing = { id: string; title: string };

export type AdminUserRow = {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  isAdmin: boolean;
  lastLogin?: string | number | Date | null;
};

export type AdminActivityRow = {
  adminEmail: string;
  targetEmail: string;
  action: 'grant' | 'revoke';
  timestamp: string | number | Date;
};

export type ShopTab = 'Treasury' | 'Elite' | 'Vault' | 'Tickets';

export type ShopProduct = {
  productId: string;
  productType: 'AC_CREDITS' | 'SUBSCRIPTION' | 'TOURNAMENT_ENTRY' | 'MARKETPLACE';
  displayName: string;
  acAmount?: number;
  unitPriceCents?: number;
  currency: string;
  active: boolean;
};

function stringifyPayload(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload);
  } catch {
    return '';
  }
}

function formatValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function formatDate(value: string | number | Date | null | undefined): string {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Never' : date.toLocaleString();
}

function formatPrice(cents?: number): string {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

export function SocialPageContent({
  loading,
  error,
  presenceStatus,
  friends,
  partyId,
  partyMembers,
  messages,
  activeConversationId,
  notifications,
  feedItems,
  onRefresh,
  onMatchmaking,
  onLobby,
  onAddFriend,
  onRemoveFriend,
  onCreateParty,
  onLoadParty,
  onJoinParty,
  onLeaveParty,
  onInvite,
  onLoadMessages,
  onSendMessage,
  onMarkRead,
  onMarkAllNotificationsRead,
  onAppendActivity,
}: {
  loading: boolean;
  error: string | null;
  presenceStatus: string;
  friends: SocialFriend[];
  partyId: string;
  partyMembers: SocialPartyMember[];
  messages: SocialMessage[];
  activeConversationId: string;
  notifications: SocialNotification[];
  feedItems: SocialFeedItem[];
  onRefresh: () => void;
  onMatchmaking: () => void;
  onLobby: () => void;
  onAddFriend: (friendId: string) => void;
  onRemoveFriend: (friendId: string) => void;
  onCreateParty: () => void;
  onLoadParty: (partyId: string) => void;
  onJoinParty: (partyId: string) => void;
  onLeaveParty: () => void;
  onInvite: (inviteeId: string) => void;
  onLoadMessages: (conversationId: string) => void;
  onSendMessage: (conversationId: string, content: string) => void;
  onMarkRead: (conversationId: string, messageIds: string[]) => void;
  onMarkAllNotificationsRead: () => void;
  onAppendActivity: (type: string, payload: Record<string, unknown>) => void;
}) {
  const [friendInput, setFriendInput] = useState('');
  const [partyInput, setPartyInput] = useState('');
  const [inviteeInput, setInviteeInput] = useState('');
  const [conversationInput, setConversationInput] = useState(activeConversationId);
  const [messageInput, setMessageInput] = useState('');
  const [typeInput, setTypeInput] = useState('party.activity');
  const [payloadInput, setPayloadInput] = useState('');
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const messageIds = useMemo(() => messages.map((message) => message.messageId), [messages]);

  return (
    <main className="social-content">
      <section className="social-shell">
        <div className="social-toolbar">
          <h1 className="social-title">Community</h1>
          <div className="social-toolbar-actions">
            <button type="button" className="social-btn social-btn-secondary" onClick={onRefresh}>
              Refresh
            </button>
            <button type="button" className="social-btn social-btn-secondary" onClick={onMatchmaking}>
              Matchmaking
            </button>
            <button type="button" className="social-btn social-btn-secondary" onClick={onLobby}>
              Lobby
            </button>
          </div>
        </div>

        {error ? <div className="social-error">{error}</div> : null}
        {loading ? (
          <div className="social-loading">Loading social data...</div>
        ) : (
          <div className="social-grid">
            <section className="social-panel">
              <h2 className="social-panel-title">Friends</h2>
              <p className="social-panel-subtitle">Presence: {presenceStatus}</p>
              <div className="social-row">
                <input className="social-input" type="text" value={friendInput} placeholder="Friend user id" onChange={(event) => setFriendInput(event.target.value)} />
                <button type="button" className="social-btn social-btn-primary" onClick={() => { onAddFriend(friendInput); setFriendInput(''); }}>
                  Add
                </button>
              </div>
              <ul className="social-list">
                {friends.map((friend) => (
                  <li key={friend.friendId} className="social-list-item">
                    <span className="social-id">{friend.friendId}</span>
                    <button type="button" className="social-btn social-btn-secondary" onClick={() => onRemoveFriend(friend.friendId)}>
                      Remove
                    </button>
                  </li>
                ))}
                {friends.length === 0 ? <li className="social-empty">No friends yet</li> : null}
              </ul>
            </section>

            <section className="social-panel">
              <h2 className="social-panel-title">Party</h2>
              <p className="social-panel-subtitle">Current party: {partyId || '-'}</p>
              <div className="social-row social-wrap">
                <button type="button" className="social-btn social-btn-primary" onClick={onCreateParty}>Create</button>
                <input className="social-input" type="text" value={partyInput} placeholder="Party id" onChange={(event) => setPartyInput(event.target.value)} />
                <button type="button" className="social-btn social-btn-secondary" onClick={() => onLoadParty(partyInput)}>Load</button>
                <button type="button" className="social-btn social-btn-secondary" onClick={() => onJoinParty(partyInput)}>Join</button>
                <button type="button" className="social-btn social-btn-secondary" onClick={onLeaveParty}>Leave</button>
              </div>
              <div className="social-row">
                <input className="social-input" type="text" value={inviteeInput} placeholder="Invitee user id" onChange={(event) => setInviteeInput(event.target.value)} />
                <button type="button" className="social-btn social-btn-primary" onClick={() => { onInvite(inviteeInput); setInviteeInput(''); }}>Invite</button>
              </div>
              <ul className="social-list">
                {partyMembers.map((member) => <li key={member.userId} className="social-list-item"><span className="social-id">{member.userId}</span></li>)}
                {partyMembers.length === 0 ? <li className="social-empty">No party members</li> : null}
              </ul>
            </section>

            <section className="social-panel">
              <h2 className="social-panel-title">Messages</h2>
              <p className="social-panel-subtitle">Conversation: {activeConversationId}</p>
              <div className="social-row social-wrap">
                <input className="social-input" type="text" value={conversationInput} placeholder="Conversation id" onChange={(event) => setConversationInput(event.target.value)} />
                <button type="button" className="social-btn social-btn-secondary" onClick={() => onLoadMessages(conversationInput)}>Load</button>
                <button type="button" className="social-btn social-btn-secondary" onClick={() => onMarkRead(activeConversationId, messageIds)}>Mark Read</button>
              </div>
              <div className="social-row">
                <input className="social-input" type="text" value={messageInput} placeholder="Type message" onChange={(event) => setMessageInput(event.target.value)} />
                <button type="button" className="social-btn social-btn-primary" onClick={() => { onSendMessage(conversationInput, messageInput); setMessageInput(''); }}>Send</button>
              </div>
              <ul className="social-list">
                {messages.map((message) => (
                  <li key={message.messageId} className="social-list-item social-list-item-block">
                    <span className="social-id">{message.senderId}</span>
                    <span>{message.content}</span>
                  </li>
                ))}
                {messages.length === 0 ? <li className="social-empty">No messages</li> : null}
              </ul>
            </section>

            <section className="social-panel">
              <div className="social-panel-header">
                <h2 className="social-panel-title">Notifications</h2>
                <button type="button" className="social-btn social-btn-secondary" onClick={onMarkAllNotificationsRead} disabled={unreadCount === 0}>
                  Mark All Read
                </button>
              </div>
              <p className="social-panel-subtitle">Unread: <strong>{unreadCount}</strong></p>
              <ul className="social-list">
                {notifications.map((notification) => (
                  <li key={notification.id} className={`social-list-item social-list-item-block ${notification.read ? 'social-item-muted' : ''}`}>
                    <span className="social-id">{notification.type}</span>
                    <span>{notification.title}</span>
                    <span className="social-text-muted">{notification.body}</span>
                  </li>
                ))}
                {notifications.length === 0 ? <li className="social-empty">No notifications</li> : null}
              </ul>
            </section>

            <section className="social-panel">
              <h2 className="social-panel-title">Activity Feed</h2>
              <div className="social-row social-wrap">
                <input className="social-input" type="text" value={typeInput} placeholder="Activity type" onChange={(event) => setTypeInput(event.target.value)} />
                <input className="social-input" type="text" value={payloadInput} placeholder="Payload text" onChange={(event) => setPayloadInput(event.target.value)} />
                <button type="button" className="social-btn social-btn-primary" onClick={() => { onAppendActivity(typeInput, { text: payloadInput }); setPayloadInput(''); }}>Append</button>
              </div>
              <ul className="social-list">
                {feedItems.map((item) => (
                  <li key={item.id} className="social-list-item social-list-item-block">
                    <span className="social-id">{item.type}</span>
                    <span className="social-text-muted">{stringifyPayload(item.payload)}</span>
                  </li>
                ))}
                {feedItems.length === 0 ? <li className="social-empty">No feed items</li> : null}
              </ul>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

export function CompetitionPageContent({
  loading,
  registering,
  error,
  gameType,
  seasonId,
  lastUpdated,
  leaderboardEntries,
  showPersonalizedStats,
  userEntry,
  nearbyAbove,
  nearbyBelow,
  tournamentId,
  tournamentRounds,
  onRefreshLeaderboard,
  onLoadBracket,
  onRegister,
  onMatchmaking,
}: {
  loading: boolean;
  registering: boolean;
  error: string | null;
  gameType: number;
  seasonId: string;
  lastUpdated: string;
  leaderboardEntries: LeaderboardRow[];
  showPersonalizedStats: boolean;
  userEntry: LeaderboardRow | null;
  nearbyAbove: LeaderboardRow[];
  nearbyBelow: LeaderboardRow[];
  tournamentId: string;
  tournamentRounds: TournamentRound[];
  onRefreshLeaderboard: (gameType: number) => void;
  onLoadBracket: (tournamentId: string) => void;
  onRegister: (tournamentId: string) => void;
  onMatchmaking: () => void;
}) {
  const [gameTypeInput, setGameTypeInput] = useState(String(gameType));
  const [tournamentInput, setTournamentInput] = useState(tournamentId);

  return (
    <main className="cp-content">
      <section className="cp-shell">
        <div className="cp-toolbar">
          <h1 className="cp-title">Competitive Play</h1>
          <div className="cp-toolbar-actions">
            <button type="button" className="cp-btn cp-btn-secondary" onClick={() => onRefreshLeaderboard(gameType)}>Refresh</button>
            <button type="button" className="cp-btn cp-btn-secondary" onClick={onMatchmaking}>Matchmaking</button>
          </div>
        </div>
        {error ? <div className="cp-error">{error}</div> : null}
        {loading ? (
          <div className="cp-loading">Loading competition data...</div>
        ) : (
          <div className="cp-grid">
            <section className="cp-panel">
              <h2 className="cp-panel-title">Leaderboard</h2>
              <p className="cp-panel-subtitle">Season: <strong>{seasonId || '-'}</strong> | Updated: <strong>{lastUpdated || '-'}</strong></p>
              <div className="cp-row cp-wrap">
                <input className="cp-input" type="number" min={1} value={gameTypeInput} onChange={(event) => setGameTypeInput(event.target.value)} placeholder="Game type id" />
                <button type="button" className="cp-btn cp-btn-primary" onClick={() => { const nextGameType = Number(gameTypeInput); if (Number.isFinite(nextGameType)) onRefreshLeaderboard(nextGameType); }}>Load</button>
              </div>
              <ul className="cp-list">
                {leaderboardEntries.slice(0, 10).map((entry) => (
                  <li key={`${entry.user_id}-${entry.rank}`} className="cp-list-item">
                    <span className="cp-rank">#{entry.rank}</span>
                    <span className="cp-id">{entry.user_id}</span>
                    <span className="cp-score">{entry.score}</span>
                  </li>
                ))}
                {leaderboardEntries.length === 0 ? <li className="cp-empty">No leaderboard entries</li> : null}
              </ul>
              {showPersonalizedStats ? (
                <div className="cp-metrics">
                  <div className="cp-metric-block">
                    <h3 className="cp-metric-title">My Rank</h3>
                    {userEntry ? (
                      <div className="cp-metric-content">
                        <span>Rank: {userEntry.rank}</span>
                        <span>Score: {userEntry.score}</span>
                        <span>W/L: {userEntry.wins ?? 0}/{userEntry.losses ?? 0}</span>
                      </div>
                    ) : <p className="cp-empty">No personal rank</p>}
                  </div>
                  <div className="cp-metric-block">
                    <h3 className="cp-metric-title">Nearby</h3>
                    {nearbyAbove.length > 0 || nearbyBelow.length > 0 ? (
                      <ul className="cp-inline-list">
                        {[...nearbyAbove, ...nearbyBelow].map((entry) => <li key={`${entry.user_id}-${entry.rank}`} className="cp-inline-list-item">#{entry.rank} {entry.user_id}</li>)}
                      </ul>
                    ) : <p className="cp-empty">No nearby ranks</p>}
                  </div>
                </div>
              ) : <div className="cp-callout">Sign in with a real account to see your rank and nearby standings.</div>}
            </section>

            <section className="cp-panel">
              <h2 className="cp-panel-title">Tournament</h2>
              <p className="cp-panel-subtitle">Tournament ID: {tournamentId || '-'}</p>
              <div className="cp-row cp-wrap">
                <input className="cp-input" type="text" value={tournamentInput} placeholder="Tournament id" onChange={(event) => setTournamentInput(event.target.value)} />
                <button type="button" className="cp-btn cp-btn-secondary" onClick={() => onLoadBracket(tournamentInput)}>Load Bracket</button>
                <button type="button" className="cp-btn cp-btn-primary" disabled={registering} onClick={() => onRegister(tournamentInput)}>
                  {registering ? 'Registering...' : 'Register'}
                </button>
              </div>
              {tournamentRounds.length > 0 ? (
                <ul className="cp-list">
                  {tournamentRounds.map((round, index) => (
                    <li key={`${round.round}-${index}`} className="cp-list-item cp-list-item-block">
                      <span className="cp-id">Round {round.round}</span>
                      <span className="cp-score">Matches: {Array.isArray(round.matches) ? round.matches.length : 0}</span>
                    </li>
                  ))}
                </ul>
              ) : <div className="cp-empty">No tournament bracket loaded</div>}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

export function PlayerHubPageContent({
  loading,
  error,
  targetUserId,
  profile,
  inventoryItems,
  marketplaceListings,
  onRefresh,
  onShop,
  onSettings,
  onLoadUser,
}: {
  loading: boolean;
  error: string | null;
  targetUserId: string;
  profile: PlayerHubProfile | null;
  inventoryItems: PlayerHubInventoryItem[];
  marketplaceListings: PlayerHubMarketplaceListing[];
  onRefresh: () => void;
  onShop: () => void;
  onSettings: () => void;
  onLoadUser: (userId: string) => void;
}) {
  const [userInput, setUserInput] = useState(targetUserId);
  const profileRows = profile ? Object.entries(profile).slice(0, 8) : [];

  return (
    <main className="ph-content">
      <section className="ph-shell">
        <div className="ph-toolbar">
          <h1 className="ph-title">Player Hub</h1>
          <div className="ph-toolbar-actions">
            <button type="button" className="ph-btn ph-btn-secondary" onClick={onRefresh}>Refresh</button>
            <button type="button" className="ph-btn ph-btn-secondary" onClick={onShop}>Shop</button>
            <button type="button" className="ph-btn ph-btn-secondary" onClick={onSettings}>Settings</button>
          </div>
        </div>
        {error ? <div className="ph-error">{error}</div> : null}
        {loading ? (
          <div className="ph-loading">Loading player hub data...</div>
        ) : (
          <div className="ph-grid">
            <section className="ph-panel">
              <h2 className="ph-panel-title">Profile</h2>
              <p className="ph-panel-subtitle">User ID: {targetUserId || '-'}</p>
              <div className="ph-row">
                <input className="ph-input" type="text" value={userInput} placeholder="User id" onChange={(event) => setUserInput(event.target.value)} />
                <button type="button" className="ph-btn ph-btn-primary" onClick={() => onLoadUser(userInput)}>Load</button>
              </div>
              <ul className="ph-list">
                {profileRows.map(([key, value]) => (
                  <li key={key} className="ph-list-item ph-list-item-block">
                    <span className="ph-key">{key}</span>
                    <span className="ph-value">{formatValue(value)}</span>
                  </li>
                ))}
                {profileRows.length === 0 ? <li className="ph-empty">No profile loaded</li> : null}
              </ul>
            </section>
            <section className="ph-panel">
              <h2 className="ph-panel-title">Inventory</h2>
              <p className="ph-panel-subtitle">Owned items and quantities.</p>
              <ul className="ph-list">
                {inventoryItems.map((item) => <li key={item.itemId} className="ph-list-item"><span className="ph-id">{item.itemId}</span><span className="ph-value">x{item.quantity}</span></li>)}
                {inventoryItems.length === 0 ? <li className="ph-empty">No inventory items</li> : null}
              </ul>
            </section>
            <section className="ph-panel">
              <h2 className="ph-panel-title">Marketplace</h2>
              <p className="ph-panel-subtitle">Current listings available in the market.</p>
              <ul className="ph-list">
                {marketplaceListings.map((listing) => (
                  <li key={listing.id} className="ph-list-item ph-list-item-block">
                    <span className="ph-id">{listing.id}</span>
                    <span className="ph-value">{listing.title}</span>
                  </li>
                ))}
                {marketplaceListings.length === 0 ? <li className="ph-empty">No marketplace listings</li> : null}
              </ul>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

export function SettingsPageToolbar({
  activeTab,
  showAssetsTab,
  onTabChange,
}: {
  activeTab: string;
  showAssetsTab: boolean;
  onTabChange: (tab: 'models' | 'inference' | 'providers' | 'native' | 'assets') => void;
}) {
  const tabs: Array<{ id: 'models' | 'inference' | 'providers' | 'native' | 'assets'; label: string; visible: boolean }> = [
    { id: 'models', label: 'Models', visible: true },
    { id: 'inference', label: 'Inference', visible: true },
    { id: 'providers', label: 'Providers', visible: true },
    { id: 'native', label: 'Native', visible: true },
    { id: 'assets', label: 'Assets', visible: showAssetsTab },
  ];
  return (
    <div className="settings-toolbar">
      {tabs.filter((tab) => tab.visible).map((tab) => (
        <button key={tab.id} className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => onTabChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPageContent({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="settings-page__work">
      <section className="settings-content">{children}</section>
      {footer ? <div className="settings-footer">{footer}</div> : null}
    </main>
  );
}

export function AdminUsersPageContent({
  permissionDenied,
  users,
  activities,
  loading,
  searchQuery,
  selectedUser,
  pendingAction,
  onSearchChange,
  onRefresh,
  onToggleAdmin,
  onCancelDialog,
  onConfirmDialog,
  currentUserId,
}: {
  permissionDenied: boolean;
  users: AdminUserRow[];
  activities: AdminActivityRow[];
  loading: boolean;
  searchQuery: string;
  selectedUser: AdminUserRow | null;
  pendingAction: 'grant' | 'revoke' | null;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onToggleAdmin: (user: AdminUserRow) => void;
  onCancelDialog: () => void;
  onConfirmDialog: () => void;
  currentUserId?: string;
}) {
  const filteredUsers = users.filter((user) => user.email.toLowerCase().includes(searchQuery.toLowerCase()) || user.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
  const showConfirmDialog = Boolean(selectedUser && pendingAction);

  return (
    <>
      <div className="admin-users-main">
        <div className="admin-users-content">
          {permissionDenied ? <div className="cp-error">Admin user list is unavailable in this runtime due to Firebase permissions.</div> : null}
          <div className="admin-search-section">
            <div className="admin-search-container">
              <span className="search-icon">Search</span>
              <input type="text" className="admin-search-input" placeholder="Search users by email or name..." value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} />
              {searchQuery ? <button className="search-clear-button" onClick={() => onSearchChange('')} title="Clear search">x</button> : null}
            </div>
          </div>
          <div className="admin-stats-grid">
            <div className="admin-stat-card"><div className="stat-icon">Users</div><div className="stat-content"><div className="stat-value">{users.length}</div><div className="stat-label">Total Users</div></div></div>
            <div className="admin-stat-card admin-stat-card--highlight"><div className="stat-icon">Admins</div><div className="stat-content"><div className="stat-value">{users.filter((user) => user.isAdmin).length}</div><div className="stat-label">Administrators</div></div></div>
            <div className="admin-stat-card"><div className="stat-icon">Audit</div><div className="stat-content"><div className="stat-value">{activities.length}</div><div className="stat-label">Recent Actions</div></div></div>
          </div>
          <div className="admin-section">
            <div className="admin-section-header">
              <h2 className="admin-section-title">Users {searchQuery ? <span className="search-results-count">({filteredUsers.length} results)</span> : null}</h2>
              <button className="admin-action-button admin-action-button--refresh" onClick={onRefresh} disabled={loading} title="Refresh users">Refresh</button>
            </div>
            {loading ? (
              <div className="admin-loading"><div className="loading-spinner" /><div className="loading-text">Loading users...</div></div>
            ) : (
              <div className="admin-users-table-container">
                <table className="admin-users-table">
                  <thead><tr><th>User</th><th>Email</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={5} className="no-results">{searchQuery ? 'No users found matching your search' : 'No users available'}</td></tr>
                    ) : filteredUsers.map((userData) => (
                      <tr key={userData.uid} className="user-row">
                        <td>
                          <div className="user-info">
                            <div className="user-avatar">
                              {userData.photoURL ? <img src={userData.photoURL} alt={userData.displayName} /> : <div className="user-avatar-placeholder">{userData.displayName.charAt(0).toUpperCase()}</div>}
                            </div>
                            <div className="user-details"><div className="user-name">{userData.displayName}</div><div className="user-uid">{userData.uid}</div></div>
                          </div>
                        </td>
                        <td><div className="user-email">{userData.email}</div></td>
                        <td><div className={`user-status-badge ${userData.isAdmin ? 'user-status-badge--admin' : 'user-status-badge--user'}`}>{userData.isAdmin ? 'Admin' : 'User'}</div></td>
                        <td><div className="user-last-login">{formatDate(userData.lastLogin)}</div></td>
                        <td>
                          <button className={`admin-toggle-button ${userData.isAdmin ? 'admin-toggle-button--revoke' : 'admin-toggle-button--grant'}`} onClick={() => onToggleAdmin(userData)} disabled={userData.uid === currentUserId}>
                            {userData.isAdmin ? 'Revoke' : 'Grant'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="admin-section">
            <div className="admin-section-header"><h2 className="admin-section-title">Activity Log</h2></div>
            {activities.length === 0 ? (
              <div className="admin-empty-state"><div className="empty-state-icon">No activity</div><div className="empty-state-text">No activity recorded yet</div></div>
            ) : (
              <div className="admin-activity-list">
                {activities.map((activity, index) => (
                  <div key={`${activity.adminEmail}-${activity.targetEmail}-${index}`} className="activity-item">
                    <div className="activity-icon">{activity.action === 'grant' ? '+' : '-'}</div>
                    <div className="activity-content">
                      <div className="activity-description"><strong>{activity.adminEmail}</strong>{activity.action === 'grant' ? ' granted admin privileges to ' : ' revoked admin privileges from '}<strong>{activity.targetEmail}</strong></div>
                      <div className="activity-timestamp">{formatDate(activity.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {showConfirmDialog && selectedUser ? (
        <>
          <div className="admin-dialog-overlay" onClick={onCancelDialog} onKeyDown={(event) => event.key === 'Escape' && onCancelDialog()} role="button" tabIndex={0} aria-label="Close dialog" />
          <div className="admin-dialog">
            <div className="admin-dialog-header"><h3>{pendingAction === 'grant' ? 'Grant Admin Privileges' : 'Revoke Admin Privileges'}</h3></div>
            <div className="admin-dialog-content">
              <p>Are you sure you want to <strong>{pendingAction}</strong> admin privileges {pendingAction === 'grant' ? 'to' : 'from'}:</p>
              <div className="confirm-user-info"><div className="confirm-user-name">{selectedUser.displayName}</div><div className="confirm-user-email">{selectedUser.email}</div></div>
              <div className="admin-dialog-warning">This action will be logged and can be audited.</div>
            </div>
            <div className="admin-dialog-actions">
              <button className="admin-dialog-button admin-dialog-button--cancel" onClick={onCancelDialog}>Cancel</button>
              <button className={`admin-dialog-button ${pendingAction === 'grant' ? 'admin-dialog-button--confirm-grant' : 'admin-dialog-button--confirm-revoke'}`} onClick={onConfirmDialog}>
                {pendingAction === 'grant' ? 'Grant Admin' : 'Revoke Admin'}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

const SHOP_TABS: { id: ShopTab; icon: string; label: string }[] = [
  { id: 'Treasury', icon: '💎', label: 'Treasury' },
  { id: 'Elite', icon: '🏆', label: 'Elite' },
  { id: 'Vault', icon: '📦', label: 'Vault' },
  { id: 'Tickets', icon: '🎟️', label: 'Tickets' },
];

const SHOP_AC_META: Record<string, {
  icon: string;
  tagline: string;
  badge?: string;
  badgeVariant?: 'gold' | 'blue' | 'green';
  savingsLabel?: string;
  perAcRate: string;
}> = {
  'ac-100': { icon: '🪙', tagline: 'Dip your toes in. One coaching session.', perAcRate: '$0.010/AC' },
  'ac-500': { icon: '💰', tagline: 'Regular competitive play. Always top up fast.', perAcRate: '$0.010/AC', badge: 'Popular', badgeVariant: 'blue' },
  'ac-1200': { icon: '💎', tagline: 'Stock up. Never run out mid-match.', perAcRate: '$0.008/AC', badge: 'Best Value', badgeVariant: 'gold', savingsLabel: 'Save 20%' },
  'ac-3500': { icon: '🏅', tagline: 'Serious players go deep. Full season supply.', perAcRate: '$0.007/AC', savingsLabel: 'Save 30%' },
};

const SHOP_SUB_FEATURES = [
  { key: 'tokens', label: 'AI tokens / month', free: '10k', pro: '100k', champion: '500k', founder: '500k forever' },
  { key: 'ads', label: 'Ad-free experience', free: '✗', pro: '✓', champion: '✓', founder: '✓' },
  { key: 'analysis', label: 'Post-match AI summary', free: '✗', pro: '✓', champion: '✓', founder: '✓' },
  { key: 'thoughts', label: 'AI thought process', free: '✗', pro: '✓', champion: '✓', founder: '✓' },
  { key: 'coaching', label: 'Deep coaching mode', free: '✗', pro: '✗', champion: '✓', founder: '✓' },
  { key: 'board', label: 'Leaderboard', free: '✗', pro: '✓', champion: '✓', founder: '✓' },
  { key: 'badges', label: 'Profile badges', free: '✗', pro: '✓', champion: '✓ Animated', founder: '✓ Founder' },
  { key: 'early', label: 'Early access / beta', free: '✗', pro: '✗', champion: '✓', founder: '✓' },
  { key: 'byok', label: 'Bring your own API key', free: '✓', pro: '✓', champion: '✓', founder: '✓' },
];

const SHOP_VAULT_META: Record<string, { icon: string; description: string; acCost: number; gradient: string }> = {
  'vault-card-back-neon': { icon: '🃏', description: 'Electric neon card backs. Stand out at every table.', acCost: 200, gradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
  'vault-card-back-royal': { icon: '🎨', description: 'Regal velvet card backs. Classic prestige.', acCost: 150, gradient: 'linear-gradient(135deg, #3a1c71, #d76d77, #ffaf7b)' },
  'vault-table-classic': { icon: '🪵', description: 'Classic felt table. The way cards were meant to be.', acCost: 100, gradient: 'linear-gradient(135deg, #134e5e, #71b280)' },
};

const SHOP_AC_USES = [
  { icon: '⚡', action: 'AI move hint', cost: '15 AC' },
  { icon: '📊', action: 'Post-match summary', cost: '60 AC' },
  { icon: '🎓', action: 'Deep coaching session', cost: '150 AC' },
  { icon: '🤖', action: 'AI vs AI full match', cost: '700 AC' },
];

const SHOP_TOUR_FEATURES = [
  { icon: '🎯', text: 'Entry fee in AC. Winner takes the pool minus 10% rake' },
  { icon: '🏆', text: 'Ranked brackets across all 500+ card game variants' },
  { icon: '💰', text: 'Top finishers earn back 5-10x their entry fee' },
  { icon: '📋', text: 'Skill-game model. Legal in most supported jurisdictions' },
];

export function ShopPageToolbar({
  activeTab,
  acBalance,
  onTabChange,
}: {
  activeTab: ShopTab;
  acBalance: number;
  onTabChange: (tab: ShopTab) => void;
}) {
  return (
    <div className="sp-tabs">
      <div className="sp-tabs-inner">
        <div className="sp-tab-group">
          {SHOP_TABS.map((tab) => (
            <button key={tab.id} className={`sp-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => onTabChange(tab.id)}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>
        <div className="sp-wallet-pill">
          <span className="sp-wallet-icon">🪙</span>
          <span className="sp-wallet-bal">{acBalance.toLocaleString()}</span>
          <span className="sp-wallet-label">AC</span>
        </div>
      </div>
    </div>
  );
}

export function ShopPageContent({
  activeTab,
  products,
  loadingProducts,
  loadingId,
  error,
  acBalance,
  onClearError,
  onBuy,
}: {
  activeTab: ShopTab;
  products: ShopProduct[];
  loadingProducts: boolean;
  loadingId: string | null;
  error: string | null;
  acBalance: number;
  onClearError: () => void;
  onBuy: (product: ShopProduct) => void;
}) {
  const acProducts = products.filter((product) => product.productType === 'AC_CREDITS');
  const subProducts = products.filter((product) => product.productType === 'SUBSCRIPTION');
  const vaultProducts = products.filter((product) => product.productType === 'MARKETPLACE');
  const sub = (id: string) => subProducts.find((product) => product.productId === id);
  const arenaPass = sub('sub-arena-pass');
  const championsPass = sub('sub-champions-pass');
  const founder = sub('sub-founder');

  return (
    <div className="sp-content">
      {error ? <div className="sp-error">{error} <button onClick={onClearError}>✕</button></div> : null}
      {activeTab === 'Treasury' ? (
        <div className="sp-treasury">
          <div className="sp-hero sp-hero-row">
            <div>
              <div className="sp-hero-eyebrow">⚡ Arena Credits</div>
              <h1 className="sp-hero-title">Power your AI game</h1>
              <p className="sp-hero-sub">
                Buy AC once, use it for post-match breakdowns, coaching, and AI matches.
                No subscription needed. Pay for what you play.
              </p>
            </div>
            <div className="sp-byok-note"><span>🔑</span> Using your own API key or a local model? Zero AC cost.</div>
          </div>
          {loadingProducts ? (
            <div className="sp-ac-grid">
              {[1, 2, 3, 4].map((item) => <div key={item} className="sp-ac-card sp-skeleton" style={{ minHeight: 300 }} />)}
            </div>
          ) : (
            <div className="sp-ac-grid">
              {acProducts.map((product) => {
                const meta = SHOP_AC_META[product.productId];
                const isBest = product.productId === 'ac-1200';
                return (
                  <div key={product.productId} className={`sp-ac-card ${isBest ? 'sp-ac-featured' : ''}`}>
                    {meta?.badge ? <div className={`sp-badge sp-badge-${meta.badgeVariant ?? 'blue'}`}>{meta.badge}</div> : null}
                    <div className="sp-ac-icon-wrap">
                      <span className="sp-ac-icon">{meta?.icon ?? '🪙'}</span>
                      <div className="sp-ac-icon-glow" />
                    </div>
                    <div className="sp-ac-amount">{product.acAmount?.toLocaleString()}<span className="sp-ac-unit">AC</span></div>
                    <div className="sp-ac-tagline">{meta?.tagline ?? product.displayName}</div>
                    <div className="sp-ac-rate">{meta?.perAcRate ?? '$0.010/AC'} per credit</div>
                    {meta?.savingsLabel ? <div className="sp-ac-savings">{meta.savingsLabel}</div> : null}
                    <div className="sp-ac-price">{formatPrice(product.unitPriceCents)}</div>
                    <button className="sp-buy-btn" disabled={loadingId !== null} onClick={() => onBuy(product)}>
                      {loadingId === product.productId ? <span className="sp-spinner" /> : 'RELOAD AC'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="sp-ac-uses">
            <div className="sp-ac-uses-header">
              <span>💡</span>
              <h3 className="sp-ac-uses-title">What does 1 AC buy you?</h3>
            </div>
            <div className="sp-ac-uses-grid">
              {SHOP_AC_USES.map((item) => (
                <div key={item.action} className="sp-use-item">
                  <span className="sp-use-icon">{item.icon}</span>
                  <span className="sp-use-action">{item.action}</span>
                  <span className="sp-use-cost">{item.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {activeTab === 'Elite' ? (
        <div className="sp-elite">
          <div className="sp-hero">
            <div className="sp-hero-eyebrow">🏆 Membership</div>
            <h1 className="sp-hero-title sp-hero-title-purple">Unlock your competitive edge</h1>
            <p className="sp-hero-sub">
              Stop playing blind. Elite members get full AI coaching, post-match breakdowns,
              and priority access to everything we build next.
            </p>
          </div>
          {loadingProducts ? (
            <div className="sp-tier-grid">
              {[1, 2, 3, 4].map((item) => <div key={item} className="sp-tier-card sp-skeleton" style={{ minHeight: 440 }} />)}
            </div>
          ) : (
            <>
              <div className="sp-tier-grid">
                <div className="sp-tier-card sp-tier-free">
                  <div className="sp-tier-header">
                    <span className="sp-tier-icon">🎮</span>
                    <h2 className="sp-tier-name">Free</h2>
                    <div className="sp-tier-price-wrap"><span className="sp-tier-price sp-tier-price-free">$0</span><span className="sp-tier-period">/mo</span></div>
                    <p className="sp-tier-desc">Ad-supported. BYOK / local AI. Great way to start.</p>
                  </div>
                  <ul className="sp-tier-features">
                    <li className="feat-yes">Play all 500+ card games</li>
                    <li className="feat-yes">BYOK / local AI (zero AC cost)</li>
                    <li className="feat-yes">10k AI tokens/mo included</li>
                    <li className="feat-no">Ads shown during play</li>
                    <li className="feat-no">No post-match analysis</li>
                    <li className="feat-no">No leaderboard ranking</li>
                  </ul>
                  <button className="sp-tier-btn sp-tier-btn-ghost" disabled>Current Plan</button>
                </div>
                {arenaPass ? (
                  <div className="sp-tier-card sp-tier-pro">
                    <div className="sp-badge sp-badge-blue sp-tier-badge">Most Popular</div>
                    <div className="sp-tier-header">
                      <span className="sp-tier-icon">🏆</span>
                      <h2 className="sp-tier-name">Arena Pass</h2>
                      <div className="sp-tier-price-wrap"><span className="sp-tier-price">{formatPrice(arenaPass.unitPriceCents)}</span><span className="sp-tier-period">/mo</span></div>
                      <p className="sp-tier-desc">No ads. Full AI coaching after every match.</p>
                    </div>
                    <ul className="sp-tier-features">
                      <li className="feat-yes">Everything in Free</li>
                      <li className="feat-yes"><strong>No ads. Ever.</strong></li>
                      <li className="feat-yes"><strong>100k AI tokens/mo</strong></li>
                      <li className="feat-yes">Post-match AI breakdown</li>
                      <li className="feat-yes">AI thought-process viewer</li>
                      <li className="feat-yes">Leaderboard access</li>
                      <li className="feat-yes">Profile badges</li>
                      <li className="feat-no">Deep coaching mode</li>
                      <li className="feat-no">Early access features</li>
                    </ul>
                    <button className="sp-tier-btn sp-tier-btn-pro" disabled={loadingId !== null} onClick={() => onBuy(arenaPass)}>
                      {loadingId === arenaPass.productId ? <span className="sp-spinner" /> : `Subscribe - ${formatPrice(arenaPass.unitPriceCents)}/mo`}
                    </button>
                  </div>
                ) : null}
                {championsPass ? (
                  <div className="sp-tier-card sp-tier-champion">
                    <div className="sp-tier-header">
                      <span className="sp-tier-icon">🎖️</span>
                      <h2 className="sp-tier-name">Champion&apos;s Pass</h2>
                      <div className="sp-tier-price-wrap"><span className="sp-tier-price">{formatPrice(championsPass.unitPriceCents)}</span><span className="sp-tier-period">/mo</span></div>
                      <p className="sp-tier-desc">Deep coaching, early access, max prestige.</p>
                    </div>
                    <ul className="sp-tier-features">
                      <li className="feat-yes">Everything in Arena Pass</li>
                      <li className="feat-yes"><strong>500k AI tokens/mo</strong></li>
                      <li className="feat-yes"><strong>Deep coaching mode</strong></li>
                      <li className="feat-yes">Animated badges + frames</li>
                      <li className="feat-yes">Early access / beta</li>
                      <li className="feat-yes">Tournament priority when live</li>
                    </ul>
                    <button className="sp-tier-btn sp-tier-btn-champion" disabled={loadingId !== null} onClick={() => onBuy(championsPass)}>
                      {loadingId === championsPass.productId ? <span className="sp-spinner" /> : `Subscribe - ${formatPrice(championsPass.unitPriceCents)}/mo`}
                    </button>
                  </div>
                ) : null}
                {founder ? (
                  <div className="sp-tier-card sp-tier-founder">
                    <div className="sp-badge sp-badge-gold sp-tier-badge">Limited · 500 Slots</div>
                    <div className="sp-tier-header">
                      <span className="sp-tier-icon">🌟</span>
                      <h2 className="sp-tier-name">Founder</h2>
                      <div className="sp-tier-price-wrap"><span className="sp-tier-price">${((founder.unitPriceCents ?? 0) / 100).toFixed(0)}</span><span className="sp-tier-period"> one-time</span></div>
                      <p className="sp-tier-desc">Lifetime Champion&apos;s access. Rare. Closes at 500 members.</p>
                    </div>
                    <ul className="sp-tier-features">
                      <li className="feat-yes">Champion&apos;s Pass <strong>for life</strong></li>
                      <li className="feat-yes">500k AI tokens/mo, forever</li>
                      <li className="feat-yes">Permanent <strong>Founder</strong> badge</li>
                      <li className="feat-yes">Roadmap input + Discord role</li>
                      <li className="feat-yes">Pays back vs Champion&apos;s in about 8 months</li>
                      <li className="feat-yes">Never available again after 500 slots</li>
                    </ul>
                    <button className="sp-tier-btn sp-tier-btn-founder" disabled={loadingId !== null} onClick={() => onBuy(founder)}>
                      {loadingId === founder.productId ? <span className="sp-spinner" /> : `Claim Founder Slot - $${((founder.unitPriceCents ?? 0) / 100).toFixed(0)}`}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="sp-compare-wrap">
                <div className="sp-compare-title">Full feature comparison</div>
                <div className="sp-compare-table">
                  <div className="sp-compare-header">
                    <div className="sp-compare-feature-col">Feature</div>
                    <div className="sp-compare-col">Free</div>
                    <div className="sp-compare-col sp-col-pro">Arena Pass</div>
                    <div className="sp-compare-col sp-col-champion">Champion&apos;s</div>
                    <div className="sp-compare-col sp-col-founder">Founder</div>
                  </div>
                  {SHOP_SUB_FEATURES.map((row) => (
                    <div key={row.key} className="sp-compare-row">
                      <div className="sp-compare-feature-col">{row.label}</div>
                      <div className={`sp-compare-col ${row.free === '✗' ? 'cell-no' : 'cell-yes'}`}>{row.free}</div>
                      <div className={`sp-compare-col sp-col-pro ${row.pro.startsWith('✗') ? 'cell-no' : 'cell-yes'}`}>{row.pro}</div>
                      <div className={`sp-compare-col sp-col-champion ${row.champion.startsWith('✗') ? 'cell-no' : 'cell-yes'}`}>{row.champion}</div>
                      <div className={`sp-compare-col sp-col-founder ${row.founder.startsWith('✗') ? 'cell-no' : 'cell-yes'}`}>{row.founder}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
      {activeTab === 'Vault' ? (
        <div className="sp-vault">
          <div className="sp-hero sp-hero-row">
            <div>
              <div className="sp-hero-eyebrow">🎨 Cosmetics</div>
              <h1 className="sp-hero-title sp-hero-title-gold">The Vault</h1>
              <p className="sp-hero-sub">
                Unlock cosmetics permanently with Arena Credits. No real money needed.
                Earn AC by playing or top up above.
              </p>
            </div>
            <div className="sp-byok-note"><span>🪙</span> Balance: <strong>{acBalance.toLocaleString()} AC</strong></div>
          </div>
          {loadingProducts ? (
            <div className="sp-vault-grid">
              {[1, 2, 3].map((item) => <div key={item} className="sp-vault-card sp-skeleton" style={{ height: 280 }} />)}
            </div>
          ) : (
            <div className="sp-vault-grid">
              {vaultProducts.map((product) => {
                const meta = SHOP_VAULT_META[product.productId];
                const cost = meta?.acCost ?? 0;
                const canAfford = acBalance >= cost;
                return (
                  <div key={product.productId} className="sp-vault-card">
                    <div className="sp-vault-preview" style={{ background: meta?.gradient ?? 'var(--sp-panel)' }}>
                      <span className="sp-vault-preview-icon">{meta?.icon ?? '🎮'}</span>
                    </div>
                    <div className="sp-vault-body">
                      <h3 className="sp-vault-name">{product.displayName}</h3>
                      <p className="sp-vault-desc">{meta?.description ?? 'Permanent cosmetic item.'}</p>
                      <div className="sp-vault-footer">
                        <div className="sp-vault-cost"><span className="sp-vault-cost-icon">🪙</span><span className="sp-vault-cost-val">{cost} AC</span></div>
                        <button className={`sp-vault-btn ${!canAfford ? 'sp-vault-btn-locked' : ''}`} disabled={!canAfford || loadingId !== null} title={!canAfford ? `Need ${cost - acBalance} more AC` : undefined} onClick={() => canAfford && onBuy(product)}>
                          {!canAfford ? `🔒 Need ${cost - acBalance} more` : 'UNLOCK'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="sp-vault-note">
            Cosmetics unlock permanently to your account. Earn AC through daily play or purchase in Treasury.
          </div>
        </div>
      ) : null}
      {activeTab === 'Tickets' ? (
        <div className="sp-tickets">
          <div className="sp-coming-soon">
            <div className="sp-cs-glow" />
            <span className="sp-cs-icon">⚖️</span>
            <h2 className="sp-cs-title">Pro Tour</h2>
            <p className="sp-cs-sub">
              Skill-based tournaments with real AC prize pools. Entry fee in AC.
              Winner takes the pool minus rake.
            </p>
            <div className="sp-cs-features">
              {SHOP_TOUR_FEATURES.map((feature) => (
                <div key={feature.text} className="sp-cs-feature">
                  <span>{feature.icon}</span>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
            <div className="sp-cs-status">
              <span className="sp-cs-dot" />
              Getting licensed. Expanding region by region.
            </div>
            <button className="sp-cs-notify" disabled>Notify Me When Live</button>
            <p className="sp-cs-legal">
              Real-money entry requires regulatory approval. Currently available in select skill-game jurisdictions only.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
