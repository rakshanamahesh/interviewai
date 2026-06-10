import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./Report.css";

const Report = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const reportRef = useRef(null);
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [overallScore, setOverallScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

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
          const data = answersSnap.docs[0].data().answers;
          setFeedbacks(data);
          if (data.length > 0 && data[0].feedback) {
            const avg = data.reduce((s, r) => s + (r.feedback?.score || 0), 0) / data.length;
            setOverallScore(Math.round(avg * 10) / 10);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadData();
  }, [id]);

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

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`InterviewAI_Report_${session?.role}_${new Date().toLocaleDateString()}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Could not generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="report-loading">
        <div className="loader"></div>
        <p>Loading your report...</p>
      </div>
    );
  }

  return (
    <div className="report-page">
      {/* Action buttons — NOT included in PDF */}
      <div className="report-actions">
        <button className="back-btn" onClick={() => navigate("/dashboard")}>
          ← Dashboard
        </button>
        <button
          className="download-btn"
          onClick={handleDownloadPDF}
          disabled={downloading}
        >
          {downloading ? "⏳ Generating PDF..." : "📥 Download PDF"}
        </button>
      </div>

      {/* This div gets converted to PDF */}
      <div className="report-document" ref={reportRef}>

        {/* Header */}
        <div className="report-header">
          <div className="report-logo">⚡ InterviewAI</div>
          <div className="report-title">
            <h1>Interview Performance Report</h1>
            <p>Generated on {new Date().toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric"
            })}</p>
          </div>
        </div>

        {/* Candidate info */}
        <div className="report-candidate">
          <div className="candidate-row">
            <span className="candidate-label">Candidate</span>
            <span className="candidate-value">{user?.displayName}</span>
          </div>
          <div className="candidate-row">
            <span className="candidate-label">Role</span>
            <span className="candidate-value" style={{textTransform:"capitalize"}}>{session?.role}</span>
          </div>
          <div className="candidate-row">
            <span className="candidate-label">Difficulty</span>
            <span className="candidate-value" style={{textTransform:"capitalize"}}>{session?.difficulty}</span>
          </div>
          <div className="candidate-row">
            <span className="candidate-label">Interview Type</span>
            <span className="candidate-value" style={{textTransform:"capitalize"}}>{session?.type}</span>
          </div>
          <div className="candidate-row">
            <span className="candidate-label">Total Questions</span>
            <span className="candidate-value">{feedbacks.length}</span>
          </div>
        </div>

        {/* Overall score */}
        <div className="report-score-section">
          <div className="report-score-circle" style={{borderColor: getScoreColor(overallScore), color: getScoreColor(overallScore)}}>
            <span className="report-score-number">{overallScore}</span>
            <span className="report-score-label">/10</span>
          </div>
          <div className="report-score-info">
            <h2>{getScoreLabel(overallScore)} Performance</h2>
            <p>Overall interview score based on {feedbacks.length} answers</p>
            <div className="report-score-bars">
              {feedbacks.length > 0 && feedbacks[0].feedback && (
                <>
                  {[
                    { label: "Communication", key: "communicationScore" },
                    { label: "Technical", key: "technicalScore" },
                    { label: "Confidence", key: "confidenceScore" },
                  ].map((s, i) => {
                    const avg = feedbacks.reduce((sum, f) => sum + (f.feedback?.[s.key] || 0), 0) / feedbacks.length;
                    return (
                      <div key={i} className="report-bar-row">
                        <span>{s.label}</span>
                        <div className="report-bar-bg">
                          <div className="report-bar-fg" style={{
                            width: `${avg * 10}%`,
                            background: getScoreColor(avg)
                          }}></div>
                        </div>
                        <span style={{color: getScoreColor(avg)}}>{avg.toFixed(1)}/10</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="report-divider"></div>

        {/* Per question feedback */}
        <h2 className="report-section-title">Detailed Question Analysis</h2>

        {feedbacks.map((item, i) => (
          <div className="report-question-block" key={i}>
            <div className="report-q-header">
              <span className="report-q-number">Q{i + 1}</span>
              <span className="report-q-type">{item.type}</span>
              <span className="report-q-score" style={{color: getScoreColor(item.feedback?.score || 0)}}>
                {item.feedback?.score || 0}/10 — {getScoreLabel(item.feedback?.score || 0)}
              </span>
            </div>

            <p className="report-question">{item.question}</p>

            <div className="report-answer">
              <span className="report-answer-label">Your Answer:</span>
              <p>{item.answer}</p>
            </div>

            <div className="report-feedback-cols">
              <div className="report-col">
                <h4>✅ Strengths</h4>
                <ul>
                  {item.feedback?.strengths?.map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="report-col">
                <h4>🔧 Areas to Improve</h4>
                <ul>
                  {item.feedback?.improvements?.map((s, j) => (
                    <li key={j}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="report-ideal">
              <h4>💡 Ideal Answer</h4>
              <p>{item.feedback?.idealAnswer}</p>
            </div>

            {item.feedback?.missingKeywords?.length > 0 && (
              <div className="report-keywords">
                <span>Missing keywords: </span>
                {item.feedback.missingKeywords.map((k, j) => (
                  <span key={j} className="report-keyword">{k}</span>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Footer */}
        <div className="report-footer">
          <p>Generated by InterviewAI — AI-Powered Mock Interview Platform</p>
          <p>github.com/rakshanamahesh/interviewai</p>
        </div>
      </div>
    </div>
  );
};

export default Report;