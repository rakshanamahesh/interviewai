import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./Setup.css";

const jobRoles = [
  { id: "frontend", label: "Frontend Developer", icon: "🎨" },
  { id: "backend", label: "Backend Developer", icon: "⚙️" },
  { id: "fullstack", label: "Full Stack Developer", icon: "🚀" },
  { id: "data", label: "Data Analyst", icon: "📊" },
  { id: "ml", label: "ML Engineer", icon: "🤖" },
  { id: "devops", label: "DevOps Engineer", icon: "🔧" },
  { id: "mobile", label: "Mobile Developer", icon: "📱" },
  { id: "general", label: "General IT / Fresher", icon: "💻" },
];

const difficulties = [
  { id: "easy", label: "Easy", desc: "Fresher level", color: "#10b981" },
  { id: "medium", label: "Medium", desc: "1-2 years exp", color: "#f59e0b" },
  { id: "hard", label: "Hard", desc: "Senior level", color: "#ef4444" },
];

const interviewTypes = [
  { id: "technical", label: "Technical", icon: "💻", desc: "DSA, coding, system design" },
  { id: "hr", label: "HR Round", icon: "🤝", desc: "Behavioral, situational" },
  { id: "full", label: "Full Interview", icon: "🎯", desc: "Mix of everything" },
];

