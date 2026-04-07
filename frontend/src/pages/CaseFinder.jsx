import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const EXAMPLE_QUERIES = [
  "Employee dismissed after raising harassment complaint against manager",
  "Police arrested person without following proper arrest procedure",
  "Government impounded passport without giving reasons",
  "Online post caused inconvenience to a public official",
  "Man married second time without divorcing first wife by converting religion",
];

export default function CaseFinder() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [sourceInfo, setSourceInfo] = useState(null);
  const [expandedCase, setExpandedCase] = useState(null);
  const [detailLoading, setDetailLoading] = useState(null);
  const [caseDetails, setCaseDetails] = useState({});
  const username = localStorage.getItem("username");

  const handleSearch = async (q = query) => {
    if (!q.trim() || q.trim().length < 10) {
      setError("Please describe your case in at least 10 characters.");
      return;
    }
    setError("");
    setLoading(true);
    setResults([]);
    setSearched(false);
    setExpandedCase(null);

    try {
      const res = await api.post("/cases/search", {
        query: q.trim(),
        top_k: 8,
        source: "both",
      });
      setResults(res.data.results || []);
      setSourceInfo(res.data.sources_used);
      setSearched(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadCaseDetail = async (result, idx) => {
    if (expandedCase === idx) { setExpandedCase(null); return; }
    setExpandedCase(idx);
    if (!result.tid || caseDetails[idx]) return;
    setDetailLoading(idx);
    try {
      const res = await api.post("/cases/detail", { tid: result.tid });
      setCaseDetails(prev => ({ ...prev, [idx]: res.data }));
    } catch {}
    finally { setDetailLoading(null); }
  };

  const logout = () => { localStorage.clear(); navigate("/landing"); };

  const scoreColor = (s) =>
    s >= 0.75 ? "#22c55e" : s >= 0.5 ? "#c9a84c" : s >= 0.3 ? "#f59e0b" : "#6b7280";

  const scoreLabel = (s) =>
    s >= 0.75 ? "High Match" : s >= 0.5 ? "Good Match" : s >= 0.3 ? "Partial Match" : "Low Match";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        :root{
          --gold:#c9a84c;--gold-light:#e8cc7a;--gold-dim:rgba(201,168,76,0.10);--gold-border:rgba(201,168,76,0.22);
          --dark:#080808;--dark2:#0f0f0f;--dark3:#161616;--dark4:#1e1e1e;--dark5:#252525;
          --text1:#f0ebe0;--text2:#b8b0a0;--text3:#6b6560;--border:rgba(201,168,76,0.12);--border2:rgba(255,255,255,0.06);
        }
        body{background:var(--dark);color:var(--text1);font-family:'DM Sans',sans-serif;min-height:100vh}
        .cf-layout{display:flex;min-height:100vh}

        /* SIDEBAR */
        .cf-sidebar{width:220px;min-width:220px;background:var(--dark2);border-right:1px solid var(--border2);display:flex;flex-direction:column;padding:16px;gap:8px;position:sticky;top:0;height:100vh}
        .cf-brand{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:var(--text1);display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;border-radius:8px;transition:all 0.2s;margin-bottom:8px;text-decoration:none}
        .cf-brand:hover{background:var(--dark3);color:var(--gold)}
        .cf-brand span{color:var(--gold)}
        .cf-nav-btn{width:100%;background:none;border:1px solid var(--border2);border-radius:8px;padding:9px 14px;font-size:13px;color:var(--text2);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;text-align:left;display:flex;align-items:center;gap:8px}
        .cf-nav-btn:hover{border-color:var(--gold-border);color:var(--gold);background:var(--gold-dim)}
        .cf-nav-btn.active{background:var(--gold-dim);border-color:rgba(201,168,76,0.35);color:var(--gold)}
        .cf-spacer{flex:1}
        .cf-user{display:flex;align-items:center;justify-content:space-between;padding:8px 4px;margin-top:auto}
        .cf-username{font-size:12px;color:var(--text3)}
        .cf-logout{background:none;border:none;color:var(--text3);font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:color 0.2s}
        .cf-logout:hover{color:#ff6060}

        /* MAIN */
        .cf-main{flex:1;display:flex;flex-direction:column;background:var(--dark);position:relative;overflow-y:auto}
        .cf-bg{position:fixed;inset:0;background:radial-gradient(ellipse 70% 50% at 50% -10%,rgba(201,168,76,0.05) 0%,transparent 60%);pointer-events:none;z-index:0}

        /* HERO */
        .cf-hero{padding:56px 60px 32px;position:relative;z-index:1;max-width:900px;margin:0 auto;width:100%}
        .cf-badge{display:inline-flex;align-items:center;gap:6px;background:var(--gold-dim);border:1px solid var(--gold-border);border-radius:999px;padding:5px 14px;font-size:11px;font-weight:600;color:var(--gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:20px}
        .cf-title{font-family:'Cormorant Garamond',serif;font-size:48px;font-weight:700;color:var(--text1);line-height:1.15;margin-bottom:10px}
        .cf-title span{color:var(--gold);font-style:italic}
        .cf-subtitle{font-size:15px;color:var(--text3);font-family:'Cormorant Garamond',serif;font-style:italic;margin-bottom:32px}

        /* SEARCH BOX */
        .cf-search-wrap{position:relative;z-index:1;max-width:900px;margin:0 auto;width:100%;padding:0 60px 24px}
        .cf-search-box{background:var(--dark3);border:1px solid var(--border2);border-radius:16px;padding:16px 18px;transition:border-color 0.2s;display:flex;flex-direction:column;gap:12px}
        .cf-search-box:focus-within{border-color:var(--gold-border);box-shadow:0 0 0 4px rgba(201,168,76,0.06)}
        .cf-textarea{background:none;border:none;outline:none;resize:none;font-size:14px;color:var(--text1);font-family:'DM Sans',sans-serif;width:100%;line-height:1.6}
        .cf-textarea::placeholder{color:var(--text3)}
        .cf-search-footer{display:flex;align-items:center;justify-content:space-between}
        .cf-char{font-size:11px;color:var(--text3)}
        .cf-search-btn{background:var(--gold);border:none;border-radius:10px;padding:10px 24px;font-size:14px;font-weight:500;color:#080808;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;display:flex;align-items:center;gap:8px}
        .cf-search-btn:hover:not(:disabled){background:var(--gold-light);transform:translateY(-1px)}
        .cf-search-btn:disabled{opacity:0.4;cursor:not-allowed}

        /* EXAMPLES */
        .cf-examples{max-width:900px;margin:0 auto;width:100%;padding:0 60px 32px;position:relative;z-index:1}
        .cf-examples-title{font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px}
        .cf-examples-row{display:flex;flex-wrap:wrap;gap:8px}
        .cf-example-chip{background:var(--dark3);border:1px solid var(--border2);border-radius:999px;padding:6px 14px;font-size:12px;color:var(--text3);cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s;white-space:nowrap}
        .cf-example-chip:hover{border-color:var(--gold-border);color:var(--gold);background:var(--gold-dim)}

        /* ERROR */
        .cf-error{max-width:900px;margin:0 auto;width:100%;padding:0 60px 16px;position:relative;z-index:1}
        .cf-error-box{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:10px;padding:10px 16px;font-size:13px;color:#fca5a5}

        /* SOURCE INFO */
        .cf-source-bar{max-width:900px;margin:0 auto;width:100%;padding:0 60px 16px;position:relative;z-index:1;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .cf-source-tag{display:flex;align-items:center;gap:5px;background:var(--dark3);border:1px solid var(--border2);border-radius:999px;padding:4px 12px;font-size:11px;color:var(--text3)}
        .cf-source-dot{width:6px;height:6px;border-radius:50%}
        .cf-results-count{font-size:12px;color:var(--text3);margin-left:auto}

        /* RESULTS */
        .cf-results{max-width:900px;margin:0 auto;width:100%;padding:0 60px 60px;position:relative;z-index:1;display:flex;flex-direction:column;gap:14px}

        /* CASE CARD */
        .cf-card{background:var(--dark3);border:1px solid var(--border2);border-radius:14px;overflow:hidden;transition:border-color 0.2s;animation:cardIn 0.3s ease both}
        @keyframes cardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .cf-card:hover{border-color:var(--gold-border)}
        .cf-card-header{padding:18px 20px;cursor:pointer;display:flex;gap:16px;align-items:flex-start}
        .cf-card-score{display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0}
        .cf-score-ring{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;border:2px solid}
        .cf-score-label{font-size:9px;text-transform:uppercase;letter-spacing:0.5px;text-align:center}
        .cf-card-body{flex:1;min-width:0}
        .cf-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:6px}
        .cf-case-name{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;color:var(--text1);line-height:1.3}
        .cf-source-badge{font-size:10px;font-weight:600;padding:3px 9px;border-radius:999px;background:var(--gold-dim);border:1px solid var(--gold-border);color:var(--gold);white-space:nowrap;flex-shrink:0}
        .cf-card-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}
        .cf-meta-tag{font-size:11px;color:var(--text3);background:var(--dark4);border:1px solid var(--border2);border-radius:6px;padding:2px 8px}
        .cf-card-summary{font-size:13px;color:var(--text2);line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .cf-expand-btn{font-size:12px;color:var(--gold);background:none;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;margin-top:6px;padding:0;transition:opacity 0.2s}
        .cf-expand-btn:hover{opacity:0.7}

        /* EXPANDED */
        .cf-card-expanded{border-top:1px solid var(--border2);padding:18px 20px;display:flex;flex-direction:column;gap:14px;animation:expandIn 0.2s ease}
        @keyframes expandIn{from{opacity:0}to{opacity:1}}
        .cf-section-title{font-size:11px;font-weight:600;color:var(--gold);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
        .cf-full-summary{font-size:13px;color:var(--text2);line-height:1.7}
        .cf-significance-box{background:var(--dark4);border:1px solid var(--gold-border);border-left:3px solid var(--gold);border-radius:8px;padding:12px 14px}
        .cf-verdict-box{background:var(--dark4);border:1px solid var(--border2);border-radius:8px;padding:12px 14px;font-size:13px;color:var(--text2);line-height:1.7;max-height:200px;overflow-y:auto}
        .cf-kanoon-link{display:inline-flex;align-items:center;gap:6px;background:var(--gold);color:#080808;text-decoration:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;transition:all 0.2s;align-self:flex-start}
        .cf-kanoon-link:hover{background:var(--gold-light)}
        .cf-detail-loading{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text3)}
        .cf-spinner{width:14px;height:14px;border:2px solid var(--border2);border-top-color:var(--gold);border-radius:50%;animation:spin 0.7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}

        /* LOADING */
        .cf-loading{max-width:900px;margin:0 auto;width:100%;padding:40px 60px;display:flex;flex-direction:column;align-items:center;gap:16px;position:relative;z-index:1}
        .cf-loading-spinner{width:40px;height:40px;border:2px solid var(--border2);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite}
        .cf-loading-text{font-family:'Cormorant Garamond',serif;font-size:18px;color:var(--text3);font-style:italic}
        .cf-loading-sub{font-size:12px;color:var(--text3)}

        /* EMPTY */
        .cf-empty{max-width:900px;margin:0 auto;width:100%;padding:40px 60px;text-align:center;position:relative;z-index:1}
        .cf-empty-icon{font-size:48px;margin-bottom:16px;opacity:0.5}
        .cf-empty-text{font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--text3)}
        .cf-empty-sub{font-size:13px;color:var(--text3);margin-top:6px}

        /* NO API NOTICE */
        .cf-api-notice{max-width:900px;margin:0 auto;width:100%;padding:0 60px 16px;position:relative;z-index:1}
        .cf-api-box{background:rgba(201,168,76,0.07);border:1px solid var(--gold-border);border-radius:10px;padding:12px 16px;font-size:12px;color:var(--text3);display:flex;align-items:flex-start;gap:8px}
      `}</style>

      <div className="cf-layout">
        {/* Sidebar */}
        <div className="cf-sidebar">
          <div className="cf-brand" onClick={() => navigate("/landing")}>⚖️ Legal<span>AI</span></div>
          <button className="cf-nav-btn" onClick={() => navigate("/")}>💬 Chat</button>
          <button className="cf-nav-btn active">🔍 Case Finder</button>
          {username === "admin" && (
            <button className="cf-nav-btn" onClick={() => navigate("/admin")}>🛡️ Admin</button>
          )}
          <div className="cf-spacer" />
          <div className="cf-user">
            <span className="cf-username">👤 {username}</span>
            <button className="cf-logout" onClick={logout}>Logout</button>
          </div>
        </div>

        {/* Main */}
        <div className="cf-main">
          <div className="cf-bg" />

          {/* Hero */}
          <div className="cf-hero">
            <div className="cf-badge">🔍 AI Case Search</div>
            <h1 className="cf-title">Find <span>Similar</span> Cases</h1>
            <p className="cf-subtitle">Describe your case — get matching Indian court judgments, verdicts & precedents</p>
          </div>

          {/* Search */}
          <div className="cf-search-wrap">
            <div className="cf-search-box">
              <textarea
                className="cf-textarea"
                rows={4}
                placeholder="Describe your case in detail — parties involved, what happened, the legal dispute, relevant acts or sections..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleSearch(); }}
              />
              <div className="cf-search-footer">
                <span className="cf-char">{query.length} chars · Ctrl+Enter to search</span>
                <button
                  className="cf-search-btn"
                  onClick={() => handleSearch()}
                  disabled={loading || query.trim().length < 10}
                >
                  {loading ? (
                    <><span style={{ width: 14, height: 14, border: "2px solid rgba(8,8,8,0.3)", borderTopColor: "#080808", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} /> Searching...</>
                  ) : "⚖️ Find Similar Cases"}
                </button>
              </div>
            </div>
          </div>

          {/* Example queries */}
          {!searched && !loading && (
            <div className="cf-examples">
              <div className="cf-examples-title">Try an example</div>
              <div className="cf-examples-row">
                {EXAMPLE_QUERIES.map((ex, i) => (
                  <button key={i} className="cf-example-chip" onClick={() => { setQuery(ex); handleSearch(ex); }}>
                    {ex.length > 60 ? ex.slice(0, 57) + "..." : ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="cf-error">
              <div className="cf-error-box">⚠️ {error}</div>
            </div>
          )}

          {/* API notice if no token */}
          {searched && sourceInfo && !sourceInfo.api_available && (
            <div className="cf-api-notice">
              <div className="cf-api-box">
                💡 <span>Indian Kanoon API not configured — showing results from local database only. Add <code>INDIAN_KANOON_TOKEN</code> to your <code>.env</code> to search millions of real judgments. Apply at <strong>api.indiankanoon.org</strong></span>
              </div>
            </div>
          )}

          {/* Source tags */}
          {searched && sourceInfo && (
            <div className="cf-source-bar">
              {sourceInfo.indian_kanoon > 0 && (
                <div className="cf-source-tag">
                  <div className="cf-source-dot" style={{ background: "#3b82f6" }} />
                  {sourceInfo.indian_kanoon} from Indian Kanoon
                </div>
              )}
              {sourceInfo.local_db > 0 && (
                <div className="cf-source-tag">
                  <div className="cf-source-dot" style={{ background: "#c9a84c" }} />
                  {sourceInfo.local_db} from Local DB
                </div>
              )}
              <div className="cf-results-count">{results.length} results found</div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="cf-loading">
              <div className="cf-loading-spinner" />
              <div className="cf-loading-text">Searching case database...</div>
              <div className="cf-loading-sub">Matching against Indian Kanoon & landmark judgments</div>
            </div>
          )}

          {/* Empty */}
          {searched && !loading && results.length === 0 && (
            <div className="cf-empty">
              <div className="cf-empty-icon">⚖️</div>
              <div className="cf-empty-text">No similar cases found</div>
              <div className="cf-empty-sub">Try describing your case differently or using more legal keywords</div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && !loading && (
            <div className="cf-results">
              {results.map((result, idx) => {
                const score = result.relevance_score;
                const color = scoreColor(score);
                const label = scoreLabel(score);
                const isExpanded = expandedCase === idx;
                const detail = caseDetails[idx];

                return (
                  <div key={idx} className="cf-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="cf-card-header" onClick={() => loadCaseDetail(result, idx)}>
                      {/* Score ring */}
                      <div className="cf-card-score">
                        <div className="cf-score-ring" style={{ color, borderColor: color, background: `${color}15` }}>
                          {Math.round(score * 100)}%
                        </div>
                        <div className="cf-score-label" style={{ color }}>{label}</div>
                      </div>

                      <div className="cf-card-body">
                        <div className="cf-card-top">
                          <div className="cf-case-name">{result.case_name}</div>
                          <div className="cf-source-badge">{result.source}</div>
                        </div>
                        <div className="cf-card-meta">
                          {result.court && <span className="cf-meta-tag">🏛️ {result.court}</span>}
                          {result.year && result.year !== "N/A" && <span className="cf-meta-tag">📅 {result.year}</span>}
                          {result.act && <span className="cf-meta-tag">📖 {result.act}</span>}
                          {result.section && <span className="cf-meta-tag">§ {result.section}</span>}
                        </div>
                        <div className="cf-card-summary">{result.summary}</div>
                        <button className="cf-expand-btn">
                          {isExpanded ? "▲ Show less" : "▼ View full details & verdict"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded section */}
                    {isExpanded && (
                      <div className="cf-card-expanded">
                        {/* Full Summary */}
                        <div>
                          <div className="cf-section-title">📋 Case Summary</div>
                          <div className="cf-full-summary">{result.summary}</div>
                        </div>

                        {/* Significance */}
                        {result.significance && (
                          <div>
                            <div className="cf-section-title">⭐ Significance / Verdict</div>
                            <div className="cf-significance-box">
                              <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{result.significance}</div>
                            </div>
                          </div>
                        )}

                        {/* Full verdict from Indian Kanoon */}
                        {detailLoading === idx && (
                          <div className="cf-detail-loading">
                            <div className="cf-spinner" /> Loading full verdict from Indian Kanoon...
                          </div>
                        )}
                        {detail?.verdict && (
                          <div>
                            <div className="cf-section-title">⚖️ Judgment Extract</div>
                            <div className="cf-verdict-box">{detail.verdict}</div>
                          </div>
                        )}
                        {detail?.bench && (
                          <div>
                            <div className="cf-section-title">👨‍⚖️ Bench</div>
                            <div style={{ fontSize: 13, color: "var(--text2)" }}>{detail.bench}</div>
                          </div>
                        )}

                        {/* Link to Indian Kanoon */}
                        {result.url && (
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="cf-kanoon-link">
                            🔗 Read Full Judgment on Indian Kanoon
                          </a>
                        )}

                        {/* Use in Chat button */}
                        <button
                          onClick={() => navigate("/", { state: { prefill: `Analyze my case in context of: ${result.case_name} (${result.year}) - ${result.significance}` } })}
                          style={{
                            background: "var(--dark4)", border: "1px solid var(--gold-border)", borderRadius: 8,
                            padding: "8px 16px", fontSize: 12, color: "var(--gold)", cursor: "pointer",
                            fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s", alignSelf: "flex-start",
                          }}
                        >
                          💬 Use this case in Chat
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}