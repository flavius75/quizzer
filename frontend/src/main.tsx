import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router";
import AppLayout from './views/app/AppLayout';
import StartQuiz from './views/app/StartQuiz';
import AuthLayout from './views/auth/AuthLayout';
import AdminGuard from './components/AdminGuard';
import AdminLayout from './views/admin/AdminLayout';
import UserGuard from './components/UserGuard';
import { LoginForm } from './components/login-form';
import { RegisterForm } from './components/register-form';
import Leaderboard from './views/app/Leaderboard';
import Quizzes from './views/app/Quizzes';
import NotFound from './components/NotFound';
import DashboardAdmin from './views/admin/DashboardAdmin';
import UsersAdmin from './views/admin/UsersAdmin';
import QuizzesAdmin from './views/admin/quizzes/QuizzesAdmin';
import NewQuizz from './views/admin/quizzes/NewQuizz';
import EditQuiz from './views/admin/quizzes/EditQuiz';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css'

// The session lives in an httpOnly cookie sent automatically by the browser
// (see src/lib/api.ts) - there is no client-side token to restore here.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
    <BrowserRouter>
    <Routes>
      <Route  element={<AppLayout />}>
        <Route path="/" element={<Quizzes />} />
        <Route path="start-quiz" element={<StartQuiz />} />
      </Route>

      <Route path="auth" element={<AuthLayout />}>
        <Route path="login" element={<LoginForm />} />
        <Route path="register" element={<RegisterForm />} />
      </Route>

      <Route path="user" element={<UserGuard />}>
        <Route element={<AppLayout />} >
          <Route path="leaderboard" element={<Leaderboard />} />
        </Route>
      </Route>

      <Route path="admin" element={<AdminGuard />}>
        <Route element={<AdminLayout />} >
          <Route path="dashboard" element={<DashboardAdmin />} />
          <Route path="users" element={<UsersAdmin />} />
          <Route path="quizzes" >
            <Route path="list" element={<QuizzesAdmin />} />
            <Route path="new" element={<NewQuizz />} />
            <Route path="edit/:quizId" element={<EditQuiz />} />
          </Route>
        </Route>
      </Route>

      <Route path='*' element={<NotFound />} />
    </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