const Setup = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("medium");
  const [selectedType, setSelectedType] = useState("full");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) setUser(u);
      else navigate("/");
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleResumeUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Please upload a PDF file only!");
      return;
    }
    setResumeFileName(file.name);
    setResumeText(`Candidate uploaded resume: ${file.name}`);
    setError("");
  };

  const handleGenerateQuestions = async () => {
    if (!selectedRole) {
      setError("Please select a job role first!");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const prompt = `You are an expert technical interviewer. Generate exactly 10 interview questions.
Job Role: ${selectedRole}
Difficulty: ${selectedDifficulty}
Interview Type: ${selectedType}
${resumeText ? `Resume Info: ${resumeText}` : ""}

IMPORTANT: Return ONLY a valid JSON array. No markdown, no backticks, no extra text before or after.
Format exactly like this:
[{"id":1,"question":"Tell me about yourself","type":"HR","hint":"Focus on education and skills","timeLimit":60}]

Mix question types:
- technical: 7 technical + 2 behavioral + 1 HR
- hr: 2 technical + 5 behavioral + 3 situational
- full: 4 technical + 3 behavioral + 2 situational + 1 HR

Make all questions specific to ${selectedRole} at ${selectedDifficulty} difficulty.`;

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
                content: "You are an expert interviewer. Always respond with valid JSON array only. No markdown, no backticks, no explanations, no extra text."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        console.error("Groq API error:", errData);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0]) {
        throw new Error("No response from Groq");
      }

      const rawText = data.choices[0].message.content;
      const cleanText = rawText.replace(/```json|```/g, "").trim();
      const questions = JSON.parse(cleanText);

      const sessionRef = await addDoc(collection(db, "sessions"), {
        userId: user.uid,
        userName: user.displayName,
        role: selectedRole,
        difficulty: selectedDifficulty,
        type: selectedType,
        questions: questions,
        resumeUploaded: !!resumeText,
        createdAt: serverTimestamp(),
        status: "pending",
      });

      navigate(`/interview/${sessionRef.id}`);

    } catch (err) {
      console.error("Error:", err);
      setError(`Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-page">
      <div className="setup-bg">
        <div className="setup-blob-1"></div>
        <div className="setup-blob-2"></div>
      </div>

      <nav className="setup-nav">
        <div className="logo" onClick={() => navigate("/dashboard")} style={{cursor:"pointer"}}>
          <span>⚡</span>
          <span className="logo-text">InterviewAI</span>
        </div>
        <div className="setup-nav-right">
          <img src={user?.photoURL} alt="" className="user-avatar" />
          <span>{user?.displayName?.split(" ")[0]}</span>
        </div>
      </nav>

      <div className="setup-container">
        <div className="setup-header">
          <h1>Set Up Your <span className="gradient-text">Interview</span></h1>
          <p>Configure your session and let AI generate personalized questions</p>
        </div>

        <div className="progress-steps">
          {["Choose Role", "Settings", "Resume"].map((s, i) => (
            <div key={i} className={`progress-step ${step > i+1 ? "done" : ""} ${step === i+1 ? "active" : ""}`}>
              <div className="step-circle">{step > i+1 ? "✓" : i+1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="setup-step">
            <h2>What role are you interviewing for?</h2>
            <div className="roles-grid">
              {jobRoles.map((role) => (
                <div
                  key={role.id}
                  className={`role-card ${selectedRole === role.id ? "selected" : ""}`}
                  onClick={() => setSelectedRole(role.id)}
                >
                  <span className="role-icon">{role.icon}</span>
                  <span className="role-label">{role.label}</span>
                  {selectedRole === role.id && <span className="check">✓</span>}
                </div>
              ))}
            </div>
            {error && <p className="error-msg">⚠️ {error}</p>}
            <button className="next-btn" onClick={() => {
              if (!selectedRole) { setError("Please select a role!"); return; }
              setError(""); setStep(2);
            }}>
              Next — Configure Settings →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="setup-step">
            <h2>Configure your interview</h2>
            <div className="settings-section">
              <h3>Difficulty Level</h3>
              <div className="options-row">
                {difficulties.map((d) => (
                  <div key={d.id}
                    className={`option-card ${selectedDifficulty === d.id ? "selected" : ""}`}
                    onClick={() => setSelectedDifficulty(d.id)}
                    style={{"--option-color": d.color}}>
                    <span className="option-label">{d.label}</span>
                    <span className="option-desc">{d.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="settings-section">
              <h3>Interview Type</h3>
              <div className="options-row">
                {interviewTypes.map((t) => (
                  <div key={t.id}
                    className={`option-card ${selectedType === t.id ? "selected" : ""}`}
                    onClick={() => setSelectedType(t.id)}>
                    <span style={{fontSize:"1.5rem"}}>{t.icon}</span>
                    <span className="option-label">{t.label}</span>
                    <span className="option-desc">{t.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="step-buttons">
              <button className="back-btn" onClick={() => setStep(1)}>← Back</button>
              <button className="next-btn" onClick={() => setStep(3)}>
                Next — Upload Resume →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="setup-step">
            <h2>Upload your resume <span style={{color:"var(--muted)",fontSize:"1rem"}}>(optional)</span></h2>
            <p style={{color:"var(--muted)",marginBottom:"24px"}}>
              AI will generate questions based on YOUR skills
            </p>
            <label className={`upload-box ${resumeFileName ? "uploaded" : ""}`}>
              <input type="file" accept=".pdf" onChange={handleResumeUpload} style={{display:"none"}} />
              {resumeFileName ? (
                <>
                  <span style={{fontSize:"2.5rem"}}>✅</span>
                  <p className="upload-filename">{resumeFileName}</p>
                  <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>Click to change</p>
                </>
              ) : (
                <>
                  <span style={{fontSize:"3rem"}}>📄</span>
                  <p className="upload-text">Click to upload your resume</p>
                  <p style={{color:"var(--muted)",fontSize:"0.85rem"}}>PDF files only</p>
                </>
              )}
            </label>

            <div className="summary-card">
              <h3>Your Interview Summary</h3>
              <div className="summary-row">
                <span>Role</span>
                <span>{jobRoles.find(r=>r.id===selectedRole)?.icon} {jobRoles.find(r=>r.id===selectedRole)?.label}</span>
              </div>
              <div className="summary-row">
                <span>Difficulty</span>
                <span>{difficulties.find(d=>d.id===selectedDifficulty)?.label}</span>
              </div>
              <div className="summary-row">
                <span>Type</span>
                <span>{interviewTypes.find(t=>t.id===selectedType)?.label}</span>
              </div>
              <div className="summary-row">
                <span>Questions</span>
                <span>10 questions</span>
              </div>
              <div className="summary-row">
                <span>Resume</span>
                <span>{resumeFileName || "Not uploaded"}</span>
              </div>
            </div>

            {error && <p className="error-msg">⚠️ {error}</p>}

            <div className="step-buttons">
              <button className="back-btn" onClick={() => setStep(2)}>← Back</button>
              <button
                className={`generate-btn ${loading ? "loading" : ""}`}
                onClick={handleGenerateQuestions}
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner"></span> AI is generating...</>
                  : <>🤖 Generate My Questions →</>
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Setup;