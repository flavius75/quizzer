# Quizzer App

Quizzer is a full-stack application designed for creating, managing, and taking quizzes. It features a **FastAPI** backend for handling API requests and a **React + TypeScript** frontend for a modern and interactive user interface.

## Features
- User authentication (login and role-based access).
- Quiz creation and management (for admins).
- Quiz participation with real-time scoring.
- Success rate tracking for quizzes.
- Responsive and user-friendly design.

---

## Backend (FastAPI)

### Prerequisites
- Python 3.9+
- PostgreSQL database

### Setup Instructions
1. **Clone the repository**:
```
   git clone https://github.com/your-username/quizzer.git
   cd quizzer/backend
```

2. **Create a virtual environment**:
```
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**:
```
    pip install -r requirements.txt
```

4. **Set up environment variables: Create a .env file in the backend directory with the following**:
```
    DATABASE_URL=postgresql://username:password@localhost:5432/quizzer
    SECRET_KEY=your_secret_key
```

5. **Run database migrations**:
```
    alembic upgrade head
```    

6. **Start the backend server**:
```
    uvicorn main:app --reload
```

The backend will be available at http://127.0.0.1:8000.

## Frontend (React + TypeScript)

### Prerequisites
- Node.js 16+
- npm or yarn

### Setup Instructions


1. **Navigate to the frontend directory**:
```    
    cd quizzer/frontend
```

2. Install dependencies:
```
npm install
```

3. Start the development server:
```
npm run dev
```

The frontend will be available at http://127.0.0.1:5173.

## Usage
1. **Access the app**:

- Open the frontend in your browser at http://127.0.0.1:5173.
- Use the backend API at http://127.0.0.1:8000/docs for testing endpoints.

2. **Login**:

- Use the login form to authenticate.
- Admin users can create and manage quizzes.

3. **Take a Quiz**:
    - Select a quiz and answer the questions.
    - View your score and success rate at the end.


## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Contributing
Feel free to fork the repository and submit pull requests for improvements or bug fixes.