# 🧠 Quizzer - Modern Quiz Application

A full-stack quiz application built with **FastAPI** and **React**, featuring real-time gameplay, role-based permissions, and comprehensive admin tools.

![Quizzer Demo](https://via.placeholder.com/800x400/0D9488/FFFFFF?text=Quizzer+Demo)

## ✨ Features

### 🎮 **Core Gameplay**
- **Guest Access** - Play public quizzes without registration
- **Real-time Quiz Engine** - Interactive quiz sessions with timer support
- **Multiple Question Types** - Single choice, multiple choice, fill-in-the-blank, true/false
- **Image Support** - Questions and answers can include images
- **Instant Scoring** - Automatic score calculation and feedback

### 👥 **User Management**
- **Role-based Access Control** - Player, Creator, Admin roles
- **JWT Authentication** - Secure token-based authentication
- **Global Leaderboard** - Competitive scoring system
- **Persistent Progress** - Scores saved for logged-in users

### 📊 **Quiz Management**
- **Public & Private Quizzes** - Control quiz visibility
- **Sharing Links** - Share private quizzes via unique links
- **Creator Dashboard** - Manage your own quizzes
- **Admin Panel** - Full system administration

### 🎨 **Modern UI/UX**
- **Responsive Design** - Works on desktop and mobile
- **Dark/Light Mode Support** - Elegant Tailwind CSS styling
- **Interactive Components** - Built with shadcn/ui
- **Real-time Animations** - Smooth user experience

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and **npm/yarn**
- **Python** 3.11+
- **PostgreSQL** 13+
- **Docker** (optional)

### 🐳 Docker Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/flavius75/quizzer.git
cd quizzer

# Start with Docker Compose
docker-compose up -d

# The app will be available at:
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000
```

### 🛠 Manual Setup

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
alembic upgrade head

# Seed database with sample data (optional)
python seed_database.py

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# App will be available at http://localhost:5173
```

## 📡 API Documentation

### Authentication
```http
POST /auth/register - Register new user
POST /auth/login    - Login user
```

### Quizzes
```http
GET    /quizzes/              - List quizzes (filtered by user role)
POST   /quizzes/              - Create quiz (creators only)
GET    /quizzes/{id}          - Get quiz details
POST   /quizzes/{id}/start    - Start quiz session
POST   /quizzes/play/{uuid}/submit - Submit quiz answers
GET    /quizzes/{id}/leaderboard   - Get quiz leaderboard
```

### Users
```http
GET /users/leaderboard - Global leaderboard
GET /users/me          - Current user profile
```

## 🏗 Architecture

### Backend (FastAPI)
```
backend/
├── app/
│   ├── main.py           # FastAPI application entry point
│   ├── models.py         # SQLModel database models
│   ├── auth.py           # JWT authentication logic
│   ├── routes/           # API route handlers
│   │   ├── auth.py       # Authentication routes
│   │   ├── quizzes.py    # Quiz management routes
│   │   └── users.py      # User management routes
│   ├── db/
│   │   └── database.py   # Database connection
│   └── migrations/       # Alembic database migrations
├── requirements.txt      # Python dependencies
└── Dockerfile           # Backend container config
```

### Frontend (React + TypeScript)
```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   ├── views/           # Page components
│   │   ├── app/         # Main app pages
│   │   ├── auth/        # Authentication pages
│   │   └── admin/       # Admin panel pages
│   ├── store/           # Zustand state management
│   ├── types.ts         # TypeScript type definitions
│   └── lib/             # Utility functions
├── package.json         # Node.js dependencies
└── tailwind.config.js   # Tailwind CSS configuration
```

## 🗄 Database Schema

### Core Models
- **Users** - User accounts with roles and scores
- **Quizzes** - Quiz metadata with visibility settings
- **Questions** - Individual quiz questions with types
- **Answers** - Answer options with correctness flags
- **Plays** - Quiz game sessions (supports anonymous users)
- **PlayAnswers** - User responses during quiz sessions

### Relationships
```mermaid
erDiagram
    User ||--o{ Quiz : creates
    User ||--o{ Play : participates
    Quiz ||--o{ Question : contains
    Quiz ||--o{ Play : generates
    Question ||--o{ Answer : has
    Play ||--o{ PlayAnswer : records
```

## 🎯 User Roles & Permissions

| Feature | Guest | Player | Creator | Admin |
|---------|-------|--------|---------|-------|
| Play Public Quizzes | ✅ | ✅ | ✅ | ✅ |
| Play Private Quizzes (via link) | ✅ | ✅ | ✅ | ✅ |
| View Leaderboard | ❌ | ✅ | ✅ | ✅ |
| Persistent Scores | ❌ | ✅ | ✅ | ✅ |
| Create Quizzes | ❌ | ❌ | ✅ | ✅ |
| Manage Own Quizzes | ❌ | ❌ | ✅ | ✅ |
| Admin Panel | ❌ | ❌ | ❌ | ✅ |
| Manage All Users/Quizzes | ❌ | ❌ | ❌ | ✅ |

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest

# Test specific modules
pytest app/tests/test_auth.py
pytest app/tests/test_quizzes.py
```

### Frontend Tests
```bash
cd frontend
npm test

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

### Production Build
```bash
# Backend
docker build -t quizzer-backend ./backend

# Frontend
cd frontend
npm run build
```

### Environment Variables

Create `.env` files with these variables:

#### Backend (.env)
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/quizzer
SECRET_KEY=your-super-secret-jwt-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

#### Frontend (.env)
```bash
VITE_API_URL=http://localhost:8000
```

## 🤝 Contributing

1. **Fork** the repository
2. Create a **feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. Open a **Pull Request**

### Development Guidelines
- Follow **TypeScript** best practices
- Write **tests** for new features
- Use **conventional commits**
- Update **documentation** as needed

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FastAPI** - Modern Python web framework
- **React** - JavaScript library for user interfaces
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful UI components
- **SQLModel** - Modern Python database toolkit
- **Zustand** - Lightweight state management

## 📞 Support

- 📧 **Email**: your-email@example.com
- 💬 **Issues**: [GitHub Issues](https://github.com/flavius75/quizzer/issues)
- 📖 **Documentation**: [Wiki](https://github.com/flavius75/quizzer/wiki)

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ by [Flavius](https://github.com/flavius75)

</div>