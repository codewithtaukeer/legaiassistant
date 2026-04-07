import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import ReactMarkdown from 'react-markdown'
import ArgueMode from './ArgueMode' // <-- import ArgueMode

const DOCUMENT_TYPES = [
  { id: 'fir', name: 'FIR', icon: '📋' },
  { id: 'notice', name: 'Legal Notice', icon: '📬' },
  { id: 'rental', name: 'Rental Agreement', icon: '🏠' },
  { id: 'affidavit', name: 'Affidavit', icon: '✍️' },
]

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
  const [listening, setListening] = useState(false)
  const [llmMode, setLlmMode] = useState('auto')
  const [showNews, setShowNews] = useState(false)
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [showNewsModal, setShowNewsModal] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [newsFilter, setNewsFilter] = useState('All')

  const [chatMode, setChatMode] = useState('normal')
  const [documentType, setDocumentType] = useState('')
  const [documentDraft, setDocumentDraft] = useState({})
  const [showDocPicker, setShowDocPicker] = useState(false)

  // NEW: argue mode toggle
  const [showArgueMode, setShowArgueMode] = useState(false)

  const messagesEndRef = useRef(null)
  const navigate = useNavigate()
  const username = localStorage.getItem('username')

  useEffect(() => { loadSessions() }, [])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const loadSessions = async () => {
    try { const res = await api.get('/chat/sessions'); setSessions(res.data.sessions) } catch {}
  }

  const loadNews = async () => {
    setNewsLoading(true)
    try { const res = await api.get('/news'); setNews(res.data.articles || []); setLastUpdated(res.data.last_updated) }
    catch {} finally { setNewsLoading(false) }
  }

  const refreshNews = async () => {
    setNewsLoading(true)
    try { await api.post('/news/refresh'); await loadNews() }
    catch {} finally { setNewsLoading(false) }
  }

  const newChat = async () => {
    try {
      const res = await api.post('/chat/session/new')
      await loadSessions(); setActiveSession(res.data.session_id); setMessages([]); setCitations([])
      setChatMode('normal')
      setDocumentType('')
      setDocumentDraft({})
      setShowDocPicker(false)
      setShowArgueMode(false) // close argue mode on new chat
    } catch {}
  }

  const loadSession = async (sessionId) => {
    setActiveSession(sessionId); setCitations([])
    setShowArgueMode(false) // close argue mode when loading session
    try {
      const res = await api.get(`/chat/session/${sessionId}/messages`)
      setMessages(res.data.messages.map(m => ({ role: m.role, content: m.content, citations: m.citations, relevant_laws: m.relevant_laws })))
    } catch {}
  }

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation()
    try {
      await api.delete(`/chat/session/${sessionId}`)
      if (activeSession === sessionId) { setActiveSession(null); setMessages([]) }
      loadSessions()
    } catch {}
  }

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input requires Chrome.'); return }
    const r = new SR(); r.lang = 'en-IN'; r.interimResults = false; r.maxAlternatives = 1
    r.onstart = () => setListening(true); r.onend = () => setListening(false); r.onerror = () => setListening(false)
    r.onresult = (e) => setInput(prev => prev + e.results[0][0].transcript)
    r.start()
  }

  const handleFeedback = async (msgIndex, feedback) => {
    setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, feedback } : m))
    try { await api.post('/feedback', { message_id: `${activeSession}-${msgIndex}`, feedback }) } catch {}
  }

  const cycleLlmMode = () => setLlmMode(m => m === 'auto' ? 'online' : m === 'online' ? 'offline' : 'auto')
  const modeIcon = llmMode === 'auto' ? '🔄' : llmMode === 'online' ? '🌐' : '🔒'
  const modeTitle = llmMode === 'auto' ? 'Auto' : llmMode === 'online' ? 'Groq Online' : 'Ollama Offline'
  const logout = () => { localStorage.clear(); navigate('/landing') }

  const suggestions = ['What is punishment for murder?', 'What are fundamental rights?', 'What is Section 420 IPC?']

  const switchToNormal = () => {
    setChatMode('normal')
    setDocumentType('')
    setDocumentDraft({})
    setShowDocPicker(false)
  }

  const handleDocTypePick = (docType) => {
    setChatMode('document')
    setDocumentType(docType)
    setShowDocPicker(false)
    setDocumentDraft({})
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Document mode enabled. You selected **${docType.toUpperCase()}**. Start describing your issue and I will ask follow-up questions if needed.`
    }])
  }

  const handleGenerateDocumentNow = async () => {
    if (!documentType) return
    if (!input.trim()) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Please type the facts first, then press Send or Generate.' }])
      return
    }
    await sendDocumentMessage(input.trim(), true)
  }

  const sendDocumentMessage = async (userText, forceGenerate = false) => {
    let sessionId = activeSession
    if (!sessionId) {
      try {
        const res = await api.post('/chat/session/new')
        sessionId = res.data.session_id; setActiveSession(sessionId); await loadSessions()
      } catch { return }
    }
    setMessages(prev => [...prev, { role: 'user', content: userText }])
    setInput('')
    setLoading(true)
    try {
      const res = await api.post('/documents/chat', {
        session_id: sessionId, document_type: documentType, message: userText,
        draft: documentDraft, mode: llmMode, force_generate: forceGenerate,
      })
      if (res.data.draft) setDocumentDraft(res.data.draft)
      const assistantMsg = {
        role: 'assistant', content: res.data.answer, citations: res.data.citations || [],
        relevant_laws: [], summary: '', related_questions: [], options: res.data.options || [],
        download_url: res.data.download_url || '', document_generated: !!res.data.document_generated,
        document_type: res.data.document_type || documentType, can_generate: !!res.data.can_generate,
      }
      setMessages(prev => [...prev, assistantMsg])
      if (res.data.citations?.length > 0) setCitations(res.data.citations)
      loadSessions()
      if (res.data.document_generated && res.data.download_url) setShowDocPicker(false)
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally { setLoading(false) }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    if (chatMode === 'document') return sendDocumentMessage(input, false)

    let sessionId = activeSession
    if (!sessionId) {
      try {
        const res = await api.post('/chat/session/new')
        sessionId = res.data.session_id; setActiveSession(sessionId); await loadSessions()
      } catch { return }
    }
    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    const currentInput = input; setInput(''); setLoading(true)
    try {
      const res = await api.get('/ask', { params: { question: currentInput, session_id: sessionId, mode: llmMode, chat_mode: 'normal' } })
      setMessages(prev => [...prev, {
        role: 'assistant', content: res.data.answer, case_analysis: res.data.case_analysis || '',
        citations: res.data.citations, relevant_laws: res.data.relevant_laws,
        summary: res.data.summary, related_questions: res.data.related_questions || []
      }])
      if (res.data.citations?.length > 0) setCitations(res.data.citations)
      loadSessions()
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    } finally { setLoading(false) }
  }

  const handleUpload = async () => {
    if (!uploadFile) return; setUploading(true); setUploadMsg('')
    try {
      const formData = new FormData(); formData.append('file', uploadFile)
      const res = await api.post('/upload_pdf', formData)
      setUploadMsg(res.data.message); setUploadFile(null)
    } catch { setUploadMsg('Upload failed. Please try again.') }
    finally { setUploading(false) }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        :root{--gold:#c9a84c;--gold-light:#e8cc7a;--gold-dim:rgba(201,168,76,0.12);--gold-border:rgba(201,168,76,0.2);--dark:#080808;--dark2:#0f0f0f;--dark3:#161616;--dark4:#1e1e1e;--dark5:#252525;--text1:#f0ebe0;--text2:#b8b0a0;--text3:#6b6560;--border:rgba(201,168,76,0.15);--border2:rgba(255,255,255,0.06);--danger:rgba(255,80,80,0.8)}
        body{background:var(--dark);color:var(--text1);font-family:'DM Sans',sans-serif;overflow:hidden}
        .chat-layout{display:flex;height:100vh;overflow:hidden}

        /* SIDEBAR */
        .chat-sidebar{width:260px;min-width:260px;background:var(--dark2);border-right:1px solid var(--border2);display:flex;flex-direction:column;overflow:hidden}
        .sb-top{padding:16px;border-bottom:1px solid var(--border2)}
        .sb-brand{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:var(--text1);display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;border-radius:8px;transition:all 0.2s;margin-bottom:12px;text-decoration:none}
        .sb-brand:hover{background:var(--dark3);color:var(--gold)}
        .sb-brand span{color:var(--gold)}
        .sb-new-btn{width:100%;background:var(--gold);border:none;border-radius:8px;padding:10px 16px;font-size:14px;font-weight:500;color:#080808;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:6px}
        .sb-new-btn:hover{background:var(--gold-light);transform:translateY(-1px)}
        .sb-sessions{flex:1;overflow-y:auto;padding:8px}
        .sb-sessions::-webkit-scrollbar{width:4px}
        .sb-sessions::-webkit-scrollbar-track{background:transparent}
        .sb-sessions::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
        .sb-session{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:8px;cursor:pointer;transition:all 0.15s;gap:8px;margin-bottom:2px}
        .sb-session:hover{background:var(--dark3)}
        .sb-session.active{background:var(--gold-dim);border:1px solid var(--gold-border)}
        .sb-session-title{font-size:13px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
        .sb-session.active .sb-session-title{color:var(--text1)}
        .sb-del-btn{background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 4px;border-radius:4px;transition:all 0.2s;flex-shrink:0;opacity:0}
        .sb-session:hover .sb-del-btn{opacity:1}
        .sb-del-btn:hover{color:var(--danger);background:rgba(255,80,80,0.1)}
        .sb-no-sessions{font-size:13px;color:var(--text3);text-align:center;padding:24px 16px;font-style:italic;font-family:'Cormorant Garamond',serif}
        .sb-bottom{padding:12px;border-top:1px solid var(--border2);display:flex;flex-direction:column;gap:8px}
        .sb-action-btn{width:100%;background:none;border:1px solid var(--border2);border-radius:8px;padding:9px 14px;font-size:13px;color:var(--text2);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;text-align:left;display:flex;align-items:center;gap:8px}
        .sb-action-btn:hover{border-color:var(--gold-border);color:var(--gold);background:var(--gold-dim)}
        .sb-action-btn.active{background:var(--gold-dim);border-color:rgba(201,168,76,0.35);color:var(--gold)}
        .sb-user{display:flex;align-items:center;justify-content:space-between;padding:8px 4px}
        .sb-username{font-size:13px;color:var(--text3);display:flex;align-items:center;gap:6px}
        .sb-logout{background:none;border:none;color:var(--text3);font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:color 0.2s;padding:4px 8px;border-radius:4px}
        .sb-logout:hover{color:var(--danger)}
        .upload-box{background:var(--dark3);border:1px solid var(--border2);border-radius:10px;padding:12px;animation:slideDown 0.2s ease}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .upload-input{display:block;font-size:12px;color:var(--text3);margin-bottom:8px;cursor:pointer}
        .upload-input::file-selector-button{background:var(--dark4);border:1px solid var(--border2);color:var(--text2);padding:4px 10px;border-radius:4px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;margin-right:8px}
        .upload-input::file-selector-button:hover{border-color:var(--gold-border);color:var(--gold)}
        .upload-submit{width:100%;background:var(--gold);border:none;border-radius:6px;padding:8px;font-size:13px;font-weight:500;color:#080808;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;margin-top:4px}
        .upload-submit:hover:not(:disabled){background:var(--gold-light)}
        .upload-submit:disabled{opacity:0.5;cursor:not-allowed}
        .upload-msg{font-size:12px;color:var(--gold);margin-top:8px;text-align:center}
        .doc-mode-box{background:var(--dark3);border:1px solid var(--border2);border-radius:10px;padding:10px 12px;margin-top:8px}
        .doc-mode-title{font-size:12px;color:var(--gold);margin-bottom:8px}
        .doc-type-row{display:flex;flex-wrap:wrap;gap:6px}
        .doc-pill{background:transparent;border:1px solid var(--border2);color:var(--text2);border-radius:999px;padding:6px 10px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s}
        .doc-pill:hover{border-color:var(--gold-border);color:var(--gold)}
        .doc-pill.active{background:var(--gold-dim);border-color:var(--gold-border);color:var(--gold)}

        /* MAIN */
        .chat-main{flex:1;display:flex;flex-direction:column;overflow:hidden;background:var(--dark);position:relative}
        .chat-main-bg{position:absolute;inset:0;background:radial-gradient(ellipse 60% 40% at 50% 0%,rgba(201,168,76,0.04) 0%,transparent 60%);pointer-events:none}

        /* WELCOME */
        .chat-welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;position:relative;z-index:1}
        .welcome-icon{font-size:52px;margin-bottom:20px;animation:welcomeIn 0.6s ease both}
        .welcome-title{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:700;color:var(--text1);margin-bottom:8px;animation:welcomeIn 0.6s ease 0.1s both}
        .welcome-sub{font-size:15px;color:var(--text3);margin-bottom:40px;font-style:italic;font-family:'Cormorant Garamond',serif;animation:welcomeIn 0.6s ease 0.2s both}
        @keyframes welcomeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .welcome-suggestions{display:flex;flex-direction:column;gap:10px;width:100%;max-width:500px;animation:welcomeIn 0.6s ease 0.3s both}
        .suggestion-btn{background:var(--dark3);border:1px solid var(--border2);border-radius:12px;padding:14px 20px;font-size:14px;color:var(--text2);cursor:pointer;text-align:left;font-family:'DM Sans',sans-serif;transition:all 0.2s;display:flex;align-items:center;gap:10px}
        .suggestion-btn::before{content:'⚖️';font-size:16px}
        .suggestion-btn:hover{border-color:var(--gold-border);color:var(--text1);background:var(--gold-dim);transform:translateX(4px)}

        /* MESSAGES */
        .chat-messages{flex:1;overflow-y:auto;padding:24px 40px;display:flex;flex-direction:column;gap:20px;position:relative;z-index:1}
        .chat-messages::-webkit-scrollbar{width:4px}
        .chat-messages::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
        .msg-row{display:flex;gap:12px;animation:msgIn 0.3s ease both}
        @keyframes msgIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .msg-row.user{flex-direction:row-reverse}
        .msg-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;border:1px solid var(--border2)}
        .msg-row.assistant .msg-avatar{background:var(--gold-dim);border-color:var(--gold-border)}
        .msg-row.user .msg-avatar{background:var(--dark3)}
        .msg-content{display:flex;flex-direction:column;gap:8px;max-width:72%}
        .msg-row.user .msg-content{align-items:flex-end}
        .msg-bubble{padding:14px 18px;border-radius:14px;font-size:14px;line-height:1.65}
        .msg-row.assistant .msg-bubble{background:var(--dark3);border:1px solid var(--border2);border-radius:14px 14px 14px 4px;color:var(--text1)}
        .msg-row.user .msg-bubble{background:var(--gold-dim);border:1px solid var(--gold-border);border-radius:14px 14px 4px 14px;color:var(--text1)}
        .msg-bubble p{margin-bottom:8px}
        .msg-bubble p:last-child{margin-bottom:0}
        .msg-bubble h1,.msg-bubble h2,.msg-bubble h3{font-family:'Cormorant Garamond',serif;color:var(--text1);margin:12px 0 6px}
        .msg-bubble strong{color:var(--gold-light)}
        .msg-bubble ul,.msg-bubble ol{padding-left:20px;margin:8px 0}
        .msg-bubble li{margin-bottom:4px}
        .msg-bubble code{background:var(--dark4);padding:2px 6px;border-radius:4px;font-size:13px}
        .msg-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .msg-fb-btn{background:none;border:1px solid var(--border2);border-radius:6px;padding:4px 9px;font-size:13px;cursor:pointer;color:var(--text3);transition:all 0.2s}
        .msg-fb-btn:hover{border-color:var(--gold-border);color:var(--gold)}
        .msg-fb-btn.active{background:var(--gold-dim);border-color:var(--gold-border);color:var(--gold)}
        .msg-cite-btn{background:var(--dark3);border:1px solid var(--border2);border-radius:6px;padding:4px 10px;font-size:12px;color:var(--text3);cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:4px}
        .msg-cite-btn:hover{border-color:var(--gold-border);color:var(--gold)}
        .case-analysis{background:var(--dark3);border:1px solid var(--gold-border);border-left:3px solid var(--gold);border-radius:12px;padding:16px 18px;max-width:100%}
        .case-analysis-hdr{font-size:11px;font-weight:600;color:var(--gold);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;display:flex;align-items:center;gap:6px}
        .related-questions{display:flex;flex-direction:column;gap:6px;max-width:100%}
        .related-btn{background:var(--dark3);border:1px solid var(--border2);border-radius:8px;padding:9px 14px;font-size:13px;color:var(--text3);cursor:pointer;text-align:left;font-family:'DM Sans',sans-serif;transition:all 0.2s}
        .related-btn:hover{border-color:var(--gold-border);color:var(--text1);background:var(--gold-dim)}
        .doc-options{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
        .doc-option-btn{background:var(--gold-dim);border:1px solid var(--gold-border);color:var(--gold);border-radius:8px;padding:8px 12px;font-size:13px;cursor:pointer}

        /* TYPING */
        .typing{display:flex;gap:4px;align-items:center;padding:4px 0}
        .typing span{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:typingDot 1.2s ease infinite}
        .typing span:nth-child(2){animation-delay:0.2s}
        .typing span:nth-child(3){animation-delay:0.4s}
        @keyframes typingDot{0%,60%,100%{transform:translateY(0);opacity:0.4}30%{transform:translateY(-6px);opacity:1}}

        /* INPUT */
        .chat-input-area{padding:16px 40px 20px;position:relative;z-index:2;border-top:1px solid var(--border2);background:rgba(8,8,8,0.8);backdrop-filter:blur(10px)}
        .chat-input-box{display:flex;gap:8px;align-items:flex-end;background:var(--dark3);border:1px solid var(--border2);border-radius:14px;padding:10px 12px;transition:border-color 0.2s}
        .chat-input-box:focus-within{border-color:var(--gold-border);box-shadow:0 0 0 3px rgba(201,168,76,0.06)}
        .chat-textarea{flex:1;background:none;border:none;outline:none;resize:none;font-size:14px;color:var(--text1);font-family:'DM Sans',sans-serif;min-height:24px;max-height:120px;line-height:1.5;padding:2px 0}
        .chat-textarea::placeholder{color:var(--text3)}
        .input-icon-btn{background:none;border:1px solid var(--border2);border-radius:8px;width:36px;height:36px;font-size:15px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.2s;color:var(--text3)}
        .input-icon-btn:hover{border-color:var(--gold-border);color:var(--gold);background:var(--gold-dim)}
        .input-icon-btn.mic-active{background:rgba(255,80,80,0.1);border-color:rgba(255,80,80,0.4);animation:micPulse 1s ease infinite}
        @keyframes micPulse{0%,100%{box-shadow:none}50%{box-shadow:0 0 0 4px rgba(255,80,80,0.15)}}
        .input-send-btn{background:var(--gold);border:none;border-radius:8px;width:36px;height:36px;font-size:15px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all 0.2s;color:#080808;font-weight:700}
        .input-send-btn:hover:not(:disabled){background:var(--gold-light);transform:scale(1.05)}
        .input-send-btn:disabled{opacity:0.4;cursor:not-allowed}
        .input-meta{display:flex;align-items:center;justify-content:space-between;margin-top:8px;padding:0 2px}
        .input-mode-badge{font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px}
        .input-mode-dot{width:5px;height:5px;border-radius:50%;background:var(--gold)}
        .input-disclaimer{font-size:11px;color:var(--text3)}

        /* CITATIONS PANEL */
        .cite-panel{width:320px;min-width:320px;background:var(--dark2);border-left:1px solid var(--border2);display:flex;flex-direction:column;overflow:hidden;animation:slideFromRight 0.25s ease}
        @keyframes slideFromRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        .cite-hdr{padding:16px 20px;border-bottom:1px solid var(--border2);display:flex;align-items:center;justify-content:space-between}
        .cite-hdr h3{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:var(--text1)}
        .cite-close{background:none;border:1px solid var(--border2);border-radius:6px;width:28px;height:28px;cursor:pointer;color:var(--text3);display:flex;align-items:center;justify-content:center;transition:all 0.2s}
        .cite-close:hover{border-color:rgba(255,80,80,0.4);color:var(--danger)}
        .cite-list{overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
        .cite-list::-webkit-scrollbar{width:3px}
        .cite-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
        .cite-card{background:var(--dark3);border:1px solid var(--border2);border-radius:10px;padding:12px 14px;transition:border-color 0.2s}
        .cite-card:hover{border-color:var(--gold-border)}
        .cite-source{font-size:12px;font-weight:600;color:var(--gold);display:flex;align-items:center;gap:6px;margin-bottom:4px}
        .cite-page{font-size:11px;color:var(--text3);background:var(--dark4);padding:1px 6px;border-radius:4px;margin-left:auto}
        .cite-title{font-size:12px;color:var(--text3);margin-bottom:6px;font-style:italic}
        .cite-passage{font-size:12px;color:var(--text2);line-height:1.5}
        .cite-score{font-size:11px;color:var(--text3);margin-top:8px;display:flex;align-items:center;gap:4px}
        .cite-score-bar{height:3px;background:var(--gold-dim);border-radius:2px;flex:1}

        /* NEWS MODAL */
        .news-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px}
        .news-modal{background:rgba(15,15,15,0.97);border:1px solid var(--gold-border);border-radius:20px;width:100%;max-width:1100px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column}
        .news-modal-hdr{display:flex;align-items:flex-start;justify-content:space-between;padding:24px 28px 16px;border-bottom:1px solid var(--border2)}
        .news-modal-title{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:var(--text1);margin:0}
        .news-modal-sub{font-size:12px;color:var(--text3);margin-top:4px}
        .news-modal-actions{display:flex;align-items:center;gap:10px}
        .news-refresh-btn,.news-close-btn{background:var(--dark4);border:1px solid var(--border2);border-radius:8px;padding:8px 14px;font-size:13px;color:var(--text2);cursor:pointer;font-family:'DM Sans',sans-serif}
        .news-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;padding:20px 28px;overflow-y:auto;flex:1}
        .news-card{background:rgba(255,255,255,0.03);border:1px solid var(--border2);border-radius:14px;padding:18px;cursor:pointer;display:flex;flex-direction:column;gap:8px;transition:all 0.2s}
        .news-card:hover{border-color:var(--gold-border);transform:translateY(-2px)}
        .news-card-top{display:flex;align-items:center;justify-content:space-between}
        .news-card-source{font-size:10px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:0.8px}
        .news-card-cat{font-size:10px;background:var(--dark4);border:1px solid var(--border2);border-radius:10px;padding:2px 8px;color:var(--text3)}
        .news-card-title{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:var(--text1);line-height:1.4}
        .news-card-summary{font-size:12px;color:var(--text3);line-height:1.5;flex:1}
        .news-card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:4px}
        .news-card-date{font-size:11px;color:var(--text3)}
        .news-read-more{font-size:12px;color:var(--gold);font-weight:500}
        .news-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px;color:var(--text3);gap:16px}
        .news-spinner{width:36px;height:36px;border:2px solid var(--border2);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .news-cat-bar{display:flex;gap:8px;padding:12px 28px;border-bottom:1px solid var(--border2);overflow-x:auto}
        .news-cat-btn{background:none;border:1px solid var(--border2);border-radius:999px;padding:5px 14px;font-size:12px;color:var(--text3);cursor:pointer;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:all 0.2s}
        .news-cat-btn:hover,.news-cat-btn.active{border-color:var(--gold-border);color:var(--gold);background:var(--gold-dim)}
        .article-modal{background:rgba(15,15,15,0.97);border:1px solid var(--gold-border);border-radius:20px;width:100%;max-width:680px;max-height:85vh;overflow-y:auto;padding:32px;display:flex;flex-direction:column;gap:16px}
        .article-modal-hdr{display:flex;align-items:center;justify-content:space-between}
        .article-modal-meta{display:flex;align-items:center;gap:8px}
        .article-modal-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--text1);line-height:1.4;margin:0}
        .article-modal-date{font-size:12px;color:var(--text3);margin:0}
        .article-divider{height:1px;background:var(--border2)}
        .article-body{font-size:15px;color:var(--text2);line-height:1.75}
        .article-read-full{display:inline-flex;align-items:center;gap:8px;background:var(--gold);color:#080808;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px;font-weight:500;transition:all 0.2s}
        .article-read-full:hover{background:var(--gold-light)}
      `}</style>

      <div className="chat-layout">
        {/* Sidebar */}
        <div className="chat-sidebar">
          <div className="sb-top">
            <div className="sb-brand" onClick={() => navigate('/landing')}>⚖️ Legal<span>AI</span></div>
            <button className="sb-new-btn" onClick={newChat}>＋ New Chat</button>
          </div>

          <div className="sb-sessions">
            {sessions.length === 0 && <p className="sb-no-sessions">No conversations yet</p>}
            {sessions.map(s => (
              <div key={s.session_id}
                className={`sb-session ${activeSession === s.session_id && !showArgueMode ? 'active' : ''}`}
                onClick={() => loadSession(s.session_id)}>
                <span className="sb-session-title">{s.title}</span>
                <button className="sb-del-btn" onClick={(e) => deleteSession(e, s.session_id)}>🗑</button>
              </div>
            ))}
          </div>

          <div className="sb-bottom">
            <button className="sb-action-btn" onClick={() => setShowUpload(!showUpload)}>📄 Upload PDF</button>
            {showUpload && (
              <div className="upload-box">
                <input type="file" accept=".pdf" className="upload-input"
                  onChange={e => setUploadFile(e.target.files[0])} />
                <button className="upload-submit" onClick={handleUpload} disabled={!uploadFile || uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                {uploadMsg && <p className="upload-msg">{uploadMsg}</p>}
              </div>
            )}

            <button className="sb-action-btn" onClick={() => setShowDocPicker(v => !v)}>
              📝 Document Mode
            </button>
            {showDocPicker && (
              <div className="doc-mode-box">
                <div className="doc-mode-title">Choose document type</div>
                <div className="doc-type-row">
                  {DOCUMENT_TYPES.map(d => (
                    <button key={d.id} className={`doc-pill ${documentType === d.id ? 'active' : ''}`}
                      onClick={() => handleDocTypePick(d.id)}>
                      {d.icon} {d.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── ARGUE MODE BUTTON ── */}
            <button
              className={`sb-action-btn ${showArgueMode ? 'active' : ''}`}
              onClick={() => {
                setShowArgueMode(v => !v)
                setShowDocPicker(false)
              }}
            >
              ⚖️ Argue Both Sides
            </button>

            <button className="sb-action-btn" onClick={() => { setShowNewsModal(true); if (news.length === 0) loadNews() }}>
              📰 Legal News & Judgements
            </button>

            {username === 'admin' && (
              <button className="sb-action-btn" onClick={() => navigate('/admin')}>🛡️ Admin Panel</button>
            )}
            <div className="sb-user">
              <span className="sb-username">👤 {username}</span>
              <button className="sb-logout" onClick={logout}>Logout</button>
            </div>
          </div>
        </div>

        {/* Main Area */}
        <div className="chat-main">
          <div className="chat-main-bg" />

          {/* ── ARGUE MODE PANEL (replaces chat area) ── */}
          {showArgueMode ? (
            <ArgueMode onClose={() => setShowArgueMode(false)} />
          ) : (
            <>
              {messages.length === 0 ? (
                <div className="chat-welcome">
                  <div className="welcome-icon">⚖️</div>
                  <h2 className="welcome-title">Legal AI Assistant</h2>
                  <p className="welcome-sub">
                    {chatMode === 'document' && documentType
                      ? `Document mode: ${documentType.toUpperCase()}`
                      : 'Ask any question about Indian law'}
                  </p>
                  <div className="welcome-suggestions">
                    {suggestions.map(s => (
                      <button key={s} className="suggestion-btn" onClick={() => setInput(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="chat-messages">
                  {messages.map((msg, i) => (
                    <div key={i} className={`msg-row ${msg.role}`}>
                      <div className="msg-avatar">{msg.role === 'user' ? '👤' : '⚖️'}</div>
                      <div className="msg-content">
                        <div className="msg-bubble">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                          {msg.document_generated && msg.download_url && (
                            <div className="doc-options">
                              <a className="doc-option-btn"
                                href={`http://localhost:8000${msg.download_url}`}
                                target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                                📄 Open PDF
                              </a>
                              <a className="doc-option-btn"
                                href={`http://localhost:8000${msg.download_url}`}
                                download rel="noreferrer" style={{ textDecoration: 'none' }}>
                                ⬇ Download
                              </a>
                            </div>
                          )}
                          {msg.role === 'assistant' && (
                            <div className="msg-actions" style={{ marginTop: 10 }}>
                              <button className={`msg-fb-btn ${msg.feedback === 'up' ? 'active' : ''}`}
                                onClick={() => handleFeedback(i, 'up')}>👍</button>
                              <button className={`msg-fb-btn ${msg.feedback === 'down' ? 'active' : ''}`}
                                onClick={() => handleFeedback(i, 'down')}>👎</button>
                              {msg.citations?.length > 0 && (
                                <button className="msg-cite-btn"
                                  onClick={() => { setCitations(msg.citations); setShowCitations(true) }}>
                                  📚 {msg.citations.length} source{msg.citations.length > 1 ? 's' : ''}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {msg.role === 'assistant' && msg.case_analysis && (
                          <div className="case-analysis">
                            <div className="case-analysis-hdr">📋 Supporting Case Laws</div>
                            <ReactMarkdown>{msg.case_analysis}</ReactMarkdown>
                          </div>
                        )}
                        {msg.role === 'assistant' && msg.related_questions?.length > 0 && (
                          <div className="related-questions">
                            {msg.related_questions.map((q, qi) => (
                              <button key={qi} className="related-btn" onClick={() => setInput(q)}>💬 {q}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="msg-row assistant">
                      <div className="msg-avatar">⚖️</div>
                      <div className="msg-bubble">
                        <div className="typing"><span /><span /><span /></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}

              <div className="chat-input-area">
                <div className="chat-input-box">
                  <textarea className="chat-textarea"
                    placeholder={chatMode === 'document' ? 'Describe the facts for the document...' : 'Ask a legal question...'}
                    value={input} rows={1}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }} />
                  <button className="input-icon-btn" onClick={cycleLlmMode} title={`Mode: ${modeTitle}`}>{modeIcon}</button>
                  <button className={`input-icon-btn ${listening ? 'mic-active' : ''}`}
                    onClick={startVoice} disabled={loading} title="Voice input">
                    {listening ? '🔴' : '🎤'}
                  </button>
                  {chatMode === 'document' && documentType && (
                    <button className="input-icon-btn" onClick={handleGenerateDocumentNow} title="Generate document">📝</button>
                  )}
                  <button className="input-send-btn" onClick={sendMessage}
                    disabled={loading || !input.trim()} title="Send">
                    {loading ? '⏳' : '➤'}
                  </button>
                </div>
                <div className="input-meta">
                  <div className="input-mode-badge">
                    <div className="input-mode-dot" />
                    {chatMode === 'document' && documentType ? `Document mode • ${documentType.toUpperCase()}` : modeTitle}
                  </div>
                  <p className="input-disclaimer">Legal AI may make mistakes. Verify important information.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Citations Panel */}
        {showCitations && citations.length > 0 && !showArgueMode && (
          <div className="cite-panel">
            <div className="cite-hdr">
              <h3>📚 Sources</h3>
              <button className="cite-close" onClick={() => setShowCitations(false)}>✕</button>
            </div>
            <div className="cite-list">
              {citations.map((c, i) => (
                <div key={i} className="cite-card">
                  <div className="cite-source">
                    {c.type === 'law' ? '⚖️' : c.type === 'procedure' ? '🏛️' : c.type === 'case' ? '📋' : '📄'}
                    {c.source}
                    {c.page && <span className="cite-page">p.{c.page}</span>}
                  </div>
                  {c.title && <div className="cite-title">{c.title}</div>}
                  <div className="cite-passage">{c.passage}</div>
                  <div className="cite-score">
                    <div className="cite-score-bar">
                      <div style={{ width: `${(c.relevance_score * 100).toFixed(0)}%`, height: '100%', background: 'var(--gold)', borderRadius: 2 }} />
                    </div>
                    {(c.relevance_score * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* News Modal */}
        {showNewsModal && (
          <div className="news-overlay" onClick={() => setShowNewsModal(false)}>
            <div className="news-modal" onClick={e => e.stopPropagation()}>
              <div className="news-modal-hdr">
                <div>
                  <h2 className="news-modal-title">📰 Legal News & Judgements</h2>
                  {lastUpdated && <p className="news-modal-sub">Updated: {new Date(lastUpdated).toLocaleString()}</p>}
                </div>
                <div className="news-modal-actions">
                  <button className="news-refresh-btn" onClick={refreshNews} disabled={newsLoading}>
                    {newsLoading ? '⏳ Refreshing...' : '🔄 Refresh'}
                  </button>
                  <button className="news-close-btn" onClick={() => setShowNewsModal(false)}>✕</button>
                </div>
              </div>
              <div className="news-cat-bar">
                {['All', 'Supreme Court', 'General Legal', 'Corporate', 'Judgements'].map(cat => (
                  <button key={cat} className={`news-cat-btn ${newsFilter === cat ? 'active' : ''}`}
                    onClick={() => setNewsFilter(cat)}>{cat}</button>
                ))}
              </div>
              {newsLoading && news.length === 0 ? (
                <div className="news-loading">
                  <div className="news-spinner" />
                  Fetching latest legal news...
                </div>
              ) : (
                <div className="news-grid">
                  {news.filter(a => newsFilter === 'All' || a.category === newsFilter).slice(0, 30).map((article, i) => (
                    <div key={i} className="news-card" onClick={() => setSelectedArticle(article)}>
                      <div className="news-card-top">
                        <span className="news-card-source">{article.source}</span>
                        <span className="news-card-cat">{article.category}</span>
                      </div>
                      <h3 className="news-card-title">{article.title}</h3>
                      <p className="news-card-summary">{article.summary?.slice(0, 180)}...</p>
                      <div className="news-card-footer">
                        <span className="news-card-date">
                          {article.published ? new Date(article.published).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                        </span>
                        <span className="news-read-more">Read more →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Article Modal */}
        {selectedArticle && (
          <div className="news-overlay" onClick={() => setSelectedArticle(null)}>
            <div className="article-modal" onClick={e => e.stopPropagation()}>
              <div className="article-modal-hdr">
                <div className="article-modal-meta">
                  <span className="news-card-source">{selectedArticle.source}</span>
                  <span className="news-card-cat">{selectedArticle.category}</span>
                </div>
                <button className="news-close-btn" onClick={() => setSelectedArticle(null)}>✕</button>
              </div>
              <h2 className="article-modal-title">{selectedArticle.title}</h2>
              <p className="article-modal-date">{selectedArticle.published ? new Date(selectedArticle.published).toLocaleString('en-IN') : ''}</p>
              <div className="article-divider" />
              <p className="article-body">{selectedArticle.summary}</p>
              <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer" className="article-read-full">
                🔗 Read Full Article on {selectedArticle.source}
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  )
}