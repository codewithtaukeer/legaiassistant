import { useTheme } from '../context/ThemeContext'
import styles from './ThemeToggle.module.css'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button className={styles.toggle} onClick={toggleTheme} title="Toggle theme">
      <div className={`${styles.track} ${theme === 'light' ? styles.light : ''}`}>
        <div className={styles.thumb}>
          {theme === 'dark' ? '🌙' : '☀️'}
        </div>
      </div>
    </button>
  )
}