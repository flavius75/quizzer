import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router";
import AppLayout from './views/app/AppLayout';
import StartQuiz from './views/app/StartQuiz';
import AuthLayout from './views/auth/AuthLayout';
import { LoginForm } from './components/login-form';
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
    <Routes>
      <Route  path="/" element={<AppLayout />} />
      <Route path="start-quiz" element={<StartQuiz />} />

      <Route path="auth" element={<AuthLayout />}>
        <Route path="login" element={<LoginForm />} />
        {/* <Route path="register" element={<Register />} /> */}
      </Route>

      {/* <Route path="admin" element={<ProtectedRoute />}>
        <Route index element={<AdminLayout />} />
        <Route path="dashboard" element={<DashboardAdmin />} />
        <Route path="users" element={<UsersAdmin />} />
        <Route path="quizzes" element={<QuizzesAdmin />} />
      </Route> */}
    </Routes>
    </BrowserRouter>
  </StrictMode>,
)
