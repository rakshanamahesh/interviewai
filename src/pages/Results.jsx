import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import "./Results.css";

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [overallScore, setOverallScore] = useState(0);
  const [analyzingIndex, setAnalyzingIndex] = useState(0);
  const [phase, setPhase] = useState("loading");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) setUser(u);
      else navigate("/");
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const sessionSnap = await getDoc(doc(db, "sessions", id));
        if (!sessionSnap.exists()) { navigate("/dashboard"); return; }
        setSession(sessionSnap.data());

        const answersSnap = await getDocs(
          collection(db, "sessions", id, "answers")
        );
        if (!answersSnap.empty) {
          const answersData = answersSnap.docs[0].data().answers;
          setAnswers(answersData);
          setPhase("analyzing");
          await analyzeAllAnswers(answersData, sessionSnap.data());
        } else {
          setPhase("done");
        }
      } catch (err) {
        console.error(err);
        setPhase("done");
      }
    };
    if (id) loadData();
  }, [id]);

  const analyzeAllAnswers = async (answersData, sessionData) => {
    const results = [];

    for (let i = 0; i < answersData.length; i++) {
      setAnalyzingIndex(i);
      const item = answersData[i];

      try {
        const prompt = `You are an expert interview evaluator.
Question: "${item.question}"
Question Type: ${item.type}
Job Role: ${sessionData.role}
Candidate Answer: "${item.answer}"

IMPORTANT: Return ONLY valid JSON. No markdown, no backticks, no extra text.
{"score":7,"communicationScore":8,"technicalScore":6,"confidenceScore":7,"strengths":["Clear explanation","Good examples"],"improvements":["More depth needed","Add specific examples"],"idealAnswer":"A strong answer would cover...","keywordsUsed":["keyword1"],"missingKeywords":["keyword2","keyword3"]}

Score 0-10. Be specific and constructive.`;

        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                {
                  role: "system",
                  content: "You are an expert interview evaluator. Always respond with valid JSON only. No markdown, no backticks, no extra text."
                },
                {
                  role: "user",
                  content: prompt
                }
              ],
              temperature: 0.3,
              max_tokens: 1000,
            }),
          }
        );

        const data = await response.json();
        const rawText = data.choices[0].message.content;
        const clean = rawText.replace(/```json|```/g, "").trim();
        const feedback = JSON.parse(clean);
        results.push({ ...item, feedback });

      } catch (err) {
        console.error("Analysis error:", err);
        results.push({
          ...item,
          feedback: {
            score: 5,
            communicationScore: 5,
            technicalScore: 5,
            confidenceScore: 5,
            strengths: ["Answer provided"],
            improvements: ["Could not analyze — try again"],
            idealAnswer: "Please retry for AI feedback",
            keywordsUsed: [],
            missingKeywords: [],
          },
        });
      }
    }

    setFeedbacks(results);
    const avg = results.reduce((sum, r) => sum + r.feedback.score, 0) / results.length;
    setOverallScore(Math.round(avg * 10) / 10);
    setPhase("done");
  };

  const getScoreColor = (score) => {
    if (score >= 8) return "#10b981";
    if (score >= 6) return "#f59e0b";
    if (score >= 4) return "#f97316";
    return "#ef4444";
  };

  const getScoreLabel = (score) => {
    if (score >= 8) return "Excellent";
    if (score >= 6) return "Good";
    if (score >= 4) return "Average";
    return "Needs Work";
  };

  if (phase === "loading" || phase === "analyzing") {
    return (
      <div className="analyzing-screen">
        <div className="analyzing-card">
          <div className="ai-icon">🤖</div>
          <h2>AI is analyzing your answers...</h2>
          <p>
            {phase === "loading"
              ? "Loading your interview data..."
              : `Analyzing answer ${analyzingIndex + 1} of ${answers.length}`}
          </p>
          <div className="analyzing-bar">
            <div className="analyzing-fill" style={{
              width: answers.length
                ? `${((analyzingIndex + 1) / answers.length) * 100}%`
                : "10%"
            }}></div>
          </div>
          <p className="analyzing-tip">💡 This takes about 15-20 seconds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-page">
      <div className="results-bg">
        <div className="results-blob-1"></div>
        <div className="results-blob-2"></div>
      </div>

      <nav className="results-nav">
        <div className="logo" onClick={() => navigate("/dashboard")} style={{cursor:"pointer"}}>
          <span>⚡</span>
          <span className="logo-text">InterviewAI</span>
        </div>
        <div className="results-nav-right">
          <img src={user?.photoURL} alt="" className="user-avatar" />
          <span>{user?.displayName?.split(" ")[0]}</span>
        </div>
      </nav>

      <div className="results-container">

        <div className="score-hero">
          <div className="score-circle" style={{"--score-color": getScoreColor(overallScore)}}>
            <span className="score-number">{overallScore}</span>
            <span className="score-out-of">/10</span>
          </div>
          <div className="score-info">
            <h1>
              {getScoreLabel(overallScore)} Performance!{" "}
              {overallScore >= 8 ? "🏆" : overallScore >= 6 ? "👍" : "💪"}
            </h1>
            <p style={{color:"var(--muted)",fontSize:"0.9rem",marginBottom:"20px",textTransform:"capitalize"}}>
              {session?.role} • {session?.difficulty} • {feedbacks.length} questions
            </p>
            <div className="score-breakdown">
              {feedbacks.length > 0 && (
                <>
                  <div className="score-mini">
                    <span>Communication</span>
                    <span style={{color: getScoreColor(
                      feedbacks.reduce((s,f)=>s+(f.feedback.communicationScore||0),0)/feedbacks.length
                    )}}>
                      {(feedbacks.reduce((s,f)=>s+(f.feedback.communicationScore||0),0)/feedbacks.length).toFixed(1)}
                    </span>
                  </div>
                  <div className="score-mini">
                    <span>Technical</span>
                    <span style={{color: getScoreColor(
                      feedbacks.reduce((s,f)=>s+(f.feedback.technicalScore||0),0)/feedbacks.length
                    )}}>
                      {(feedbacks.reduce((s,f)=>s+(f.feedback.technicalScore||0),0)/feedbacks.length).toFixed(1)}
                    </span>
                  </div>
                  <div className="score-mini">
                    <span>Confidence</span>
                    <span style={{color: getScoreColor(
                      feedbacks.reduce((s,f)=>s+(f.feedback.confidenceScore||0),0)/feedbacks.length
                    )}}>
                      {(feedbacks.reduce((s,f)=>s+(f.feedback.confidenceScore||0),0)/feedbacks.length).toFixed(1)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="results-actions">
          <button className="action-btn primary" onClick={() => navigate("/setup")}>
            🔄 Practice Again
          </button>
          <button className="action-btn secondary" onClick={() => navigate("/dashboard")}>
            🏠 Dashboard
          </button>
          <button
            className="action-btn"
            style={{
              background:"linear-gradient(135deg,#10b981,#059669)",
              color:"white",
              border:"none",
              flex:1,
              borderRadius:"12px",
              padding:"14px",
              fontSize:"0.95rem",
              fontWeight:"700",
              cursor:"pointer",
              fontFamily:"inherit"
            }}
            onClick={() => navigate(`/report/${id}`)}
          >
            📥 Download PDF
          </button>
        </div>

        <h2 className="section-title">Detailed Feedback</h2>

        <div className="feedbacks-list">
          {feedbacks.map((item, i) => (
            <div className="feedback-card" key={i}>

              <div className="feedback-header">
                <div className="feedback-left">
                  <span className={`q-type type-${item.type?.toLowerCase()}`}>
                    {item.type}
                  </span>
                  <span className="q-number">Q{i + 1}</span>
                </div>
                <div className="feedback-score" style={{color: getScoreColor(item.feedback.score)}}>
                  {item.feedback.score}/10
                  <span className="score-badge" style={{background: getScoreColor(item.feedback.score)}}>
                    {getScoreLabel(item.feedback.score)}
                  </span>
                </div>
              </div>

              <p className="feedback-question">{item.question}</p>

              <div className="your-answer">
                <span className="answer-label">Your answer:</span>
                <p>{item.answer}</p>
              </div>

              <div className="score-bars">
                {[
                  {label:"Communication", score: item.feedback.communicationScore||0},
                  {label:"Technical", score: item.feedback.technicalScore||0},
                  {label:"Confidence", score: item.feedback.confidenceScore||0},
                ].map((s, j) => (
                  <div key={j} className="score-bar-row">
                    <span>{s.label}</span>
                    <div className="score-bar-bg">
                      <div className="score-bar-fg" style={{
                        width:`${s.score*10}%`,
                        background: getScoreColor(s.score)
                      }}></div>
                    </div>
                    <span style={{color:getScoreColor(s.score)}}>{s.score}/10</span>
                  </div>
                ))}
              </div>

              <div className="feedback-cols">
                <div className="feedback-col strengths">
                  <h4>✅ Strengths</h4>
                  <ul>
                    {item.feedback.strengths?.map((s,j) => <li key={j}>{s}</li>)}
                  </ul>
                </div>
                <div className="feedback-col improvements">
                  <h4>🔧 Improve</h4>
                  <ul>
                    {item.feedback.improvements?.map((s,j) => <li key={j}>{s}</li>)}
                  </ul>
                </div>
              </div>

              <div className="ideal-answer">
                <h4>💡 Ideal Answer</h4>
                <p>{item.feedback.idealAnswer}</p>
              </div>

              {item.feedback.missingKeywords?.length > 0 && (
                <div className="keywords">
                  <span className="keywords-label">Missing keywords:</span>
                  {item.feedback.missingKeywords.map((k,j) => (
                    <span key={j} className="keyword-tag">{k}</span>
                  ))}
                </div>
              )}

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Results;