# ChatHut - Modern AI Smart Messenger Client

A modern AI-powered messaging client for Telegram and WhatsApp with intelligent chat assistance.

## 🚀 Latest Updates

### v2.1.1 - Build Fixes & Code Quality

- **TypeScript Build Fixes**: Fixed all TypeScript compilation errors for production deployment
- **Unused Variable Cleanup**: Removed or properly marked unused variables and imports
- **Production Ready**: Frontend now builds successfully without any TypeScript errors
- **Code Quality**: Improved code organization and removed dead code
- **Database Async Fixes**: Fixed async SQLAlchemy operations for proper database connectivity
- **Authentication Fixes**: Resolved 500 errors in registration and login endpoints
- **Production Database**: Fixed async driver configuration for PostgreSQL in production
- **PostgreSQL UUID Support**: Fixed model definitions to work with PostgreSQL UUID and SQLite String types
- **Enhanced Logging**: Added detailed logging for debugging authentication issues

### v2.1.0 - Local Message Storage & Session Persistence

- **Local Message History**: Complete rewrite of message handling - all chat history now stored locally in IndexedDB
- **Session Persistence**: Telegram and WhatsApp sessions are now saved on the server linked to user accounts
- **Automatic Login**: Users no longer need to login every time - sessions are automatically restored
- **AI Chat Assistant**: Restored intelligent AI panel with Gemini integration and vector memory
- **Smart Context**: AI now remembers chat history and provides relevant answers about conversations
- **Real WhatsApp Integration**: Switched from mock to real WhatsApp service with persistent sessions
- **Full Chat Analysis**: AI now processes entire chat history (up to 5000 messages) instead of just 20
- **Smart Chat Indexing**: New "Index" button to vectorize entire chat for instant semantic search
- **Enhanced Memory**: AI context increased from 10k to 25k tokens for better understanding
- **Infinite Scroll**: Dynamic message loading when scrolling to top - see full chat history
- **Batch Message Loading**: Messages load in batches of 100 for optimal performance
- **Real Telegram Auth**: Fixed MTProto authentication - now sends actual SMS codes via Telegram API
- **2FA Support**: Added two-factor authentication support for Telegram accounts with Cloud Password
- **Performance Boost**: Faster loading times with local storage, reduced server load
- **Scalability**: Architecture now supports 1000+ users efficiently

### v2.0.0 - Multi-Platform Support

- **WhatsApp Integration**: Full WhatsApp Web support with QR code authentication
- **Unified Interface**: Consistent UI across Telegram and WhatsApp
- **Real-time Messaging**: WebSocket-based real-time message updates
- **AI Chat Assistant**: Intelligent AI panel for both platforms

### v1.0.0 - Initial Release

- **Telegram Integration**: Full Telegram client with MTProto authentication
- **Modern UI**: Beautiful, responsive design with ShadCN UI components
- **Authentication System**: Secure user registration and login
- **Chat Management**: Full chat list and message handling

## 🏗️ Architecture

### Frontend (React + TypeScript)

- **Local Storage**: IndexedDB for message history using `idb-keyval`
- **Session Management**: Automatic session restoration and persistence
- **Real-time Updates**: WebSocket connections for live messaging
- **Modern UI**: Tailwind CSS, Framer Motion, ShadCN UI components

### Backend (FastAPI + Python)

- **Session Storage**: PostgreSQL database for user sessions
- **Message Relay**: Server acts as proxy for sending/receiving messages
- **Authentication**: JWT-based user authentication
- **WebSocket Hub**: Real-time message broadcasting

### Key Features

- **Local Message History**: All chat history stored in browser's IndexedDB
- **Session Persistence**: No repeated logins required
- **Cross-Platform**: Support for Telegram and WhatsApp
- **AI Integration**: Intelligent chat assistance
- **Real-time Updates**: Instant message synchronization
- **Modern Design**: Beautiful, responsive interface

## 🛠️ Technology Stack

### Frontend

- React 18 + TypeScript
- Tailwind CSS + ShadCN UI
- Framer Motion for animations
- IndexedDB (via idb-keyval)
- WebSocket for real-time updates

### Backend

- FastAPI (Python)
- PostgreSQL database
- JWT authentication
- WebSocket support
- Telethon (Telegram)
- WhatsApp Web API

### AI & ML

- Google Gemini AI integration
- Local message context analysis
- Intelligent response suggestions

## 📱 Supported Platforms

### Telegram

- ✅ MTProto authentication
- ✅ Session persistence
- ✅ Real-time messaging
- ✅ Chat history (local storage)
- ✅ AI assistance

### WhatsApp

- ✅ QR code authentication
- ✅ Session persistence
- ✅ Real-time messaging
- ✅ Chat history (local storage)
- ✅ AI assistance

## 🔧 Installation & Setup

### Prerequisites

- Node.js 18+
- Python 3.9+
- PostgreSQL
- Docker (optional)

### Quick Start

```bash
# Clone repository
git clone https://github.com/your-username/chathut.git
cd chathut

# Install dependencies
npm install
cd back && pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and database settings

# Run database migrations
cd back && python -m alembic upgrade head

# Start development servers
npm run dev  # Frontend
cd back && python main.py  # Backend
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost/chathut

# API Keys
TELEGRAM_API_ID=your_telegram_api_id
TELEGRAM_API_HASH=your_telegram_api_hash
GEMINI_API_KEY=your_gemini_api_key

# JWT
JWT_SECRET_KEY=your_jwt_secret
JWT_ALGORITHM=HS256

# WhatsApp Service
WHATSAPP_API_URL=http://localhost:3001
```

## 🎯 Key Features

### Local Message Storage

- All chat history stored locally in IndexedDB
- No server-side message storage
- Fast loading and offline access
- Automatic sync with new messages

### Session Persistence

- Telegram and WhatsApp sessions saved on server
- Automatic login on app restart
- Secure session management
- Cross-device session sync

### AI Chat Assistant

- Context-aware responses
- Message history analysis
- Intelligent suggestions
- Multi-language support

### Real-time Messaging

- WebSocket-based updates
- Instant message delivery
- Typing indicators
- Online status

## 🔒 Security

- JWT-based authentication
- Encrypted session storage
- Secure API endpoints
- Input validation and sanitization
- CORS protection

## 🚀 Deployment

### Production Setup

```bash
# Build frontend
npm run build

# Deploy backend
cd back
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker

# Database setup
python -m alembic upgrade head
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 📊 Performance

### Scalability

- Supports 1000+ concurrent users
- Local storage reduces server load
- Efficient WebSocket connections
- Optimized database queries

### Monitoring

- Real-time connection status
- Message delivery tracking
- Error logging and reporting
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/your-username/chathut/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-username/chathut/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/chathut/discussions)

## 🔮 Roadmap

### Upcoming Features

- [ ] Voice message support
- [ ] File sharing improvements
- [ ] Group chat enhancements
- [ ] Advanced AI features
- [ ] Mobile app development
- [ ] End-to-end encryption
- [ ] Custom themes
- [ ] Plugin system

### Performance Improvements

- [ ] Message compression
- [ ] Lazy loading
- [ ] Cache optimization
- [ ] Database indexing
- [ ] CDN integration

---

**ChatHut** - Your cozy messaging home with AI assistance! 🏠✨
