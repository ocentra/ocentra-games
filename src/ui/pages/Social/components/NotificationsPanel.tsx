interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
}

interface NotificationsPanelProps {
  notifications: NotificationItem[];
  onMarkAllRead: () => Promise<void>;
}

export function NotificationsPanel({ notifications, onMarkAllRead }: NotificationsPanelProps) {
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <section className="social-panel">
      <div className="social-panel-header">
        <h2 className="social-panel-title">Notifications</h2>
        <button
          type="button"
          className="social-btn social-btn-secondary"
          onClick={() => {
            void onMarkAllRead();
          }}
          disabled={unreadCount === 0}
        >
          Mark All Read
        </button>
      </div>
      <p className="social-panel-subtitle">
        Unread: <strong>{unreadCount}</strong>
      </p>

      <ul className="social-list">
        {notifications.map((notification) => (
          <li
            key={notification.id}
            className={`social-list-item social-list-item-block ${notification.read ? 'social-item-muted' : ''}`}
          >
            <span className="social-id">{notification.type}</span>
            <span>{notification.title}</span>
            <span className="social-text-muted">{notification.body}</span>
          </li>
        ))}
        {notifications.length === 0 && <li className="social-empty">No notifications</li>}
      </ul>
    </section>
  );
}
