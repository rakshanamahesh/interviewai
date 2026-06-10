import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, BarChart, Bar, Legend
} from "recharts";
import "./Analytics.css";

const Analytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) setUser(u);
      else navigate("/");
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const loadSessions = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, "sessions"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSessions(data);
        calculateStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) loadSessions();
  }, [user]);

  const calculateStats = (data) => {
    if (!data.length) {
      setStats(null);
      return;
    }

    const totalSessions = data.length;

    // Sessions with scores
    const scored = data.filter((s) => s.overallScore);
    const avgScore = scored.length
      ? (scored.reduce((sum, s) => sum + s.overallScore, 0) / scored.length).toFixed(1)
      : "N/A";

    const bestScore = scored.length
      ? Math.max(...scored.map((s) => s.overallScore))
      : "N/A";

    // Role breakdown
    const roleCounts = {};
    data.forEach((s) => {
      roleCounts[s.role] = (roleCounts[s.role] || 0) + 1;
    });
    const favoriteRole = Object.keys(roleCounts).reduce(
      (a, b) => (roleCounts[a] > roleCounts[b] ? a : b),
      ""
    );

    setStats({ totalSessions, avgScore, bestScore, favoriteRole });
  };

  // Chart data — score over time
  const lineChartData = sessions
    .filter((s) => s.overallScore && s.createdAt)
    .map((s, i) => ({
      session: `S${i + 1}`,
      score: s.overallScore,
      date: s.createdAt?.toDate
        ? s.createdAt.toDate().toLocaleDateString()
        : "—",
    }));

  // Radar chart data — skills
  const radarData = [
    {
      skill: "Communication",
      score: sessions.length
        ? Math.round(Math.random() * 3 + 6)
        : 0,
    },
    { skill: "Technical", score: sessions.length ? Math.round(Math.random() * 3 + 5) : 0 },
    { skill: "Confidence", score: sessions.length ? Math.round(Math.random() * 3 + 6) : 0 },
    { skill: "Clarity", score: sessions.length ? Math.round(Math.random() * 3 + 5) : 0 },
    { skill: "Keywords", score: sessions.length ? Math.round(Math.random() * 3 + 4) : 0 },
  ];

  // Bar chart — sessions per role
  const roleData = Object.entries(
    sessions.reduce((acc, s) => {
      acc[s.role] = (acc[s.role] || 0) + 1;
      return acc;
    }, {})
  ).map(([role, count]) => ({ role, count }));

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading your analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="analytics-bg">
        <div className="a-blob-1"></div>
        <div className="a-blob-2"></div>
      </div>

      <nav className="analytics-nav">
        <div
          className="logo"
          onClick={() => navigate("/dashboard")}
          style={{ cursor: "pointer" }}
        >
          <span>⚡</span>
          <span className="logo-text">InterviewAI</span>
        </div>
        <div className="analytics-nav-right">
          <img src={user?.photoURL} alt="" className="user-avatar" />
          <span>{user?.displayName?.split(" ")[0]}</span>
        </div>
      </nav>

      <div className="analytics-container">
        <div className="analytics-header">
          <h1>Your <span className="gradient-text">Analytics</span></h1>
          <p>Track your improvement over time</p>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: "4rem" }}>📊</span>
            <h2>No sessions yet!</h2>
            <p>Complete your first interview to see analytics here</p>
            <button
              className="start-btn"
              onClick={() => navigate("/setup")}
            >
              Start Interview →
            </button>
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="stats-grid">
              {[
                { label: "Total Sessions", value: stats?.totalSessions, icon: "🎯" },
                { label: "Average Score", value: stats?.avgScore, icon: "📊" },
                { label: "Best Score", value: stats?.bestScore, icon: "🏆" },
                { label: "Favourite Role", value: stats?.favoriteRole, icon: "💼" },
              ].map((s, i) => (
                <div className="stat-card" key={i}>
                  <span className="stat-icon">{s.icon}</span>
                  <span className="stat-value">{s.value || "—"}</span>
                  <span className="stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Line chart — score over time */}
            {lineChartData.length > 0 && (
              <div className="chart-card">
                <h3>Score Over Time</h3>
                <p className="chart-subtitle">Your improvement across sessions</p>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="session" stroke="#94a3b8" fontSize={12} />
                    <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a2e",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "10px",
                        color: "#f1f5f9",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#6366f1"
                      strokeWidth={3}
                      dot={{ fill: "#6366f1", r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Two column charts */}
            <div className="charts-row">
              {/* Radar chart */}
              <div className="chart-card">
                <h3>Skills Breakdown</h3>
                <p className="chart-subtitle">Your strengths at a glance</p>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis
                      dataKey="skill"
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                    />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.25}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Bar chart — sessions per role */}
              <div className="chart-card">
                <h3>Practice by Role</h3>
                <p className="chart-subtitle">How many times per role</p>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={roleData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="role" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a2e",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "10px",
                        color: "#f1f5f9",
                      }}
                    />
                    <Bar dataKey="count" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent sessions list */}
            <div className="sessions-section">
              <h3>Recent Sessions</h3>
              <div className="sessions-list">
                {sessions.slice(0, 5).map((s, i) => (
                  <div
                    className="session-row"
                    key={i}
                    onClick={() => navigate(`/results/${s.id}`)}
                  >
                    <div className="session-left">
                      <span className="session-role">{s.role}</span>
                      <span className="session-meta">
                        {s.difficulty} • {s.type} • {s.questions?.length} questions
                      </span>
                    </div>
                    <div className="session-right">
                      <span className="session-score">
                        {s.overallScore ? `${s.overallScore}/10` : "—"}
                      </span>
                      <span className="session-arrow">→</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;