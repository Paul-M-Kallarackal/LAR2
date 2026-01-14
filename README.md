# LAR - LMA Automate Reimagined

A comprehensive sustainability loan document automation platform featuring AI-powered compliance analysis, voice-based questionnaire filling, real-time translation, and collaborative editing.

## Features

- Rich document editor with TipTap
- AI-powered LMA compliance scanning with dual analysis (regulatory + fairness)
- Voice-based questionnaire filling using OpenAI Whisper
- Real-time document translation (100+ languages)
- Document sharing with automatic translation for recipients
- Real-time collaboration via WebSockets

## Tech Stack

**Backend:** NestJS, PostgreSQL, TypeORM, Socket.IO, OpenAI  
**Frontend:** React 18, Vite, TipTap, ShadCN/ui, Tailwind CSS, Zustand

## Quick Start

### Prerequisites

- Docker and Docker Compose
- OpenAI API Key (for AI features)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/Paul-M-Kallarackal/LAR2.git
cd LAR2
```

2. Create a `.env` file from the template:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```env
OPENAI_API_KEY=sk-your-openai-api-key
JWT_SECRET=your-secret-jwt-key
```

4. Start the application:
```bash
docker-compose up --build
```

5. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

### Default Credentials

- **Loan Provider:** `provider@lma.eu` / `password123`
- **Loan Borrower:** `borrower@lma.eu` / `password123`

## Project Structure

```
LAR2/
├── backend/           # NestJS API server
│   ├── src/
│   │   ├── modules/   # Feature modules (auth, documents, compliance, etc.)
│   │   └── database/  # TypeORM entities
│   └── Dockerfile
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── stores/
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for AI features | Yes |
| `JWT_SECRET` | Secret for JWT token signing | Yes |
| `DATABASE_*` | PostgreSQL connection settings | Auto-configured in Docker |

## License

MIT
