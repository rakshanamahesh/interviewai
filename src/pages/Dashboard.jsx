import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/config";
import { signOut } from "firebase/auth";
import "./Dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (!user) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <nav className="dash-nav">
        <div className="logo">
          <span>⚡</span>
          <span className="logo-text">InterviewAI</span>
        </div>
        <div className="user-info">
          <img src={user.photoURL} alt={user.displayName} className="user-avatar" />
          <span className="user-name">{user.displayName}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <main className="dash-main">
        <div className="welcome-section">
          <h1>Welcome back, <span className="gradient-text">{user.displayName.split(" ")[0]}</span>! 👋</h1>
          <p>Ready to practice? Choose what you want to do today.</p>
        </div>

        <div className="quick-start-grid">
          {[
            {icon:"🚀",title:"Start New Interview",desc:"Pick a role and start practicing right now",path:"/setup"},
            {icon:"📄",title:"Upload Resume",desc:"Get questions based on your actual resume",path:"/resume"},
            {icon:"📊",title:"View Analytics",desc:"See your scores and improvement over time",path:"/analytics"},
            {icon:"📥",title:"Download Report",desc:"Get a PDF of your last interview performance",path:"/report"},
          ].map((option, i) => (
            <div className="quick-card" key={i} onClick={() => navigate(option.path)} style={{animationDelay:`${i*0.1}s`}}>
              <div className="quick-icon">{option.icon}</div>
              <div className="quick-content">
                <h3>{option.title}</h3>
                <p>{option.desc}</p>
              </div>
              <span className="quick-arrow">→</span>
            </div>
          ))}
        </div>

        <div className="stats-section">
          <h2>Your Progress</h2>
          <div className="stats-grid">
            {[
              {label:"Sessions Done",value:"0",icon:"🎯"},
              {label:"Avg Score",value:"—",icon:"📊"},
              {label:"Questions Answered",value:"0",icon:"💬"},
              {label:"Best Score",value:"—",icon:"🏆"},
            ].map((stat,i) => (
              <div className="stat-card" key={i}>
                <span className="stat-card-icon">{stat.icon}</span>
                <span className="stat-card-value">{stat.value}</span>
                <span className="stat-card-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;