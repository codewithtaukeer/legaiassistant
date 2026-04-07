import { useState } from "react";
import api from "../api"; // uses your existing axios instance

const MODES = [
  { id: "all", label: "⚖️ Both Sides", desc: "Plaintiff, defendant & judge" },
  { id: "plaintiff", label: "🟦 Plaintiff", desc: "Only plaintiff's arguments" },
  { id: "defendant", label: "🟥 Defendant", desc: "Only defense arguments" },
  { id: "practice", label: "🎓 Practice", desc: "Submit your argument & get feedback" },
];

const SAMPLE_CASE = `A software company dismissed an employee after 6 years of service, claiming performance issues. The employee argues the termination was wrongful — their last 3 performance reviews were all "Meets Expectations" or above, and the dismissal came 2 weeks after they raised a workplace harassment complaint against a senior manager. The company claims the termination was based on a separate ongoing PIP (Performance Improvement Plan) initiated 3 months prior.`;

export default function ArgueMode({ onClose }) {
  const [selectedMode, setSelectedMode] = useState("all");
  const [caseText, setCaseText] = useState("");
  const [userSide, setUserSide] = useState("plaintiff");
  const [userArgument, setUserArgument] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isPractice = selectedMode === "practice";

  async function handleSubmit() {
    if (!caseText.trim() || caseText.trim().length < 20) {
      setError("Please enter at least 20 characters describing the case.");
      return;
    }
    if (isPractice && !userArgument.trim()) {
      setError("Please enter your argument for practice mode.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      let res;
      if (isPractice) {
        res = await api.post("/argue/practice", {
          case_text: caseText,
          user_side: userSide,
          user_argument: userArgument,
        });
      } else {
        res = await api.post("/argue/analyze", {
          case_text: caseText,
          mode: selectedMode,
        });
      }
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function renderArgumentCard(role, data) {
    const config = {
      plaintiff: {
        label: "Plaintiff",
        icon: "🟦",
        accent: "#3b82f6",
        accentDim: "rgba(59,130,246,0.10)",
        accentBorder: "rgba(59,130,246,0.25)",
        fields: [
          { key: "opening", label: "Opening Position" },
          { key: "arguments", label: "Key Arguments", isList: true },
          { key: "evidence", label: "Evidence & Strengths", isList: true },
          { key: "outcome", label: "Expected Outcome" },
        ],
      },
      defendant: {
        label: "Defendant",
        icon: "🟥",
        accent: "#ef4444",
        accentDim: "rgba(239,68,68,0.10)",
        accentBorder: "rgba(239,68,68,0.25)",
        fields: [
          { key: "opening", label: "Opening Position" },
          { key: "arguments", label: "Key Arguments", isList: true },
          { key: "evidence", label: "Counter-Evidence", isList: true },
          { key: "outcome", label: "Expected Outcome" },
        ],
      },
      judge: {
        label: "Judge's Reasoning",
        icon: "⚖️",
        accent: "#c9a84c",
        accentDim: "rgba(201,168,76,0.10)",
        accentBorder: "rgba(201,168,76,0.25)",
        fields: [
          { key: "summary", label: "Case Summary" },
          { key: "plaintiff_points", label: "Plaintiff's Strongest Points", isList: true },
          { key: "defendant_points", label: "Defendant's Strongest Points", isList: true },
          { key: "legal_questions", label: "Key Legal Questions", isList: true },
          { key: "ruling", label: "Likely Ruling" },
        ],
      },
    };

    const c = config[role];
    if (!c || !data) return null;

    return (
      <div key={role} style={{
        background: "var(--dark3)",
        border: `1px solid ${c.accentBorder}`,
        borderTop: `3px solid ${c.accent}`,
        borderRadius: 14,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{c.icon}</span>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: c.accent }}>{c.label}</span>
        </div>

        {data.error ? (
          <p style={{ color: "#ef4444", fontSize: 13 }}>⚠️ {data.error}</p>
        ) : (
          c.fields.map(({ key, label, isList }) => {
            const val = data[key];
            if (!val) return null;
            return (
              <div key={key}>
                <div style={{ fontSize: 11, fontWeight: 600, color: c.accent, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>{label}</div>
                {isList && Array.isArray(val) ? (
                  <ul style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    {val.map((item, i) => <li key={i} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{item}</li>)}
                  </ul>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>{val}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  }

  function renderPracticeResult(data) {
    const { opposition, evaluation, user_side } = data;
    const opposingSide = user_side === "plaintiff" ? "Defendant" : "Plaintiff";
    const score = evaluation?.score ?? "—";
    const scoreColor = score >= 7 ? "#22c55e" : score >= 4 ? "#f59e0b" : "#ef4444";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Score Banner */}
        <div style={{
          background: "var(--dark3)",
          border: "1px solid var(--border2)",
          borderRadius: 14,
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            border: `3px solid ${scoreColor}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: scoreColor,
          }}>
            {score}<span style={{ fontSize: 14, fontWeight: 400 }}>/10</span>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "var(--text3)", marginBottom: 4 }}>Your Score</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: "var(--text1)" }}>{evaluation?.verdict || "Evaluated"}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {/* Judge Feedback */}
          <div style={{ background: "var(--dark3)", border: "1px solid rgba(201,168,76,0.25)", borderTop: "3px solid #c9a84c", borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: "#c9a84c" }}>📋 Judge's Feedback</div>
            {evaluation?.strengths && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#22c55e", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>✅ Strengths</div>
                <ul style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  {evaluation.strengths.map((s, i) => <li key={i} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{s}</li>)}
                </ul>
              </div>
            )}
            {evaluation?.improvements && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>📈 Areas to Improve</div>
                <ul style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  {evaluation.improvements.map((s, i) => <li key={i} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{s}</li>)}
                </ul>
              </div>
            )}
            {evaluation?.overall_feedback && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#c9a84c", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Overall</div>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>{evaluation.overall_feedback}</p>
              </div>
            )}
          </div>

          {/* Opposition */}
          <div style={{ background: "var(--dark3)", border: `1px solid ${user_side === "plaintiff" ? "rgba(239,68,68,0.25)" : "rgba(59,130,246,0.25)"}`, borderTop: `3px solid ${user_side === "plaintiff" ? "#ef4444" : "#3b82f6"}`, borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: user_side === "plaintiff" ? "#ef4444" : "#3b82f6" }}>⚔️ {opposingSide}'s Counter</div>
            {opposition?.counter_opening && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Opening</div>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>{opposition.counter_opening}</p>
              </div>
            )}
            {opposition?.weaknesses_found && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Weaknesses Found</div>
                <ul style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  {opposition.weaknesses_found.map((s, i) => <li key={i} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{s}</li>)}
                </ul>
              </div>
            )}
            {opposition?.counter_arguments && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Counter Arguments</div>
                <ul style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  {opposition.counter_arguments.map((s, i) => <li key={i} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{s}</li>)}
                </ul>
              </div>
            )}
            {opposition?.advice && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#c9a84c", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>💡 Tip</div>
                <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, margin: 0 }}>{opposition.advice}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "var(--dark)",
      position: "relative",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 32px",
        borderBottom: "1px solid var(--border2)",
        background: "rgba(8,8,8,0.8)",
        backdropFilter: "blur(10px)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>⚖️</span>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: "var(--text1)" }}>Argue Both Sides</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Plaintiff · Defendant · Judge perspectives</div>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "1px solid var(--border2)", borderRadius: 8,
          width: 32, height: 32, cursor: "pointer", color: "var(--text3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, transition: "all 0.2s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,80,80,0.4)"; e.currentTarget.style.color = "rgba(255,120,120,0.9)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text3)"; }}
        >✕</button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Mode Selector */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {MODES.map((m) => (
            <button key={m.id} onClick={() => { setSelectedMode(m.id); setResult(null); setError(""); }}
              style={{
                background: selectedMode === m.id ? "var(--gold-dim)" : "var(--dark3)",
                border: `1px solid ${selectedMode === m.id ? "rgba(201,168,76,0.35)" : "var(--border2)"}`,
                borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                textAlign: "left", transition: "all 0.2s", fontFamily: "'DM Sans',sans-serif",
              }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: selectedMode === m.id ? "var(--gold)" : "var(--text1)", marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Case Input */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "1px" }}>Case Facts</label>
            <button onClick={() => setCaseText(SAMPLE_CASE)} style={{
              background: "var(--dark3)", border: "1px solid var(--border2)", borderRadius: 6,
              padding: "4px 10px", fontSize: 12, color: "var(--gold)", cursor: "pointer",
              fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
            }}>Load sample</button>
          </div>
          <textarea value={caseText} onChange={e => setCaseText(e.target.value)} rows={5}
            placeholder="Describe the case — parties involved, what happened, key facts, dispute..."
            style={{
              width: "100%", background: "var(--dark3)", border: "1px solid var(--border2)",
              borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "var(--text1)",
              fontFamily: "'DM Sans',sans-serif", resize: "vertical", outline: "none",
              lineHeight: 1.6, transition: "border-color 0.2s", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
            onBlur={e => e.target.style.borderColor = "var(--border2)"}
          />
        </div>

        {/* Practice Mode extras */}
        {isPractice && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>You are arguing as:</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["plaintiff", "defendant"].map(side => (
                  <button key={side} onClick={() => setUserSide(side)}
                    style={{
                      background: userSide === side ? (side === "plaintiff" ? "rgba(59,130,246,0.15)" : "rgba(239,68,68,0.15)") : "var(--dark3)",
                      border: `1px solid ${userSide === side ? (side === "plaintiff" ? "rgba(59,130,246,0.4)" : "rgba(239,68,68,0.4)") : "var(--border2)"}`,
                      borderRadius: 8, padding: "9px 18px", cursor: "pointer",
                      fontSize: 13, fontWeight: 600,
                      color: userSide === side ? (side === "plaintiff" ? "#3b82f6" : "#ef4444") : "var(--text2)",
                      fontFamily: "'DM Sans',sans-serif", transition: "all 0.2s",
                    }}>
                    {side === "plaintiff" ? "🟦 Plaintiff" : "🟥 Defendant"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: 8 }}>Your Argument</label>
              <textarea value={userArgument} onChange={e => setUserArgument(e.target.value)} rows={4}
                placeholder={`Write your argument as the ${userSide}. Be specific — cite facts, legal reasoning, precedents...`}
                style={{
                  width: "100%", background: "var(--dark3)", border: "1px solid var(--border2)",
                  borderRadius: 10, padding: "12px 14px", fontSize: 14, color: "var(--text1)",
                  fontFamily: "'DM Sans',sans-serif", resize: "vertical", outline: "none",
                  lineHeight: 1.6, transition: "border-color 0.2s", boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(201,168,76,0.35)"}
                onBlur={e => e.target.style.borderColor = "var(--border2)"}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#fca5a5" }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{
            background: loading ? "rgba(201,168,76,0.4)" : "var(--gold)",
            border: "none", borderRadius: 10, padding: "13px 24px",
            fontSize: 14, fontWeight: 600, color: "#080808",
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif",
            transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            alignSelf: "flex-start",
          }}>
          {loading ? (
            <>
              <span style={{ width: 14, height: 14, border: "2px solid rgba(8,8,8,0.3)", borderTopColor: "#080808", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
              Analyzing case...
            </>
          ) : isPractice ? "🎓 Submit & Get Feedback" : "⚖️ Analyze Case"}
        </button>

        {/* Results */}
        {result && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: "var(--text1)" }}>Analysis Complete</div>
              <button onClick={() => setResult(null)} style={{
                background: "var(--dark3)", border: "1px solid var(--border2)", borderRadius: 6,
                padding: "4px 12px", fontSize: 12, color: "var(--text3)", cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
              }}>Clear</button>
            </div>

            {isPractice ? renderPracticeResult(result) : (
              <div style={{ display: "grid", gridTemplateColumns: result.judge ? "1fr 1fr" : "1fr 1fr", gap: 14 }}>
                {result.plaintiff && renderArgumentCard("plaintiff", result.plaintiff)}
                {result.defendant && renderArgumentCard("defendant", result.defendant)}
                {result.judge && (
                  <div style={{ gridColumn: result.plaintiff && result.defendant ? "1 / -1" : "auto" }}>
                    {renderArgumentCard("judge", result.judge)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}