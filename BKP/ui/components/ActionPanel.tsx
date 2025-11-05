import React from 'react'
import { Suit } from '@/types'
import './ActionPanel.css'

interface ActionPanelProps {
  gamePhase: string
  onDeclareIntent: (suit: Suit) => void
  onCallShowdown: () => void
  onPickUpCard: () => void
  onDeclineCard: () => void
  currentPlayerCanAct: boolean
  declaredSuit: Suit | null
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  gamePhase,
  onDeclareIntent,
  onCallShowdown,
  onPickUpCard,
  onDeclineCard,
  currentPlayerCanAct,
  declaredSuit
}) => {
  const handleSuitSelect = (suit: Suit) => {
    onDeclareIntent(suit)
  }

  return (
    <div className="action-panel">
      <div className="panel-header">
        <h3>Game Actions</h3>
        <div className="phase-indicator">
          Phase: {gamePhase.replace('_', ' ')}
        </div>
      </div>
      
      <div className="action-buttons">
        {gamePhase === 'FLOOR_REVEAL' && currentPlayerCanAct && (
          <>
            <button 
              className="action-button pickup"
              onClick={onPickUpCard}
            >
              Pick Up Card
            </button>
            <button 
              className="action-button decline"
              onClick={onDeclineCard}
            >
              Decline Card
            </button>
          </>
        )}
        
        {gamePhase === 'PLAYER_ACTION' && currentPlayerCanAct && (
          <>
            {declaredSuit ? (
              <button 
                className="action-button showdown"
                onClick={onCallShowdown}
                disabled={!currentPlayerCanAct}
              >
                Call Showdown
              </button>
            ) : (
              <div className="declare-section">
                <h4>Declare Intent</h4>
                <div className="suit-selector">
                  <button 
                    className="suit-button spades"
                    onClick={() => handleSuitSelect(Suit.SPADES)}
                    disabled={!currentPlayerCanAct}
                  >
                    ♠ Spades
                  </button>
                  <button 
                    className="suit-button hearts"
                    onClick={() => handleSuitSelect(Suit.HEARTS)}
                    disabled={!currentPlayerCanAct}
                  >
                    ♥ Hearts
                  </button>
                  <button 
                    className="suit-button diamonds"
                    onClick={() => handleSuitSelect(Suit.DIAMONDS)}
                    disabled={!currentPlayerCanAct}
                  >
                    ♦ Diamonds
                  </button>
                  <button 
                    className="suit-button clubs"
                    onClick={() => handleSuitSelect(Suit.CLUBS)}
                    disabled={!currentPlayerCanAct}
                  >
                    ♣ Clubs
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {gamePhase === 'SHOWDOWN' && currentPlayerCanAct && (
          <button 
            className="action-button rebuttal"
            onClick={() => console.log('Rebuttal action')}
            disabled={!currentPlayerCanAct}
          >
            Make Rebuttal
          </button>
        )}
      </div>
      
      {!currentPlayerCanAct && (
        <div className="waiting-message">
          Waiting for your turn...
        </div>
      )}
    </div>
  )
}