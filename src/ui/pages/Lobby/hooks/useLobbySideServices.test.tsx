import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addFriend,
  createParty,
  getParty,
  getPresence,
  inviteToParty,
  leaveParty,
  listFriends,
  sendMessage,
} from '@ocentra/api-domain/social';
import {
  claimDailyReward,
  getCreditsBalance,
  getDailyReward,
  getSettings,
  updateSettings,
} from '@ocentra/api-domain/playerHub';
import { useLobbySideServices } from './useLobbySideServices';

vi.mock('@ocentra/api-domain/social', () => ({
  addFriend: vi.fn(),
  createParty: vi.fn(),
  getParty: vi.fn(),
  getPresence: vi.fn(),
  inviteToParty: vi.fn(),
  leaveParty: vi.fn(),
  listFriends: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('@ocentra/api-domain/playerHub', () => ({
  claimDailyReward: vi.fn(),
  getCreditsBalance: vi.fn(),
  getDailyReward: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

describe('useLobbySideServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    vi.mocked(listFriends).mockResolvedValue({ friends: [{ friendId: 'friend-1', status: 'online' }] });
    vi.mocked(getPresence).mockResolvedValue({ status: 'online' });
    vi.mocked(getDailyReward).mockResolvedValue({ available: true, currentDay: 2, loginStreak: 2, rewardForNext: { type: 'ac', currency: 'AC', amount: 50, ac: 50 } });
    vi.mocked(getCreditsBalance).mockResolvedValue({ user_id: 'user-1', gp_balance: 125, ac_balance: 9 });
    vi.mocked(getSettings).mockResolvedValue({ settings: { preferredServerRegion: 'eu-west' } });
    vi.mocked(addFriend).mockResolvedValue({ friends: [{ friendId: 'friend-2', status: 'accepted' }] });
    vi.mocked(createParty).mockResolvedValue({ partyId: 'party-1', members: [{ userId: 'user-1' }] });
    vi.mocked(getParty).mockResolvedValue({ partyId: 'party-1', leaderId: 'user-1', members: [{ userId: 'user-1' }], invites: [] });
    vi.mocked(inviteToParty).mockResolvedValue({ invited: true });
    vi.mocked(leaveParty).mockResolvedValue({ left: true });
    vi.mocked(sendMessage).mockResolvedValue({ sent: true });
    vi.mocked(claimDailyReward).mockResolvedValue({
      claimed: true,
      reward: { type: 'ac', currency: 'AC', amount: 75, ac: 75 },
      balance: { user_id: 'user-1', gp_balance: 125, ac_balance: 84 },
    });
    vi.mocked(updateSettings).mockResolvedValue({ settings: { preferredServerRegion: 'na-west' } });
  });

  it('loads friends, reward balance, party state, and saved server preference without public lobby chat', async () => {
    const { result } = renderHook(() => useLobbySideServices('claim', 'user-1', null));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.friends).toEqual([expect.objectContaining({ userId: 'friend-1', state: 'Online' })]);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(result.current.reward).toEqual(expect.objectContaining({
      available: true,
      rewardLabel: 'DAILY REWARD',
      balanceLabel: '9 AC',
      spinRewardLabel: '50 AC',
    }));
    expect(result.current.server.selectedRegionId).toBe('eu-west');
  });

  it('adds friends, claims reward, and persists server choice', async () => {
    const { result } = renderHook(() => useLobbySideServices('claim', 'user-1', null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addFriend('friend-2');
      await result.current.claimReward();
      await result.current.selectServer('na-west');
    });

    expect(addFriend).toHaveBeenCalledWith('friend-2');
    expect(sendMessage).not.toHaveBeenCalled();
    expect(claimDailyReward).toHaveBeenCalledTimes(1);
    expect(result.current.reward?.rewardLabel).toBe('75 AC');
    expect(result.current.reward?.balanceLabel).toBe('84 AC');
    expect(updateSettings).toHaveBeenCalledWith('user-1', { preferredServerRegion: 'na-west' });
    expect(result.current.server.selectedRegionId).toBe('na-west');
  });

  it('creates a party, invites a friend, sends the room code DM, and leaves the party', async () => {
    const { result } = renderHook(() => useLobbySideServices('claim', 'user-1', {
      roomId: 'room-1',
      roomName: 'Private Claim',
      joinCode: 'ABCD12',
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.inviteFriend('friend-1');
    });

    expect(createParty).toHaveBeenCalledTimes(1);
    expect(inviteToParty).toHaveBeenCalledWith('party-1', 'friend-1');
    expect(sendMessage).toHaveBeenCalledWith('dm:user-1:friend-1', 'Join my claim table with code ABCD12.');
    expect(result.current.party?.partyId).toBe('party-1');
    expect(result.current.friends.find(friend => friend.userId === 'friend-1')?.inviteState).toBe('invited');

    await act(async () => {
      await result.current.leaveParty();
    });

    expect(leaveParty).toHaveBeenCalledWith('party-1');
    expect(result.current.party).toBeNull();
  });
});
