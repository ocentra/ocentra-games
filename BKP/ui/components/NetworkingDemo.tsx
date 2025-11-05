import React, { useState, useEffect } from 'react'
import { useP2PNetworking } from '../../network/hooks/useP2PNetworking'
import { GameState, PlayerAction, GamePhase } from '../../types/game'

export function NetworkingDemo() {
  const [localPlayerId] = useState(() => `player_${Math.random().toString(36).substring(7)}`)
  const [roomId, setRoomId] = useState('')
  const [gameActions, setGameActions] = useState<PlayerAction[]>([])
  const [gameStateUpdates, setGameStateUpdates] = useState<GameState[]>([])

  const {
    isConnected,
    currentRoom,
    connectedPeers,
    connectionStatuses,
    networkQualities,
    isHost,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    connectToPeer,
    sendGameAction,
    startGame,
    updateGameState,
    forceSyncState,
    reconnectAll,
    isNetworkSuitableForGameplay,
    clearError,
    onGameAction,
    onGameStateUpdate,
  } = useP2PNetworking({
    localPlayerId,
    enableNetworkMonitoring: true,
    enableAutoReconnect: true,
    maxPeers: 4,
  })

  // Set up event listeners
  useEffect(() => {
    onGameAction((action) => {
      setGameActions(prev => [...prev, action])
    })

    onGameStateUpdate((gameState) => {
      setGameStateUpdates(prev => [...prev, gameState])
    })
  }, [onGameAction, onGameStateUpdate])

  const handleCreateRoom = async () => {
    try {
      const newRoomId = await createRoom({
        maxPlayers: 4,
        isPrivate: false,
        gameSettings: {
          allowSpectators: true,
        },
      })
      console.log('Room created:', newRoomId)
    } catch (error) {
      console.error('Failed to create room:', error)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomId.trim()) return
    
    try {
      await joinRoom(roomId.trim())
      console.log('Joined room:', roomId)
    } catch (error) {
      console.error('Failed to join room:', error)
    }
  }

  const handleConnectToPeer = async () => {
    const peerId = prompt('Enter peer ID to connect to:')
    if (!peerId) return
    
    try {
      await connectToPeer(peerId)
      console.log('Connected to peer:', peerId)
    } catch (error) {
      console.error('Failed to connect to peer:', error)
    }
  }

  const handleSendTestAction = () => {
    const testAction: PlayerAction = {
      type: 'declare_intent',
      playerId: localPlayerId,
      data: { suit: 'spades' },
      timestamp: new Date(),
    }
    
    sendGameAction(testAction)
  }

  const handleStartTestGame = () => {
    const testGameState: GameState = {
      id: `game_${Date.now()}`,
      players: [
        {
          id: localPlayerId,
          name: 'Local Player',
          avatar: '',
          hand: [],
          declaredSuit: null,
          intentCard: null,
          score: 0,
          isConnected: true,
          isAI: false,
        },
      ],
      currentPlayer: 0,
      phase: GamePhase.DEALING,
      deck: [],
      floorCard: null,
      discardPile: [],
      round: 1,
      startTime: new Date(),
      lastAction: new Date(),
    }
    
    startGame(testGameState)
  }

  const networkSuitability = isNetworkSuitableForGameplay()

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>WebRTC P2P Networking Demo</h2>
      
      {/* Player Info */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Player Info</h3>
        <p><strong>Local Player ID:</strong> {localPlayerId}</p>
        <p><strong>Connected:</strong> {isConnected ? 'Yes' : 'No'}</p>
        <p><strong>Is Host:</strong> {isHost ? 'Yes' : 'No'}</p>
        <p><strong>Network Suitable:</strong> {networkSuitability ? 'Yes' : 'No'}</p>
      </div>

      {/* Room Management */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Room Management</h3>
        <div style={{ marginBottom: '10px' }}>
          <button onClick={handleCreateRoom} disabled={isConnected}>
            Create Room
          </button>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={isConnected}
          />
          <button onClick={handleJoinRoom} disabled={isConnected || !roomId.trim()}>
            Join Room
          </button>
        </div>
        <div>
          <button onClick={leaveRoom} disabled={!isConnected}>
            Leave Room
          </button>
        </div>
        
        {currentRoom && (
          <div style={{ marginTop: '10px', padding: '5px', backgroundColor: '#f0f0f0' }}>
            <p><strong>Current Room:</strong> {currentRoom.id}</p>
            <p><strong>Status:</strong> {currentRoom.status}</p>
            <p><strong>Players:</strong> {currentRoom.playerIds.join(', ')}</p>
          </div>
        )}
      </div>

      {/* Peer Connections */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Peer Connections</h3>
        <div style={{ marginBottom: '10px' }}>
          <button onClick={handleConnectToPeer}>
            Connect to Peer
          </button>
          <button onClick={reconnectAll} style={{ marginLeft: '10px' }}>
            Reconnect All
          </button>
        </div>
        
        <div>
          <h4>Connected Peers ({connectedPeers.length})</h4>
          {connectedPeers.length === 0 ? (
            <p>No peers connected</p>
          ) : (
            <ul>
              {connectedPeers.map(peerId => (
                <li key={peerId}>
                  {peerId} - 
                  Status: {connectionStatuses[peerId] || 'unknown'} - 
                  Quality: {networkQualities[peerId] || 'unknown'}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Game Actions */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Game Actions</h3>
        <div style={{ marginBottom: '10px' }}>
          <button onClick={handleStartTestGame} disabled={!isConnected}>
            Start Test Game
          </button>
          <button onClick={handleSendTestAction} disabled={!isConnected} style={{ marginLeft: '10px' }}>
            Send Test Action
          </button>
          <button onClick={forceSyncState} disabled={!isConnected} style={{ marginLeft: '10px' }}>
            Force Sync State
          </button>
        </div>
      </div>

      {/* Game Actions Log */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Received Game Actions ({gameActions.length})</h3>
        <div style={{ maxHeight: '200px', overflow: 'auto', backgroundColor: '#f9f9f9', padding: '5px' }}>
          {gameActions.length === 0 ? (
            <p>No actions received</p>
          ) : (
            gameActions.slice(-10).map((action, index) => (
              <div key={index} style={{ marginBottom: '5px', fontSize: '12px' }}>
                <strong>{action.type}</strong> from {action.playerId} at {action.timestamp.toLocaleTimeString()}
                {action.data && <span> - Data: {JSON.stringify(action.data)}</span>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Game State Updates Log */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>Game State Updates ({gameStateUpdates.length})</h3>
        <div style={{ maxHeight: '200px', overflow: 'auto', backgroundColor: '#f9f9f9', padding: '5px' }}>
          {gameStateUpdates.length === 0 ? (
            <p>No state updates received</p>
          ) : (
            gameStateUpdates.slice(-5).map((state, index) => (
              <div key={index} style={{ marginBottom: '10px', fontSize: '12px' }}>
                <strong>Game {state.id}</strong> - Phase: {state.phase} - Round: {state.round}
                <br />
                Players: {state.players.length} - Last Action: {state.lastAction.toLocaleTimeString()}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ padding: '10px', backgroundColor: '#ffebee', border: '1px solid #f44336', marginBottom: '20px' }}>
          <h3 style={{ color: '#f44336' }}>Error</h3>
          <p>{error.message}</p>
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}

      {/* Instructions */}
      <div style={{ padding: '10px', backgroundColor: '#e3f2fd', border: '1px solid #2196f3' }}>
        <h3>Instructions</h3>
        <ol>
          <li>Create a room or join an existing room using a room ID</li>
          <li>Connect to peers manually or wait for them to connect to you</li>
          <li>Start a test game to initialize game state synchronization</li>
          <li>Send test actions to see real-time P2P communication</li>
          <li>Monitor connection status and network quality</li>
        </ol>
        <p><strong>Note:</strong> This is a demo of the WebRTC P2P networking foundation. 
        In a real implementation, you would integrate this with a signaling server for peer discovery.</p>
      </div>
    </div>
  )
}