import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import styles from './Auth.module.css'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = new URLSearchParams()
      data.append('username', form.username)
      data.append('password', form.password)
      const res = await api.post('/auth/login', data)
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('username', res.data.username)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
        <div className={styles.themeRow}>
  <ThemeToggle />
</div>
      <div className={styles.card}>
        
        <div className={styles.logo}>⚖️</div>
        <h1 className={styles.title}>Legal AI Assistant</h1>
        <p className={styles.subtitle}>Sign in to your account</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className={styles.input}
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={e => setForm({...form, username: e.target.value})}
            required
          />
          <input
            className={styles.input}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            required
          />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.button} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className={styles.switch}>
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}