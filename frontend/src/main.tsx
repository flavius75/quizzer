import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router";
import AppLayout from './views/app/AppLayout';
import StartQuiz from './views/app/StartQuiz';
import AuthLayout from './views/auth/AuthLayout';
import AdminGuard from './components/AdminGuard';
import UserGuard from './components/UserGuard';
import { LoginForm } from './components/login-form';
import { RegisterForm } from './components/register-form';
import Leaderboard from './views/app/Leaderboard';
import Quizzes from './views/app/Quizzes';
import NotFound from './components/NotFound';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css'

// Admin-only screens are lazy-loaded so an anonymous/player visitor's
// initial bundle doesn't include the admin dashboard, tables, and quiz
// builder they can never reach past AdminGuard.
const AdminLayout = lazy(() => import('./views/admin/AdminLayout'));
const DashboardAdmin = lazy(() => import('./views/admin/DashboardAdmin'));
const UsersAdmin = lazy(() => import('./views/admin/UsersAdmin'));
const QuizzesAdmin = lazy(() => import('./views/admin/quizzes/QuizzesAdmin'));
const NewQuizz = lazy(() => import('./views/admin/quizzes/NewQuizz'));
const EditQuiz = lazy(() => import('./views/admin/quizzes/EditQuiz'));

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
        <Route element={
          <Suspense fallback={null}>
            <AdminLayout />
          </Suspense>
        }>
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
