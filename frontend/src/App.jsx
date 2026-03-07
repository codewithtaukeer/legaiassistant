import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Chat from './pages/Chat'
import Admin from './pages/Admin'
import Landing from './pages/Landing'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/landing" />
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('token')
  const username = localStorage.getItem('username')
  if (!token) return <Navigate to="/login" />
  if (username !== 'admin') return <Navigate to="/" />
  return children
}

export default function App() {
  return ( 
    <Routes>
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><Chat /></PrivateRoute>} />
      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
    </Routes>
  )
}