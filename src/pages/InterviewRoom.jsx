import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import "./InterviewRoom.css";

const InterviewRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auth check
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      if (u) setUser(u);
      else navigate("/");
    });
    return () => unsubscribe();
  }, [navigate]);

  // Load session from Firestore
  useEffect(() => {
    const loadSession = async () => {
      try {
        const docRef = doc(db, "sessions", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSession(data);
          setQuestions(data.questions);
          setTimeLeft(data.questions[0]?.timeLimit || 60);
        } else {
          navigate("/dashboard");
        }
      } catch (err) {
        console.error(err);
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadSession();
  }, [id, navigate]);

  // Timer countdown
  useEffect(() => {
    if (loading || interviewDone) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleNextQuestion(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIndex, loading, interviewDone]);

  // Voice recognition
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser doesn't support voice input. Please type your answer.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join("");
      setAnswer(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  // Save answer and move to next question
  const handleNextQuestion = async (timedOut = false) => {
    clearInterval(timerRef.current);
    stopListening();

    const currentQuestion = questions[currentIndex];
    const newAnswer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      type: currentQuestion.type,
      answer: answer.trim() || (timedOut ? "No answer given" : "Skipped"),
      timeTaken: (currentQuestion.timeLimit || 60) - timeLeft,
      timedOut,
    };

    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);
    setAnswer("");

    // Check if last question
    if (currentIndex >= questions.length - 1) {
      setSubmitting(true);
      try {
        // Save all answers to Firestore
        await addDoc(collection(db, "sessions", id, "answers"), {
          answers: updatedAnswers,
          completedAt: serverTimestamp(),
          userId: user?.uid,
        });
        setInterviewDone(true);
        setSubmitting(false);
        // Go to results page
        setTimeout(() => navigate(`/results/${id}`), 2000);
      } catch (err) {
        console.error(err);
        setSubmitting(false);
      }
    } else {
      // Next question
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setTimeLeft(questions[nextIndex]?.timeLimit || 60);
    }
  };

  // Timer color based on time left
  const getTimerColor = () => {
    if (timeLeft > 30) return "#10b981";
    if (timeLeft > 10) return "#f59e0b";
    return "#ef4444";
  };

  // Timer percentage for circle
  const totalTime = questions[currentIndex]?.timeLimit || 60;
  const timerPercent = (timeLeft / totalTime) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (timerPercent / 100) * circumference;

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading your interview...</p>
      </div>
    );
  }

  if (interviewDone) {
    return (
      <div className="done-screen">
        <div className="done-card">
          <span className="done-emoji">🎉</span>
          <h1>Interview Complete!</h1>
          <p>Analyzing your answers...</p>
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex) / questions.length) * 100;

  return (
    <div className="interview-room">
      {/* Background */}
      <div className="ir-bg">
        <div className="ir-blob-1"></div>
        <div className="ir-blob-2"></div>
      </div>

      {/* Top bar */}
      <nav className="ir-nav">
        <div className="logo">
          <span>⚡</span>
          <span className="logo-text">InterviewAI</span>
        </div>
        <div className="ir-nav-center">
          <span className="session-info">
            {session?.role} • {session?.difficulty} • {session?.type}
          </span>
        </div>
        <div className="ir-nav-right">
          <img src={user?.photoURL} alt="" className="user-avatar" />
        </div>
      </nav>

      {/* Progress bar */}
      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{width:`${progress}%`}}></div>
      </div>
      <div className="progress-label">
        Question {currentIndex + 1} of {questions.length}
      </div>

      <div className="ir-container">

        {/* Question card */}
        <div className="question-card">
          <div className="question-header">
            <span className={`question-type type-${currentQuestion?.type?.toLowerCase()}`}>
              {currentQuestion?.type}
            </span>
            <span className="question-number">Q{currentIndex + 1}</span>
          </div>

          <p className="question-text">{currentQuestion?.question}</p>

          {currentQuestion?.hint && (
            <div className="hint-box">
              💡 <span>{currentQuestion.hint}</span>
            </div>
          )}
        </div>

        {/* Timer + Answer area */}
        <div className="answer-section">

          {/* Circular timer */}
          <div className="timer-container">
            <svg className="timer-svg" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6"/>
              <circle
                cx="50" cy="50" r="45"
                fill="none"
                stroke={getTimerColor()}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{transform:"rotate(-90deg)", transformOrigin:"50% 50%", transition:"stroke-dashoffset 1s linear, stroke 0.3s"}}
              />
            </svg>
            <div className="timer-text" style={{color: getTimerColor()}}>
              {timeLeft}s
            </div>
          </div>

          {/* Answer textarea */}
          <div className="answer-area">
            <textarea
              className="answer-input"
              placeholder={isListening ? "🎙️ Listening... speak now" : "Type your answer here or use the mic button below..."}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={6}
            />

            {/* Voice + action buttons */}
            <div className="answer-buttons">
              <button
                className={`mic-btn ${isListening ? "listening" : ""}`}
                onClick={isListening ? stopListening : startListening}
              >
                {isListening ? "⏹️ Stop" : "🎙️ Speak"}
              </button>

              <button
                className="skip-btn"
                onClick={() => handleNextQuestion(false)}
              >
                Skip →
              </button>

              <button
                className="next-btn"
                onClick={() => handleNextQuestion(false)}
                disabled={!answer.trim() || submitting}
              >
                {submitting ? "Saving..." :
                  currentIndex === questions.length - 1
                    ? "Finish Interview ✓"
                    : "Next Question →"
                }
              </button>
            </div>
          </div>
        </div>

        {/* Question dots */}
        <div className="question-dots">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`dot ${i === currentIndex ? "active" : ""} ${i < currentIndex ? "done" : ""}`}
            />
          ))}
        </div>

      </div>
    </div>
  );
};

export default InterviewRoom;