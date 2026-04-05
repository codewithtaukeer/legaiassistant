import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const isLoggedIn = !!localStorage.getItem('token')
  const username = localStorage.getItem('username')

  useEffect(() => {
    const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.15 }
    )
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const logout = () => { localStorage.clear(); navigate('/landing') }

  const features = [
    { icon: '⚖️', title: 'RAG-Powered Legal Intelligence', desc: 'Retrieval-Augmented Generation searches 80+ IPC sections, landmark case laws, and government procedures simultaneously.', tag: 'Core Technology' },
    { icon: '🔍', title: 'Hybrid Semantic Search', desc: 'FAISS vector search combined with BM25 keyword matching delivers precise results whether you ask by concept or exact section number.', tag: 'Search Engine' },
    { icon: '📋', title: 'Landmark Case Analysis', desc: '30+ Supreme Court judgements structured with facts, decisions, and significance — Bachan Singh, Vishaka, Kesavananda Bharati and more.', tag: 'Case Laws' },
    { icon: '🌐', title: 'Multilingual Support', desc: 'Ask in Hindi, Hinglish, or English. Auto-detects your language and responds naturally in the same style.', tag: 'Languages' },
    { icon: '📰', title: 'Live Legal News', desc: 'Real-time judgements from LiveLaw, Bar & Bench, Supreme Court Observer. Auto-refreshes every 4 hours.', tag: 'Live Updates' },
    { icon: '📄', title: 'Upload Your Documents', desc: 'Upload any legal PDF — contracts, FIRs, court orders — and ask questions directly about them with page citations.', tag: 'PDF Analysis' },
  ]

  const steps = [
    { num: '01', title: 'Ask Your Legal Question', desc: 'Type in plain language — Hindi, Hinglish, or English. Voice input supported.' },
    { num: '02', title: 'Parallel Search Across Sources', desc: 'System simultaneously searches IPC sections, case laws, procedures, and your uploaded PDFs.' },
    { num: '03', title: 'LLM Generates Structured Answer', desc: 'Groq (online) or Mistral (offline/private) synthesizes context into a clear, cited legal explanation.' },
    { num: '04', title: 'Cited Sources & Case Analysis', desc: 'Every answer includes relevance-ranked sources and structured landmark case breakdowns.' },
  ]

  const modes = [
    { icon: '🌐', label: 'Online Mode', title: 'Groq-Powered Speed', desc: 'Uses Groq API with Llama 3.3 70B for lightning-fast responses — 1-2 seconds per answer.', badge: 'Fast' },
    { icon: '🔒', label: 'Privacy Mode', title: 'Fully Offline with Ollama', desc: 'Your queries never leave your device. Mistral runs locally — complete data privacy.', badge: 'Private' },
    { icon: '🔄', label: 'Auto Mode', title: 'Intelligent Switching', desc: 'Automatically detects internet connectivity and chooses the best model.', badge: 'Smart' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        :root{--gold:#c9a84c;--gold-light:#e8cc7a;--gold-dim:rgba(201,168,76,0.12);--dark:#080808;--dark2:#0f0f0f;--dark3:#161616;--dark4:#1e1e1e;--text1:#f0ebe0;--text2:#b8b0a0;--text3:#6b6560;--border:rgba(201,168,76,0.15);--border2:rgba(255,255,255,0.06)}
        body{background:var(--dark);color:var(--text1);font-family:'DM Sans',sans-serif;overflow-x:hidden}
        .lp-nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:20px 60px;background:rgba(8,8,8,0.85);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
        .lp-brand{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--text1);display:flex;align-items:center;gap:10px;cursor:pointer;transition:opacity 0.2s;text-decoration:none}
        .lp-brand:hover{opacity:0.8}
        .lp-brand span{color:var(--gold)}
        .lp-actions{display:flex;gap:12px;align-items:center}
        .lp-user{font-size:13px;color:var(--text3);padding:8px 14px;border:1px solid var(--border2);border-radius:6px}
        .lp-btn-ghost{background:none;border:1px solid var(--border);color:var(--text2);padding:9px 22px;border-radius:6px;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s}
        .lp-btn-ghost:hover{border-color:var(--gold);color:var(--gold)}
        .lp-btn-primary{background:var(--gold);border:none;color:#080808;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s}
        .lp-btn-primary:hover{background:var(--gold-light);transform:translateY(-1px)}
        .lp-btn-danger{background:none;border:1px solid rgba(255,80,80,0.3);color:rgba(255,120,120,0.8);padding:9px 22px;border-radius:6px;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s}
        .lp-btn-danger:hover{border-color:rgba(255,80,80,0.6);color:rgb(255,120,120)}
        .lp-hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:120px 40px 80px;position:relative;overflow:hidden}
        .lp-hero-bg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(201,168,76,0.08) 0%,transparent 70%),radial-gradient(ellipse 50% 40% at 20% 80%,rgba(139,115,85,0.06) 0%,transparent 60%);pointer-events:none}
        .lp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(201,168,76,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.03) 1px,transparent 1px);background-size:60px 60px;pointer-events:none;mask-image:radial-gradient(ellipse 80% 80% at 50% 50%,black 0%,transparent 100%)}
        .lp-cursor{position:fixed;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(201,168,76,0.05) 0%,transparent 70%);pointer-events:none;z-index:0;transition:left 0.3s ease,top 0.3s ease;transform:translate(-50%,-50%)}
        .lp-badge{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);background:var(--gold-dim);padding:6px 16px;border-radius:20px;font-size:12px;color:var(--gold);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:32px;animation:lpFadeUp 0.8s ease both}
        .lp-badge::before{content:'';width:6px;height:6px;background:var(--gold);border-radius:50%;animation:lpPulse 2s ease infinite}
        @keyframes lpPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.3)}}
        .lp-title{font-family:'Cormorant Garamond',serif;font-size:clamp(52px,8vw,96px);font-weight:700;line-height:1.0;color:var(--text1);margin-bottom:12px;animation:lpFadeUp 0.8s ease 0.1s both;letter-spacing:-1px}
        .lp-title em{font-style:italic;color:var(--gold)}
        .lp-sub{font-family:'Cormorant Garamond',serif;font-size:clamp(22px,3vw,36px);font-weight:400;font-style:italic;color:var(--text3);margin-bottom:28px;animation:lpFadeUp 0.8s ease 0.2s both}
        .lp-desc{max-width:600px;margin:0 auto 48px;font-size:16px;color:var(--text2);line-height:1.7;animation:lpFadeUp 0.8s ease 0.3s both}
        .lp-cta{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;animation:lpFadeUp 0.8s ease 0.4s both}
        .lp-btn-lg{padding:15px 36px;font-size:15px;font-weight:500;border-radius:8px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.25s}
        .lp-btn-lg-p{background:var(--gold);color:#080808;border:none}
        .lp-btn-lg-p:hover{background:var(--gold-light);transform:translateY(-2px);box-shadow:0 12px 40px rgba(201,168,76,0.3)}
        .lp-btn-lg-g{background:none;color:var(--text1);border:1px solid var(--border2)}
        .lp-btn-lg-g:hover{border-color:var(--border);background:rgba(255,255,255,0.04)}
        .lp-stats{display:flex;gap:48px;justify-content:center;flex-wrap:wrap;margin-top:72px;padding-top:48px;border-top:1px solid var(--border2);animation:lpFadeUp 0.8s ease 0.5s both}
        .lp-stat-num{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:700;color:var(--gold);line-height:1}
        .lp-stat-lbl{font-size:13px;color:var(--text3);margin-top:6px;letter-spacing:0.5px}
        @keyframes lpFadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .lp-section{padding:100px 40px;position:relative}
        .lp-container{max-width:1100px;margin:0 auto}
        .lp-sec-lbl{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);margin-bottom:20px;font-weight:500}
        .lp-sec-lbl::before{content:'';width:20px;height:1px;background:var(--gold)}
        .lp-sec-title{font-family:'Cormorant Garamond',serif;font-size:clamp(36px,5vw,56px);font-weight:700;line-height:1.1;color:var(--text1);margin-bottom:16px}
        .lp-sec-desc{font-size:16px;color:var(--text2);line-height:1.7;max-width:560px}
        .lp-divider{width:48px;height:2px;background:var(--gold);margin:24px 0}
        .reveal{opacity:0;transform:translateY(40px);transition:opacity 0.7s ease,transform 0.7s ease}
        .reveal.visible{opacity:1;transform:translateY(0)}
        .rd1{transition-delay:0.1s}.rd2{transition-delay:0.2s}.rd3{transition-delay:0.3s}.rd4{transition-delay:0.4s}.rd5{transition-delay:0.5s}.rd6{transition-delay:0.6s}
        .lp-features{background:var(--dark2)}
        .lp-feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;border:1px solid var(--border2);border-radius:16px;overflow:hidden;margin-top:64px}
        .lp-feat-card{background:var(--dark3);padding:36px 32px;position:relative;overflow:hidden;transition:background 0.3s}
        .lp-feat-card::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,var(--gold-dim),transparent);opacity:0;transition:opacity 0.3s}
        .lp-feat-card:hover{background:var(--dark4)}
        .lp-feat-card:hover::after{opacity:1}
        .lp-feat-tag{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold);margin-bottom:16px;font-weight:500}
        .lp-feat-icon{font-size:28px;margin-bottom:16px;display:block}
        .lp-feat-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:var(--text1);margin-bottom:10px;line-height:1.2}
        .lp-feat-desc{font-size:14px;color:var(--text3);line-height:1.65}
        .lp-steps{background:var(--dark)}
        .lp-steps-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-top:64px}
        .lp-step{background:var(--dark3);padding:44px 40px;position:relative;overflow:hidden;transition:all 0.3s}
        .lp-step:nth-child(1){border-radius:16px 0 0 0}.lp-step:nth-child(2){border-radius:0 16px 0 0}.lp-step:nth-child(3){border-radius:0 0 0 16px}.lp-step:nth-child(4){border-radius:0 0 16px 0}
        .lp-step:hover{background:var(--dark4)}
        .lp-step-num{font-family:'Cormorant Garamond',serif;font-size:72px;font-weight:700;color:rgba(201,168,76,0.08);position:absolute;top:20px;right:24px;line-height:1;transition:color 0.3s}
        .lp-step:hover .lp-step-num{color:rgba(201,168,76,0.15)}
        .lp-step-dot{width:10px;height:10px;border-radius:50%;background:var(--gold);margin-bottom:20px;box-shadow:0 0 12px rgba(201,168,76,0.5)}
        .lp-step-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:var(--text1);margin-bottom:12px}
        .lp-step-desc{font-size:14px;color:var(--text3);line-height:1.65}
        .lp-modes{background:var(--dark2)}
        .lp-modes-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:64px}
        .lp-mode{border:1px solid var(--border2);border-radius:16px;padding:36px 28px;position:relative;overflow:hidden;transition:all 0.3s;background:var(--dark3)}
        .lp-mode:hover{border-color:var(--border);transform:translateY(-4px);box-shadow:0 20px 60px rgba(0,0,0,0.4)}
        .lp-mode-badge{position:absolute;top:20px;right:20px;background:var(--gold-dim);color:var(--gold);border:1px solid var(--border);font-size:10px;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:20px;font-weight:500}
        .lp-mode-icon{font-size:32px;margin-bottom:20px;display:block}
        .lp-mode-lbl{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold);margin-bottom:8px;font-weight:500}
        .lp-mode-title{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:var(--text1);margin-bottom:12px;line-height:1.2}
        .lp-mode-desc{font-size:14px;color:var(--text3);line-height:1.65}
        .lp-cta-sec{background:var(--dark);text-align:center;padding:120px 40px}
        .lp-cta-box{max-width:700px;margin:0 auto;border:1px solid var(--border);border-radius:24px;padding:72px 60px;background:linear-gradient(135deg,var(--dark3) 0%,var(--dark2) 100%);position:relative;overflow:hidden}
        .lp-cta-box::before{content:'';position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(201,168,76,0.08) 0%,transparent 70%);pointer-events:none}
        .lp-cta-title{font-family:'Cormorant Garamond',serif;font-size:clamp(36px,5vw,52px);font-weight:700;line-height:1.1;margin-bottom:16px}
        .lp-cta-title em{font-style:italic;color:var(--gold)}
        .lp-cta-desc{font-size:16px;color:var(--text2);margin-bottom:40px;line-height:1.6}
        .lp-footer{background:var(--dark2);border-top:1px solid var(--border2);padding:40px 60px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .lp-footer-brand{font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--text2)}
        .lp-footer-brand span{color:var(--gold)}
        .lp-footer-note{font-size:13px;color:var(--text3)}
        @media(max-width:900px){.lp-nav{padding:16px 24px}.lp-feat-grid{grid-template-columns:1fr 1fr}.lp-steps-grid{grid-template-columns:1fr}.lp-modes-grid{grid-template-columns:1fr}.lp-stats{gap:32px}.lp-section{padding:70px 24px}.lp-cta-box{padding:48px 32px}.lp-footer{padding:32px 24px}}
        @media(max-width:600px){.lp-feat-grid{grid-template-columns:1fr}.lp-step:nth-child(n){border-radius:0}}
      `}</style>

      <div style={{ minHeight: '100vh', background: 'var(--dark)', color: 'var(--text1)', fontFamily: "'DM Sans', sans-serif" }}>
        <div className="lp-cursor" style={{ left: mousePos.x, top: mousePos.y }} />

        {/* Nav */}
        <nav className="lp-nav">
          <div className="lp-brand" onClick={() => navigate('/landing')}>⚖️ Legal<span>AI</span></div>
          <div className="lp-actions">
            {isLoggedIn ? (
              <>
                <span className="lp-user">👤 {username}</span>
                <button className="lp-btn-ghost" onClick={() => navigate('/')}>Open App</button>
                <button className="lp-btn-danger" onClick={logout}>Logout</button>
              </>
            ) : (
              <>
                <button className="lp-btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
                <button className="lp-btn-primary" onClick={() => navigate('/register')}>Get Started</button>
              </>
            )}
          </div>
        </nav>

        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-hero-bg" /><div className="lp-grid" />
          <div className="lp-badge">Indian Legal Intelligence</div>
          <h1 className="lp-title">Your <em>Personal</em><br />Legal Counsel</h1>
          <p className="lp-sub">Powered by RAG · Grounded in Indian Law</p>
          <p className="lp-desc">Ask any question about the IPC, Constitution, CrPC, or your own legal documents. Get cited, structured answers in Hindi, Hinglish, or English — instantly.</p>
          <div className="lp-cta">
            {isLoggedIn ? (
              <button className="lp-btn-lg lp-btn-lg-p" onClick={() => navigate('/')}>Open Legal AI →</button>
            ) : (
              <>
                <button className="lp-btn-lg lp-btn-lg-p" onClick={() => navigate('/register')}>Start For Free →</button>
                <button className="lp-btn-lg lp-btn-lg-g" onClick={() => navigate('/login')}>Sign In</button>
              </>
            )}
          </div>
          <div className="lp-stats">
            {[['80+','Legal Sections'],['30+','Landmark Cases'],['3','Languages'],['100%','Privacy Mode']].map(([n,l]) => (
              <div key={l} style={{textAlign:'center'}}>
                <div className="lp-stat-num">{n}</div>
                <div className="lp-stat-lbl">{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="lp-section lp-features">
          <div className="lp-container">
            <div className="reveal" style={{marginBottom:0}}>
              <div className="lp-sec-lbl">Capabilities</div>
              <h2 className="lp-sec-title">Built for the Depth<br />Indian Law Demands</h2>
              <div className="lp-divider" />
              <p className="lp-sec-desc">Not a chatbot. A research-grade legal assistant that cites sources, references case laws, and explains government procedures step by step.</p>
            </div>
            <div className="lp-feat-grid">
              {features.map((f, i) => (
                <div key={i} className={`lp-feat-card reveal rd${i+1}`}>
                  <div className="lp-feat-tag">{f.tag}</div>
                  <span className="lp-feat-icon">{f.icon}</span>
                  <h3 className="lp-feat-title">{f.title}</h3>
                  <p className="lp-feat-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="lp-section lp-steps">
          <div className="lp-container">
            <div className="reveal">
              <div className="lp-sec-lbl">How It Works</div>
              <h2 className="lp-sec-title">From Question<br />to Cited Answer</h2>
              <div className="lp-divider" />
              <p className="lp-sec-desc">Four steps from your question to a structured, sourced legal answer — in seconds.</p>
            </div>
            <div className="lp-steps-grid">
              {steps.map((s, i) => (
                <div key={i} className={`lp-step reveal rd${i+1}`}>
                  <div className="lp-step-num">{s.num}</div>
                  <div className="lp-step-dot" />
                  <h3 className="lp-step-title">{s.title}</h3>
                  <p className="lp-step-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modes */}
        <section className="lp-section lp-modes">
          <div className="lp-container">
            <div className="reveal">
              <div className="lp-sec-lbl">Flexibility</div>
              <h2 className="lp-sec-title">You Control<br />Speed vs. Privacy</h2>
              <div className="lp-divider" />
              <p className="lp-sec-desc">Toggle between cloud-powered speed and fully local privacy — or let the system decide automatically.</p>
            </div>
            <div className="lp-modes-grid">
              {modes.map((m, i) => (
                <div key={i} className={`lp-mode reveal rd${i+1}`}>
                  <div className="lp-mode-badge">{m.badge}</div>
                  <span className="lp-mode-icon">{m.icon}</span>
                  <div className="lp-mode-lbl">{m.label}</div>
                  <h3 className="lp-mode-title">{m.title}</h3>
                  <p className="lp-mode-desc">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="lp-cta-sec">
          <div className="lp-cta-box reveal">
            <h2 className="lp-cta-title">Legal Clarity,<br /><em>Finally Accessible</em></h2>
            <p className="lp-cta-desc">Free to use. No credit card. Your questions stay private.<br />Built for students, citizens, lawyers, and researchers.</p>
            <div style={{display:'flex',gap:14,justifyContent:'center',flexWrap:'wrap'}}>
              {isLoggedIn ? (
                <button className="lp-btn-lg lp-btn-lg-p" onClick={() => navigate('/')}>Open Legal AI →</button>
              ) : (
                <>
                  <button className="lp-btn-lg lp-btn-lg-p" onClick={() => navigate('/register')}>Create Free Account →</button>
                  <button className="lp-btn-lg lp-btn-lg-g" onClick={() => navigate('/login')}>I Already Have an Account</button>
                </>
              )}
            </div>
          </div>
        </section>

        <footer className="lp-footer">
          <div className="lp-footer-brand">⚖️ Legal<span>AI</span> Assistant</div>
          <div className="lp-footer-note">Built with RAG · Powered by Mistral & Groq · Made for Indian Law</div>
        </footer>
      </div>
    </>
  )
}


