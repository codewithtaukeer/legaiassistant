import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import ThemeToggle from '../components/ThemeToggle'
import styles from './Landing.module.css'

export default function Landing() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (token) navigate('/')
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.brand}>⚖️ Legal AI</div>
        <div className={styles.topRight}>
          <ThemeToggle />
          <button className={styles.loginBtn} onClick={() => navigate('/login')}>Sign In</button>
          <button className={styles.registerBtn} onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </div>

      <div className={styles.hero}>
        <div className={styles.badge}>🇮🇳 Indian Legal Assistant</div>
        <h1 className={styles.title}>
          Your AI-Powered<br />
          <span className={styles.accent}>Legal Assistant</span>
        </h1>
        <p className={styles.subtitle}>
          Ask questions about Indian law, upload legal documents,<br />
          and get accurate answers with cited sources.
        </p>
        <div className={styles.actions}>
          <button className={styles.ctaPrimary} onClick={() => navigate('/register')}>
            Get Started Free →
          </button>
          <button className={styles.ctaSecondary} onClick={() => navigate('/login')}>
            Sign In
          </button>
        </div>
      </div>

      <div className={styles.features}>
        {[
          { icon: '⚖️', title: 'IPC & Constitutional Law', desc: 'Covers Indian Penal Code, Fundamental Rights and more' },
          { icon: '📄', title: 'Upload Your Documents', desc: 'Upload any legal PDF and ask questions about it' },
          { icon: '📚', title: 'Cited Sources', desc: 'Every answer comes with source citations and relevance scores' },
          { icon: '💬', title: 'Conversation History', desc: 'All your chats are saved and searchable' },
        ].map((f, i) => (
          <div key={i} className={styles.featureCard}>
            <div className={styles.featureIcon}>{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}