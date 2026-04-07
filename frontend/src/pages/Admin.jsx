import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import styles from './Admin.module.css'

export default function Admin() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [pdfs, setPdfs] = useState([])
  const [activeTab, setActiveTab] = useState('stats')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const navigate = useNavigate()
  const username = localStorage.getItem('username')

  useEffect(() => {
    if (username !== 'admin') {
      navigate('/')
      return
    }
    loadStats()
    loadUsers()
    loadPdfs()
  }, [])

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/stats')
      setStats(res.data)
    } catch {}
  }

  const loadUsers = async () => {
    try {
      const res = await api.get('/admin/users')
      setUsers(res.data.users)
    } catch {}
  }

  const loadPdfs = async () => {
    try {
      const res = await api.get('/admin/pdfs')
      setPdfs(res.data.pdfs)
    } catch {}
  }

  const deleteUser = async (userId, username) => {
    if (!confirm(`Delete user "${username}"? This will delete all their data.`)) return
    try {
      await api.delete(`/admin/user/${userId}`)
      setMsg(`User ${username} deleted`)
      loadUsers()
      loadStats()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Failed to delete user')
    }
  }

  const deletePdf = async (filename) => {
    if (!confirm(`Delete "${filename}"?`)) return
    try {
      await api.delete(`/admin/pdfs/${encodeURIComponent(filename)}`)
      setMsg(`${filename} deleted`)
      loadPdfs()
      loadStats()
    } catch (err) {
      setMsg(err.response?.data?.detail || 'Failed to delete PDF')
    }
  }

  const clearAllPdfs = async () => {
    if (!confirm('Clear ALL uploaded PDFs? This cannot be undone.')) return
    try {
      await api.delete('/admin/pdfs/clear')
      setMsg('All PDFs cleared')
      loadPdfs()
      loadStats()
    } catch {}
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.brand}>⚖️ Legal AI</div>
        <div className={styles.adminBadge}>🛡️ Admin Panel</div>
        <nav className={styles.nav}>
          <button className={`${styles.navBtn} ${activeTab === 'stats' ? styles.active : ''}`} onClick={() => setActiveTab('stats')}>📊 Statistics</button>
          <button className={`${styles.navBtn} ${activeTab === 'users' ? styles.active : ''}`} onClick={() => setActiveTab('users')}>👥 Users</button>
          <button className={`${styles.navBtn} ${activeTab === 'pdfs' ? styles.active : ''}`} onClick={() => setActiveTab('pdfs')}>📄 PDFs</button>
        </nav>
        <div className={styles.sidebarDivider}></div>
<button 
  className={styles.navBtn} 
  onClick={() => navigate('/document-generator')}
>
  📝 Generate Docs
</button>
        <div className={styles.sidebarBottom}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>← Back to Chat</button>
          <button 
  className={styles.featureBtn} 
  onClick={() => navigate('/document-generator')}
>
  ⚡ Legal Documents
</button>

        </div>
      </div>

      {/* Main */}
      <div className={styles.main}>
        <div className={styles.header}>
          <h1>{activeTab === 'stats' ? '📊 Statistics' : activeTab === 'users' ? '👥 Users' : '📄 PDFs'}</h1>
          {msg && <div className={styles.msg}>{msg} <button onClick={() => setMsg('')}>✕</button></div>}
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>👥</div>
              <div className={styles.statValue}>{stats.total_users}</div>
              <div className={styles.statLabel}>Total Users</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>💬</div>
              <div className={styles.statValue}>{stats.total_sessions}</div>
              <div className={styles.statLabel}>Total Sessions</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📨</div>
              <div className={styles.statValue}>{stats.total_messages}</div>
              <div className={styles.statLabel}>Total Messages</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📄</div>
              <div className={styles.statValue}>{stats.total_pdfs}</div>
              <div className={styles.statLabel}>Uploaded PDFs</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🧩</div>
              <div className={styles.statValue}>{stats.total_chunks}</div>
              <div className={styles.statLabel}>PDF Chunks Indexed</div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Sessions</th>
                  <th>Messages</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.username === 'admin' ? '🛡️ ' : ''}{u.username}</td>
                    <td>{u.email}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>{u.total_sessions}</td>
                    <td>{u.total_messages}</td>
                    <td>
                      {u.username !== 'admin' && (
                        <button className={styles.deleteBtn} onClick={() => deleteUser(u.id, u.username)}>
                          🗑 Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* PDFs Tab */}
        {activeTab === 'pdfs' && (
          <div>
            <div className={styles.pdfActions}>
              <button className={styles.clearBtn} onClick={clearAllPdfs}>🗑 Clear All PDFs</button>
            </div>
            {pdfs.length === 0 ? (
              <p className={styles.empty}>No PDFs uploaded yet</p>
            ) : (
              <div className={styles.pdfList}>
                {pdfs.map((p, i) => (
                  <div key={i} className={styles.pdfCard}>
                    <div className={styles.pdfInfo}> 
                      <div className={styles.pdfName}>📄 {p.filename}</div>
                      <div className={styles.pdfDate}>Uploaded: {new Date(p.upload_time).toLocaleString()}</div>
                    </div>
                    <button className={styles.deleteBtn} onClick={() => deletePdf(p.filename)}>
                      🗑 Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}