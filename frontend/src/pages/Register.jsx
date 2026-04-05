import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await api.post('/auth/register', form)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Try a different username.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        :root{--gold:#c9a84c;--gold-light:#e8cc7a;--gold-dim:rgba(201,168,76,0.12);--dark:#080808;--dark2:#0f0f0f;--dark3:#161616;--dark4:#1e1e1e;--text1:#f0ebe0;--text2:#b8b0a0;--text3:#6b6560;--border:rgba(201,168,76,0.15);--border2:rgba(255,255,255,0.06)}
        body{background:var(--dark);color:var(--text1);font-family:'DM Sans',sans-serif}
        .auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:40px 24px;position:relative;overflow:hidden}
        .auth-bg{position:fixed;inset:0;background:radial-gradient(ellipse 70% 50% at 50% 100%,rgba(201,168,76,0.07) 0%,transparent 70%),radial-gradient(ellipse 40% 40% at 20% 20%,rgba(139,115,85,0.05) 0%,transparent 60%);pointer-events:none}
        .auth-grid{position:fixed;inset:0;background-image:linear-gradient(rgba(201,168,76,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.02) 1px,transparent 1px);background-size:60px 60px;pointer-events:none;mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 0%,transparent 100%)}
        .auth-card{width:100%;max-width:420px;background:var(--dark3);border:1px solid var(--border);border-radius:20px;padding:48px 40px;position:relative;animation:authIn 0.6s ease both;box-shadow:0 32px 80px rgba(0,0,0,0.5)}
        .auth-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
        @keyframes authIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .auth-logo{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:700;color:var(--text1);text-align:center;margin-bottom:8px;cursor:pointer}
        .auth-logo span{color:var(--gold)}
        .auth-tagline{text-align:center;font-family:'Cormorant Garamond',serif;font-size:16px;color:var(--text3);margin-bottom:36px;font-style:italic}
        .auth-title{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:700;color:var(--text1);margin-bottom:6px}
        .auth-sub{font-size:14px;color:var(--text3);margin-bottom:32px}
        .auth-field{margin-bottom:20px}
        .auth-label{display:block;font-size:12px;color:var(--text3);letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px;font-weight:500}
        .auth-input{width:100%;background:var(--dark4);border:1px solid var(--border2);border-radius:8px;padding:12px 16px;font-size:15px;color:var(--text1);font-family:'DM Sans',sans-serif;outline:none;transition:all 0.2s}
        .auth-input:focus{border-color:var(--gold);background:rgba(201,168,76,0.04);box-shadow:0 0 0 3px rgba(201,168,76,0.08)}
        .auth-input::placeholder{color:var(--text3)}
        .auth-error{background:rgba(255,80,80,0.08);border:1px solid rgba(255,80,80,0.2);border-radius:8px;padding:12px 16px;font-size:14px;color:rgba(255,120,120,0.9);margin-bottom:20px}
        .auth-btn{width:100%;background:var(--gold);border:none;border-radius:8px;padding:14px;font-size:15px;font-weight:500;color:#080808;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;margin-top:8px}
        .auth-btn:hover:not(:disabled){background:var(--gold-light);transform:translateY(-1px);box-shadow:0 8px 24px rgba(201,168,76,0.3)}
        .auth-btn:disabled{opacity:0.6;cursor:not-allowed}
        .auth-footer{text-align:center;margin-top:24px;font-size:14px;color:var(--text3)}
        .auth-link{color:var(--gold);text-decoration:none;transition:opacity 0.2s}
        .auth-link:hover{opacity:0.8}
        .auth-back{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--text3);cursor:pointer;margin-bottom:28px;transition:color 0.2s;width:fit-content}
        .auth-back:hover{color:var(--gold)}
        .auth-divider{height:1px;background:var(--border2);margin:28px 0}
        .auth-note{font-size:12px;color:var(--text3);margin-top:16px;text-align:center;line-height:1.5}
      `}</style>

      <div className="auth-wrap">
        <div className="auth-bg" /><div className="auth-grid" />
        <div className="auth-card">
          <div className="auth-back" onClick={() => navigate('/landing')}>← Back to Home</div>
          <div className="auth-logo" onClick={() => navigate('/landing')}>⚖️ Legal<span>AI</span></div>
          <p className="auth-tagline">Indian Legal Intelligence</p>
          <div className="auth-divider" />
          <h2 className="auth-title">Create account</h2>
          <p className="auth-sub">Start your legal research journey</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">Username</label>
              <input className="auth-input" placeholder="Choose a username" value={form.username}
                onChange={e => setForm({...form, username: e.target.value})} required />
            </div>
            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" placeholder="Your email address" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input className="auth-input" type="password" placeholder="Create a password" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account →'}
            </button>
          </form>

          <p className="auth-footer">
            Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
          </p>
          <p className="auth-note">Free forever · No credit card required</p>
        </div>
      </div>
    </>
  )
}
