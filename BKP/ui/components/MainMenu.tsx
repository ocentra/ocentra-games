import { useGameStore } from '@/store/gameStore'

export function MainMenu() {
  const { setCurrentScreen } = useGameStore()

  const menuItems = [
    {
      label: 'Single Player',
      description: 'Play against AI opponents',
      action: () => setCurrentScreen('game_mode_select'),
    },
    {
      label: 'Multiplayer',
      description: 'Play with friends online',
      action: () => setCurrentScreen('lobby'),
    },
    {
      label: 'Tutorial',
      description: 'Learn how to play CLAIM',
      action: () => setCurrentScreen('tutorial'),
    },
    {
      label: 'Card Interaction Demo',
      description: 'Test 3D card interactions and animations',
      action: () => setCurrentScreen('card_interaction_demo'),
    },
    {
      label: 'Settings',
      description: 'Adjust game preferences',
      action: () => setCurrentScreen('settings'),
    },
  ]

  return (
    <div className="main-menu">
      <div className="menu-content">
        <div className="menu-header">
          <h2>Main Menu</h2>
        </div>

        <div className="menu-items">
          {menuItems.map((item, index) => (
            <button
              key={index}
              className="menu-item"
              onClick={item.action}
            >
              <div className="menu-item-label">{item.label}</div>
              <div className="menu-item-description">{item.description}</div>
            </button>
          ))}
        </div>

        <div className="menu-footer">
          <button 
            className="secondary-button"
            onClick={() => setCurrentScreen('welcome')}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}