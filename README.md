# AI Mail Assistant

An AI-powered email client where users can control the application through natural language commands. Built with React, NestJS, CopilotKit, and Gmail API.

## Features

- **AI Assistant Control**: Compose, search, filter, and navigate emails via natural language
- **Real-Time Sync**: Instant email updates via Google Pub/Sub and WebSocket
- **Gmail Integration**: Full read, send, and search capabilities
- **Modern UI**: Dark theme with shadcn/ui components

## Prerequisites

- Node.js 20.19.0+ or 22.12.0+
- Google Cloud Project with Gmail API enabled
- OpenAI API key

## Setup

### 1. Clone and Install

```bash
# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 2. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Gmail API and Cloud Pub/Sub API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:3000/auth/google/callback`
5. For real-time sync (optional):
   - Create a Pub/Sub topic: `gmail-notifications`
   - Grant `gmail-api-push@system.gserviceaccount.com` Pub/Sub Publisher role
   - Create a push subscription pointing to your webhook URL

### 3. Configure Environment

Copy `.env.example` to `.env` in the server directory:

```bash
cd server
cp .env.example .env
```

Fill in your credentials:

```env
PORT=3000
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
JWT_SECRET=your-random-secret-key
GCP_PROJECT_ID=your-gcp-project
GCP_PUBSUB_TOPIC=gmail-notifications
OPENAI_API_KEY=your-openai-key
CLIENT_URL=http://localhost:5173
```

### 4. Run Development Servers

```bash
# Terminal 1 - Start server
cd server && npm run start:dev

# Terminal 2 - Start client
cd client && npm run dev
```

### 5. Access the App

Open http://localhost:5173 and sign in with Google.

## AI Commands

Try these commands with the AI assistant:

- "Send an email to john@example.com about our meeting tomorrow"
- "Show me emails from the last 7 days"
- "Open the latest email"
- "Reply to this email saying I'll be there"
- "Search for emails from Google"
- "Show unread emails"

## Architecture

```
client/                # React + Vite frontend
├── src/
│   ├── components/    # UI components
│   ├── hooks/         # CopilotKit actions, real-time sync
│   ├── store/         # Zustand state management
│   └── services/      # API clients

server/                # NestJS backend
├── src/
│   ├── auth/          # Google OAuth + JWT
│   ├── mail/          # Gmail API integration
│   ├── sync/          # Pub/Sub + WebSocket
│   └── copilotkit/    # AI runtime
```

## Tech Stack

- **Frontend**: React, Vite, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand
- **Backend**: NestJS, Passport, Gmail API, Socket.io
- **AI**: CopilotKit, OpenAI GPT-4

## License

MIT
