# Frontend Structure - Module 7 Part 1

## 📂 Project Structure

```
frontend/
├── src/
│   ├── pages/                    # Page components for routing
│   │   ├── Auth.tsx              # Authentication page (signup/login)
│   │   ├── Lobby.tsx             # Room list and creation
│   │   └── Room.tsx              # Quiz and game interface
│   │
│   ├── components/               # Reusable React components
│   │   ├── ui/                   # UI components (buttons, inputs, etc.)
│   │   └── shared/               # Shared components (header, footer, etc.)
│   │
│   ├── services/                 # External service integrations
│   │   ├── api.ts                # Axios instance for REST API calls
│   │   └── socket.ts             # Socket.IO client initialization
│   │
│   ├── routes/                   # Routing configuration
│   │   └── AppRoutes.tsx          # React Router setup and route definitions
│   │
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # React entry point
│   ├── index.css                 # Global styles
│   ├── App.css                   # App component styles
│   └── assets/                   # Images, icons, etc.
│
├── index.html                    # HTML template
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
├── .env.example                  # Environment variables template
└── README.md                     # Project documentation
```

## 🚀 Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client
- **Styling**: CSS (TailwindCSS to be added later)

## 📦 Installed Dependencies

```json
{
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^6.x.x",
    "axios": "^1.x.x",
    "socket.io-client": "^4.8.x"
  },
  "devDependencies": {
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@types/react-router-dom": "^5.3.x",
    "typescript": "^6.0.2",
    "vite": "^8.0.4"
  }
}
```

## 🛣️ Routing Configuration

### Routes Defined

| Route | Component | Purpose |
|-------|-----------|---------|
| `/auth` | `Auth.tsx` | User authentication (signup/login) |
| `/lobby` | `Lobby.tsx` | Browse and create/join rooms |
| `/room/:id` | `Room.tsx` | Active quiz/game interface |
| `/` | Redirect to `/auth` | Default route |

### Route Flow

```
BrowserRouter
  ├── /auth → Auth Page (authentication)
  ├── /lobby → Lobby Page (room list)
  ├── /room/:id → Room Page (quiz)
  └── * → Redirect to /auth
```

## 📡 Services

### API Service (`services/api.ts`)

**Purpose**: Centralized Axios instance for all backend API calls

**Features**:
- Base URL configured to `http://localhost:5000/api`
- Request interceptor for JWT token attachment (TODO)
- Response interceptor for error handling (TODO)
- Environment variable support (VITE_API_URL)

**Usage** (when implemented):
```typescript
import apiClient from '@/services/api'

// Example: will be implemented in Module 7 Part 2
// const response = await apiClient.post('/auth/login', { email, password })
```

### Socket Service (`services/socket.ts`)

**Purpose**: WebSocket connection management using Socket.IO

**Features**:
- Initialize Socket.IO connection
- Connection/disconnection event handling
- Error handling and logging
- Helper functions for emitting/listening to events
- Environment variable support (VITE_SOCKET_URL)

**API**:
```typescript
import { initializeSocket, getSocket, onEvent, emitEvent } from '@/services/socket'

// Initialize connection (call once on app start)
const socket = initializeSocket()

// Listen to events
onEvent('receive_message', (data) => {
  console.log('Message:', data)
})

// Emit events
emitEvent('join_room', { roomId: 'room123' })

// Get current socket instance
const currentSocket = getSocket()

// Close connection
closeSocket()
```

## 📄 Page Components

### Auth Page (`pages/Auth.tsx`)

**Purpose**: User authentication interface

**To Be Implemented**:
- Signup form
- Login form
- Form validation
- API integration with `/api/auth/signup` and `/api/auth/login`
- JWT token storage
- Navigation to `/lobby` on success

**Current State**: Placeholder component

### Lobby Page (`pages/Lobby.tsx`)

**Purpose**: Room browsing and management

**To Be Implemented**:
- Fetch list of available rooms from REST API
- Display rooms in a list/grid
- Create new room button
- Join room functionality
- Real-time room updates via WebSocket
- User info display with logout option

**Current State**: Placeholder component

### Room Page (`pages/Room.tsx`)

**Purpose**: Active quiz/game interface

**To Be Implemented**:
- Display quiz questions
- Show player list with real-time updates
- Display player scores
- Timer for quiz questions
- Answer submission interface
- Real-time updates via WebSocket
- Quiz results/leaderboard

**Current State**: Placeholder component with route parameter example

## 🔌 Environment Variables

Create a `.env` file in the frontend root:

```bash
# Backend API Configuration
VITE_API_URL=http://localhost:5000/api

# Socket.IO Server Configuration
VITE_SOCKET_URL=http://localhost:5000
```

**Note**: Variables must start with `VITE_` to be accessible in client code.

## 🏃 Running the Application

### Development Mode

```bash
cd frontend
npm run dev
```

This starts the Vite dev server on `http://localhost:5173`

### Production Build

```bash
cd frontend
npm run build
```

Generates optimized production bundle in `dist/` directory

### Preview Build

```bash
cd frontend
npm run preview
```

Serves the built application locally for testing

## ✅ Verification Checklist

- ✅ React Router installed and configured
- ✅ Routes created: `/auth`, `/lobby`, `/room/:id`
- ✅ Placeholder pages created and rendering correctly
- ✅ Axios service initialized with base URL
- ✅ Socket.IO service initialized with connection handling
- ✅ App.tsx cleaned and routing integrated
- ✅ TypeScript compilation successful (no errors)
- ✅ Production build successful

## 🎯 Next Steps (Module 7 Part 2)

1. **Authentication UI**
   - Design and implement signup/login forms
   - Integrate with API service
   - Handle JWT token storage and validation
   - Protect routes with authentication check

2. **Lobby Page**
   - Fetch rooms from API
   - Display room list
   - Implement room creation
   - Implement room joining

3. **Room Page**
   - Connect to Socket.IO events
   - Display player list
   - Implement quiz display
   - Show real-time updates

4. **Shared Components**
   - Header/Navigation
   - Loading spinner
   - Error handling
   - Modal components

5. **Styling**
   - Add TailwindCSS configuration
   - Design responsive layouts
   - Implement UI components

## 📝 Code Standards

- **TypeScript**: Full type safety, strict mode enabled
- **Components**: Functional components with React hooks
- **Naming**: PascalCase for components, camelCase for functions/variables
- **JSDoc**: Comments for complex logic and component purposes
- **Structure**: Feature-based folder organization

## 🔐 Security Notes

- JWT tokens will be stored in localStorage (Module 7 Part 2)
- API requests will include Authorization header (Module 7 Part 2)
- WebSocket authentication to be added (future module)
- CORS configured for development on backend

## 📊 Build outputs

```
✓ Frontend build successful
✓ 29 modules transformed
✓ dist/index.html: 0.47 kB (gzip: 0.30 kB)
✓ dist/assets/index.css: 4.10 kB (gzip: 1.47 kB)
✓ dist/assets/index.js: 233.20 kB (gzip: 74.55 kB)
```

---

**Status**: ✅ Complete - Ready for Module 7 Part 2 (UI Implementation)
