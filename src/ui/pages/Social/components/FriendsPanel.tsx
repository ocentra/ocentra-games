import { useState } from 'react';

interface FriendsPanelProps {
  friends: Array<{ friendId: string }>;
  presenceStatus: string;
  onAddFriend: (friendId: string) => Promise<void>;
  onRemoveFriend: (friendId: string) => Promise<void>;
}

export function FriendsPanel({
  friends,
  presenceStatus,
  onAddFriend,
  onRemoveFriend,
}: FriendsPanelProps) {
  const [friendInput, setFriendInput] = useState('');

  return (
    <section className="social-panel">
      <h2 className="social-panel-title">Friends</h2>
      <p className="social-panel-subtitle">Presence: {presenceStatus}</p>

      <div className="social-row">
        <input
          className="social-input"
          type="text"
          value={friendInput}
          placeholder="Friend user id"
          onChange={(event) => setFriendInput(event.target.value)}
        />
        <button
          type="button"
          className="social-btn social-btn-primary"
          onClick={() => {
            void onAddFriend(friendInput);
            setFriendInput('');
          }}
        >
          Add
        </button>
      </div>

      <ul className="social-list">
        {friends.map((friend) => (
          <li key={friend.friendId} className="social-list-item">
            <span className="social-id">{friend.friendId}</span>
            <button
              type="button"
              className="social-btn social-btn-secondary"
              onClick={() => {
                void onRemoveFriend(friend.friendId);
              }}
            >
              Remove
            </button>
          </li>
        ))}
        {friends.length === 0 && <li className="social-empty">No friends yet</li>}
      </ul>
    </section>
  );
}
