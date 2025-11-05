# AVEVA PI Integration System

A comprehensive system for integrating AVEVA PI with WhatsApp bot and AI capabilities.

## 🚀 Features

- **AVEVA PI Integration**: Connect and monitor AVEVA PI data sources
- **WhatsApp Bot**: Automated messaging and data retrieval
- **AI Chat**: Intelligent conversation handling with external AI APIs
- **Real-time Monitoring**: Live data polling and alerting
- **Web Dashboard**: Modern React-based admin interface

## 🏗️ Architecture

```
aveva-pi/
├── frontend/          # Next.js React application
├── avevapi/           # Node.js Express backend API
├── wa/               # WhatsApp bot integration
├── p/                # Archive/project files
└── docs/             # Documentation
```

## 📋 Prerequisites

- Node.js 18+
- AVEVA PI System (optional for development)
- WhatsApp Business API (optional)
- External AI API endpoint

## 🛠️ Installation

### Backend Setup
```bash
cd avevapi
npm install
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### WhatsApp Bot Setup
```bash
cd wa
npm install
node index.js
```

## ⚙️ Configuration

### Environment Variables
Copy `.env.example` to `.env` in each directory:

```bash
# avevapi/.env
PORT=8001
API_KEY=your-secure-api-key-here
AI_ENDPOINT=http://localhost:5000/chat

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8001

# wa/.env
WA_SESSION_PATH=./sessions
AVEVA_API_URL=http://localhost:8001
```

## 🔧 API Endpoints

### AVEVA PI Triggers
- `GET /api/triggers` - List all triggers
- `POST /api/triggers` - Create new trigger
- `PUT /api/triggers/:id` - Update trigger
- `DELETE /api/triggers/:id` - Delete trigger

### AI Integration
- `GET /api/ai/connection-status` - Check AI connection
- `POST /api/ai/connection` - Configure AI connection
- `POST /api/ai/chat` - Send message to AI

### Connections
- `GET /api/connections` - List data source connections
- `POST /api/connections` - Create new connection

## 🎯 Usage

### Web Dashboard
1. Open `http://localhost:3000`
2. Navigate to AVEVA PI Triggers tab
3. Configure data sources and triggers
4. Monitor real-time data

### AI Integration
1. Go to AI tab in dashboard
2. Configure AI endpoint and API key
3. Test connection
4. Create AI triggers with prefixes (e.g., `!ai`, `=ask`)

### WhatsApp Bot
1. Configure WhatsApp Business API
2. Send messages with trigger prefixes
3. Bot will respond with AVEVA PI data or AI responses

## 🧪 Testing

```bash
# Backend tests
cd avevapi && npm test

# Frontend tests
cd frontend && npm test

# Integration tests
npm run test:e2e
```

## 📁 Project Structure

```
aveva-pi/
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/   # React components
│   │   │   │   ├── ai/      # AI-related components
│   │   │   │   ├── ui/      # Reusable UI components
│   │   │   │   └── ...
│   │   │   └── ...
│   ├── public/              # Static assets
│   └── package.json
├── avevapi/                 # Express backend
│   ├── routes/              # API routes
│   │   ├── ai.js           # AI endpoints
│   │   ├── triggers.js     # Trigger management
│   │   └── connections.js  # Data connections
│   ├── plugins/             # AVEVA PI plugins
│   ├── data-sources/        # Data configurations
│   └── main.js
├── wa/                      # WhatsApp bot
│   ├── index.js
│   ├── sessions/            # WhatsApp sessions (ignored)
│   └── package.json
├── p/                       # Archive/project files
└── docs/                    # Documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please check the documentation in `docs/` folder or create an issue.

## 📊 Roadmap

- [ ] Multi-tenant support
- [ ] Advanced AI integrations
- [ ] Mobile app
- [ ] Real-time dashboards
- [ ] Automated reporting