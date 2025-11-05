# CLAIM Card Game

A high-stakes, real-time multiplayer card game built with React Three Fiber, featuring stunning 3D graphics, intelligent AI opponents, and peer-to-peer multiplayer connectivity.

## Features

- **3D Graphics**: Immersive top-down card game experience with React Three Fiber
- **AI Opponents**: Local machine learning-powered opponents with distinct personalities
- **Real-time Multiplayer**: WebRTC peer-to-peer networking for low-latency gameplay
- **Cross-Platform**: Web, iOS, and Android support via Capacitor
- **Tournament System**: Competitive play with rankings and leaderboards

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **3D Graphics**: React Three Fiber + Drei + Cannon (Physics)
- **State Management**: Zustand + React Query
- **AI**: Transformers.js with WebGPU acceleration
- **Networking**: WebRTC + Cloudflare Workers
- **Mobile**: Capacitor for native deployment

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

### Development Server

Start the development server:

```bash
npm run dev
```

The game will be available at `http://localhost:3000`

## Project Structure

```
src/
├── engine/          # Game engine and 3D rendering
│   ├── rendering/   # React Three Fiber components
│   └── logic/       # Game rules and mechanics
├── ai/              # AI opponent system
│   └── models/      # ML model management
├── network/         # WebRTC networking
│   └── connection/  # Connection management
├── ui/              # User interface components
│   ├── components/  # React components
│   └── hooks/       # Custom hooks
├── store/           # Zustand state management
├── providers/       # React context providers
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

## Game Rules

CLAIM is a 4-player card game where players compete to score the highest points through strategic card collection and psychological warfare. Key mechanics include:

- **Declare Intent**: Choose a suit to score positive points
- **Hoarder's Multiplier**: Score = (suit cards sum) × (suit cards count) - penalties + bonuses
- **Showdown**: Any player can end the game immediately
- **Rebuttals**: Undeclared players can contest showdowns

## Contributing

1. Follow the existing code style (ESLint + Prettier)
2. Write TypeScript with strict mode enabled
3. Add tests for new functionality
4. Update documentation as needed

## License

This project is private and proprietary.