import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider } from "../firebase/config";
import { signInWithPopup } from "firebase/auth";
import "./Landing.css";

const Landing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) navigate("/dashboard");
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>
      <div className="blob blob-3"></div>

      <nav className="navbar">
        <div className="logo">
          <span>⚡</span>
          <span className="logo-text">InterviewAI</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <button className="nav-btn" onClick={handleGoogleLogin}>Get Started</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge">🚀 AI-Powered Interview Prep</div>
        <h1 className="hero-title">
          Crack Your Dream
          <span className="gradient-text"> Interview</span>
          <br />With AI Coaching
        </h1>
        <p className="hero-subtitle">
          Practice with real AI, get instant feedback, track progress, and land that internship.
        </p>
        {error && <p className="error-msg">⚠️ {error}</p>}
        <button className="cta-button" onClick={handleGoogleLogin} disabled={loading}>
          {loading ? <span className="spinner"></span> : <>🔵 Continue with Google — It's Free</>}
        </button>
        <p className="hero-note">No credit card. No signup form. Just Google.</p>

        <div className="stats-row">
          <div className="stat"><span className="stat-number">10,000+</span><span className="stat-label">Practice Sessions</span></div>
          <div className="stat-divider"></div>
          <div className="stat"><span className="stat-number">95%</span><span className="stat-label">Satisfaction</span></div>
          <div className="stat-divider"></div>
          <div className="stat"><span className="stat-number">500+</span><span className="stat-label">Questions</span></div>
        </div>
      </section>

      <section className="features" id="features">
        <h2 className="section-title">Everything you need to get hired</h2>
        <div className="features-grid">
          {[
            {icon:"🎙️",title:"Voice Interview",desc:"Answer by speaking. AI transcribes and analyzes your response."},
            {icon:"📄",title:"Resume Questions",desc:"Upload resume and get questions tailored to your skills."},
            {icon:"🤖",title:"AI Feedback",desc:"Instant scores on communication, technical depth, confidence."},
            {icon:"📊",title:"Analytics",desc:"Visual dashboards show improvement over time."},
            {icon:"📥",title:"PDF Report",desc:"Download detailed performance report anytime."},
            {icon:"🏆",title:"Leaderboard",desc:"Compete with users and see global rankings."},
          ].map((f,i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="footer-cta">
        <h2>Ready to ace your next interview?</h2>
        <button className="cta-button" onClick={handleGoogleLogin}>Start Practicing Free →</button>
      </section>

      <footer className="footer">
        <p>Built with ❤️ by an IT student | InterviewAI 2025</p>
      </footer>
    </div>
  );
};

export default Landing;