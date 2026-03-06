import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import styles from './Chat.module.css'
import ReactMarkdown from 'react-markdown'
import ThemeToggle from '../components/ThemeToggle'

export default function Chat() {
  const [sessions, setSessions] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [citations, setCitations] = useState([])
  const [showCitations, setShowCitations] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()
  const username = localStorage.getItem('username')

  useEffect(() => { loadSessions() }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadSessions = async () => {
    try {
      const res = await api.get('/chat/sessions')
      setSessions(res.data.sessions)
    } catch {}
  }

  const newChat = async () => {
    try {
      const res = await api.post('/chat/session/new')
      const sessionId = res.data.session_id
      await loadSessions()
      setActiveSession(sessionId)
      setMessages([])
      setCitations([])
    } catch {}
  }

  const loadSession = async (sessionId) => {
    setActiveSession(sessionId)
    setCitations([])
    try {
      const res = await api.get(`/chat/session/${sessionId}/messages`)
      const msgs = res.data.messages.map(m => ({
        role: m.role,
        content: m.content,
        citations: m.citations,
        relevant_laws: m.relevant_laws
      }))
      setMessages(msgs)
    } catch {}
  }

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation()
    try {
      await api.delete(`/chat/session/${sessionId}`)
      if (activeSession === sessionId) {
        setActiveSession(null)
        setMessages([])
      }
      loadSessions()
    } catch {}
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    let sessionId = activeSession
    if (!sessionId) {
      try {
        const res = await api.post('/chat/session/new')
        sessionId = res.data.session_id
        setActiveSession(sessionId)
        await loadSessions()
      } catch {
        return
      }
    }

    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    const currentInput = input
    setInput('')
    setLoading(true)

    try {
      const res = await api.get('/ask', {
        params: { question: currentInput, session_id: sessionId }
      })
      const assistantMsg = {
        role: 'assistant',
        content: res.data.answer,
        citations: res.data.citations,
        relevant_laws: res.data.relevant_laws,
        summary: res.data.summary
      }
      setMessages(prev => [...prev, assistantMsg])
      if (res.data.citations?.length > 0) {
        setCitations(res.data.citations)
      }
      loadSessions()
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) return
    setUploading(true)
    setUploadMsg('')
    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      const res = await api.post('/upload_pdf', formData)
      setUploadMsg(res.data.message)
      setUploadFile(null)
    } catch {
      setUploadMsg('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const logout = () => {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarTop}>
          <div className={styles.brand}>⚖️ Legal AI</div>
          <div className={styles.sidebarControls}>
  <button className={styles.newChat} onClick={newChat} style={{flex: 1, marginRight: '8px'}}>+ New Chat</button>
  <ThemeToggle />
</div>
          
        </div>

        <div className={styles.sessionList}>
          {sessions.length === 0 && (
            <p className={styles.noSessions}>No conversations yet</p>
          )}
          {sessions.map(s => (
            <div
              key={s.session_id}
              className={`${styles.sessionItem} ${activeSession === s.session_id ? styles.active : ''}`}
              onClick={() => loadSession(s.session_id)}
            >
              <span className={styles.sessionTitle}>{s.title}</span>
              <button
                className={styles.deleteBtn}
                onClick={(e) => deleteSession(e, s.session_id)}
              >🗑</button>
            </div>
          ))}
        </div>

        <div className={styles.sidebarBottom}>
          <button className={styles.uploadBtn} onClick={() => setShowUpload(!showUpload)}>
            📄 Upload PDF
          </button>
          {showUpload && (
            <div className={styles.uploadBox}>
              <input
                type="file"
                accept=".pdf"
                onChange={e => setUploadFile(e.target.files[0])}
                className={styles.fileInput}
              />
              <button
                className={styles.uploadSubmit}
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
              {uploadMsg && <p className={styles.uploadMsg}>{uploadMsg}</p>}
            </div>
          )}
          {username === 'admin' && (
  <button className={styles.uploadBtn} onClick={() => navigate('/admin')} style={{marginBottom: '8px'}}>
    🛡️ Admin Panel
  </button>
)}

          <div className={styles.userInfo}>
            <span>👤 {username}</span>
            <button className={styles.logoutBtn} onClick={logout}>Logout</button>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className={styles.main}>
        {messages.length === 0 ? (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>⚖️</div>
            <h2>Legal AI Assistant</h2>
            <p>Ask any question about Indian law</p>
            <div className={styles.suggestions}>
              {['What is punishment for murder?', 'What are fundamental rights?', 'What is Section 420 IPC?'].map(s => (
                <button key={s} className={styles.suggestion} onClick={() => setInput(s)}>{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.messages}>
            {messages.map((msg, i) => (
              <div key={i} className={`${styles.message} ${styles[msg.role]}`}>
                <div className={styles.avatar}>
                  {msg.role === 'user' ? '👤' : '⚖️'}
                </div>
                <div className={styles.bubble}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                  {msg.role === 'assistant' && msg.citations?.length > 0 && (
                    <button
                      className={styles.citationBtn}
                      onClick={() => { setCitations(msg.citations); setShowCitations(true) }}
                    >
                      📚 {msg.citations.length} source{msg.citations.length > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className={`${styles.message} ${styles.assistant}`}>
                <div className={styles.avatar}>⚖️</div>
                <div className={styles.bubble}>
                  <div className={styles.typing}>
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className={styles.inputArea}>
          <div className={styles.inputBox}>
            <textarea
              className={styles.textarea}
              placeholder="Ask a legal question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              rows={1}
            />
            <button
              className={styles.sendBtn}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              title={loading ? 'Generating...' : 'Send'}
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
          <p className={styles.disclaimer}>Legal AI may make mistakes. Verify important information.</p>
        </div>
      </div>

      {/* Citations Panel */}
      {showCitations && citations.length > 0 && (
        <div className={styles.citationsPanel}>
          <div className={styles.citationsHeader}>
            <h3>📚 Sources</h3>
            <button onClick={() => setShowCitations(false)}>✕</button>
          </div>
          <div className={styles.citationsList}>
            {citations.map((c, i) => (
              <div key={i} className={styles.citationCard}>
                <div className={styles.citationSource}>
                  {c.type === 'law' ? '⚖️' : '📄'} {c.source}
                  {c.page && <span className={styles.page}>Page {c.page}</span>}
                </div>
                {c.title && <div className={styles.citationTitle}>{c.title}</div>}
                <div className={styles.citationPassage}>{c.passage}</div>
                <div className={styles.citationScore}>
                  Relevance: {(c.relevance_score * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}