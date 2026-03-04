# AI Mail Assistant

An AI-powered email client where users control the application through natural language commands. Built with React, NestJS, and Gmail API with real-time sync via Google Pub/Sub.

[DEMO](https://drive.google.com/file/d/190fxYvfUhTzrM8NAO9GvGcrxvUH3j2pr/view?usp=drive_link)


## Features

- **AI Assistant**: Compose, reply, search, filter, and navigate emails via natural language
- **Real-Time Sync**: Instant email updates via Google Cloud Pub/Sub → WebSocket
- **Gmail Integration**: Full read, send, reply, and search capabilities
- **Modern UI**: Dark theme with shadcn/ui, Tailwind CSS v4, and Zustand state management

## Prerequisites

- **Node.js** 20.19.0+ or 22.12.0+
- **Docker** (for PostgreSQL)
- **Google Cloud Project** with APIs enabled
- **Groq API Key** for AI assistant

---

## Setup

### 1. Clone & Install

```bash
git clone <repo-url>
cd mail-ai

# Install dependencies
cd client && npm install
cd ../server && npm install
```

### 2. Start PostgreSQL

The database runs via Docker Compose:

```bash
# From project root
docker compose up -d
```

This starts **PostgreSQL 16** on `localhost:5432` with:
- User: `postgres`
- Password: `postgres`
- Database: `mailai`

To stop: `docker compose down` (data persists in `postgres_data` volume).

---

### 3. Google Cloud Configuration

#### 3.1 Create a GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Note your **Project ID** — you'll need it for Pub/Sub config

> **Docs**: [Creating a project](https://cloud.google.com/resource-manager/docs/creating-managing-projects)

#### 3.2 Enable APIs

Enable these APIs in [APIs & Services → Library](https://console.cloud.google.com/apis/library):

| API | Purpose | Link |
|-----|---------|------|
| **Gmail API** | Read, send, modify emails | [Enable](https://console.cloud.google.com/apis/library/gmail.googleapis.com) |
| **Cloud Pub/Sub API** | Real-time email notifications | [Enable](https://console.cloud.google.com/apis/library/pubsub.googleapis.com) |

> **Docs**: [Gmail API overview](https://developers.google.com/workspace/gmail/api/guides/push), [Pub/Sub quickstart](https://cloud.google.com/pubsub/docs/overview)

#### 3.3 Configure OAuth 2.0 Consent Screen

1. Go to [APIs & Services → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Choose **External** user type
3. Fill in app name, support email
4. Add these **scopes**:
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
5. Add your email as a **test user** (required while app is in "Testing" status)

> **Docs**: [Configure consent screen](https://developers.google.com/workspace/guides/configure-oauth-consent)

#### 3.4 Create OAuth 2.0 Credentials

1. Go to [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Add authorized redirect URI:
   ```
   http://localhost:3000/auth/google/callback
   ```
5. Copy the **Client ID** and **Client Secret**

> **Docs**: [Create OAuth credentials](https://developers.google.com/workspace/guides/create-credentials#oauth-client-id)

#### 3.5 Configure Pub/Sub (Real-Time Sync)

This enables instant email notifications instead of polling.

**Step 1 — Create a Topic:**

```bash
gcloud pubsub topics create gmail-notifications --project=YOUR_PROJECT_ID
```

**Step 2 — Grant Gmail publish access:**

```bash
gcloud pubsub topics add-iam-policy-binding gmail-notifications \
  --project=YOUR_PROJECT_ID \
  --member="serviceAccount:gmail-api-push@system.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

**Step 3 — Create a Subscription** (for production with a public webhook):

```bash
gcloud pubsub subscriptions create gmail-notifications-sub \
  --project=YOUR_PROJECT_ID \
  --topic=gmail-notifications
```

> **Docs**: [Gmail push notifications](https://developers.google.com/gmail/api/guides/push), [Pub/Sub subscriptions](https://cloud.google.com/pubsub/docs/create-subscription)

---

### 4. Get a Groq API Key

The AI assistant uses [Groq](https://console.groq.com/) for LLM inference.

1. Sign up at [console.groq.com](https://console.groq.com/)
2. Go to **API Keys** and create a new key
3. Copy the key

> **Docs**: [Groq API docs](https://console.groq.com/docs/overview)

---

### 5. Configure Environment

```bash
cd server
cp .env.example .env
```

Fill in your credentials:

```env
# App
PORT=3000
NODE_ENV=development

# Database (matches docker-compose.yml defaults)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mailai

# Google OAuth 2.0
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Google Cloud Pub/Sub (for real-time sync)
GCP_PROJECT_ID=<your-gcp-project-id>
GMAIL_PUBSUB_TOPIC=gmail-notifications
GMAIL_PUBSUB_SUBSCRIPTION=gmail-notifications-sub

# Client URL (CORS)
CLIENT_URL=http://localhost:5173

# Groq AI
GROQ_API_KEY=<your-groq-api-key>
```

---

### 6. Run Development Servers

```bash
# Terminal 1 — Server
cd server && npm run start:dev

# Terminal 2 — Client
cd client && npm run dev
```

Open **http://localhost:5173** and sign in with Google.

---

## AI Commands

Try these with the assistant:

| Command | What it does |
|---------|-------------|
| "Send an email to john@example.com about our meeting" | Composes and sends |
| "Reply to this with 'sounds good' and send" | Replies and sends in one step |
| "Show emails from last week" | Filters by date |
| "Search for emails from Google" | Gmail search query |
| "Open the latest email" | Opens by position |
| "Show unread emails" | Filters unread |
| "Go to sent" | Navigates views |

---

## Architecture

```
client/                  # React + Vite frontend
├── src/
│   ├── components/      # UI components (shadcn/ui)
│   ├── hooks/           # useAssistant, tool hooks, real-time sync
│   ├── store/           # Zustand stores (mail, chat, UI)
│   ├── services/        # API clients (chat, mail)
│   └── lib/             # Utilities (createTool)

server/                  # NestJS backend
├── src/
│   ├── auth/            # Google OAuth (Passport)
│   ├── mail/            # Gmail API integration
│   ├── chat/            # LLM streaming (Groq)
│   ├── sync/            # Pub/Sub webhook + WebSocket gateway
│   └── config/          # Environment configuration
```

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite 7, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand |
| **Backend** | NestJS 11, Passport, TypeORM, PostgreSQL 16 |
| **Gmail** | googleapis SDK, OAuth 2.0, Gmail API v1 |
| **Real-Time** | Google Cloud Pub/Sub, Socket.io |
| **AI** | Groq (Kimi K2), custom tool framework |
| **Infra** | Docker Compose (PostgreSQL) |

## License

MIT
