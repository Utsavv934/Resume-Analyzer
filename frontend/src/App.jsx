import React, { useState, useEffect } from 'react';
import UploadZone from './components/UploadZone';
import AnalysisResult from './components/AnalysisResult';
import ChatInterface from './components/ChatInterface';
import HistoryList from './components/HistoryList';
import AuthPage from './components/AuthPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import CompareResumes from './components/CompareResumes';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(!!localStorage.getItem('token'));
  
  const [resetToken] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/reset-password/')) {
      return path.substring(16); // Extract the token after '/reset-password/'
    }
    return '';
  });

  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ isMongoConnected: false, isDemoMode: true });
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  // 1. Verify token validation on mount
  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setIsVerifyingAuth(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          setUser(data.user);
          // Load app data
          fetchStatus(token);
          fetchResumes(token);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error('Auth verification error:', err);
        // On network error, still allow them to stay logged in if there's a token
        // to handle offline server situations gracefully, or fallback mode.
        if (token.startsWith('mock-token-')) {
          setUser({ id: token.split('mock-token-')[1], email: 'demo-user@example.com' });
          fetchStatus(token);
          fetchResumes(token);
        } else {
          handleLogout();
        }
      } finally {
        setIsVerifyingAuth(false);
      }
    };

    verifyUser();
  }, [token]);

  const fetchStatus = async (authToken = token) => {
    try {
      const res = await fetch('/api/status', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setStatus({
        isMongoConnected: data.isMongoConnected,
        isDemoMode: data.isDemoMode
      });
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  const fetchResumes = async (authToken = token) => {
    try {
      const res = await fetch('/api/resumes', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setResumes(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch resumes history:', err);
    }
  };

  const handleSelectResume = async (id) => {
    setIsComparing(false);
    try {
      setIsLoading(true);
      const res = await fetch(`/api/resumes/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedResume(data.data);
      }
    } catch (err) {
      console.error('Failed to load resume detail:', err);
      alert('Failed to load resume details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteResume = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this analysis?')) return;

    try {
      const res = await fetch(`/api/resumes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (selectedResume && selectedResume._id === id) {
          setSelectedResume(null);
        }
        fetchResumes(token);
      }
    } catch (err) {
      console.error('Failed to delete resume:', err);
      alert('Failed to delete resume analysis.');
    }
  };

  const handleAnalyzeResume = async (file, jobDescription) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('resume', file);
    if (jobDescription) {
      formData.append('jobDescription', jobDescription);
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedResume(data.data);
        fetchResumes(token);
        fetchStatus(token); // Refresh status just in case
      } else {
        alert(data.error || 'Failed to analyze resume.');
      }
    } catch (err) {
      console.error('Analysis request error:', err);
      alert('An error occurred while uploading and analyzing the resume.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeResumeDirect = async (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchResumes(token);
        fetchStatus(token);
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to analyze resume.');
      }
    } catch (err) {
      console.error('Direct analysis request error:', err);
      throw err;
    }
  };

  const handleSendMessage = async (resumeId, message) => {
    try {
      const res = await fetch(`/api/resumes/${resumeId}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (data.success) {
        // Update local chat history state
        setSelectedResume(prev => {
          if (!prev) return null;
          return {
            ...prev,
            chatHistory: [...(prev.chatHistory || []), data.userMessage, data.modelMessage]
          };
        });
      } else {
        alert(data.error || 'Failed to send chat message.');
      }
    } catch (err) {
      console.error('Chat error:', err);
      alert('An error occurred during communication.');
    }
  };

  const handleGenerateCoverLetter = async (resumeId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/cover-letter`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedResume(data.data);
        fetchResumes(token);
      } else {
        alert(data.error || 'Failed to generate cover letter.');
      }
    } catch (err) {
      console.error('Cover letter request error:', err);
      alert('An error occurred while generating the cover letter.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = (newToken, authUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(authUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setResumes([]);
    setSelectedResume(null);
  };

  const handleStartNewAnalysis = () => {
    setSelectedResume(null);
    setIsComparing(false);
  };

  // Redirection checks
  if (resetToken) {
    return <ResetPasswordPage token={resetToken} />;
  }

  if (isVerifyingAuth) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        background: '#04060d',
        color: '#ffffff',
        gap: '20px'
      }}>
        <div className="loading-ring" />
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Verifying session details...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="app-container animate-fade-in">
      
      {/* SIDEBAR FOR HISTORY & LOGO */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M8 12h4M8 16h6" />
              <path d="M11 8.5L11.5 7.5l0.5 1-0.5 1z" />
            </svg>
          </div>
          <span className="logo-text">ResumeAI Pro</span>
        </div>

        <button 
          type="button" 
          className="new-analysis-btn"
          onClick={handleStartNewAnalysis}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Analysis
        </button>

        <button 
          type="button" 
          className="new-analysis-btn"
          style={{ 
            marginTop: '8px', 
            background: 'var(--color-secondary-glow)', 
            border: '1px solid rgba(139, 92, 246, 0.3)',
            color: 'var(--color-secondary)',
            marginBottom: '16px'
          }}
          onClick={() => {
            setSelectedResume(null);
            setIsComparing(true);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="3" x2="12" y2="21" />
            <line x1="3" y1="7" x2="21" y2="7" />
            <path d="M6 7l-3 5h6z" />
            <path d="M18 7l-3 5h6z" />
          </svg>
          Compare Resumes
        </button>

        <HistoryList 
          resumes={resumes}
          activeId={selectedResume ? selectedResume._id : null}
          onSelect={handleSelectResume}
          onDelete={handleDeleteResume}
        />

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button 
            type="button" 
            onClick={handleLogout}
            className="coaching-pill-btn"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.8rem',
              justifyContent: 'center',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.06)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              color: 'var(--color-danger)',
              cursor: 'pointer'
            }}
            title="Log out of your account"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout ({user.email.length > 18 ? user.email.substring(0, 15) + '...' : user.email})
          </button>
          <div style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.75rem' }}>
            <p>MERN Stack AI Tool</p>
            <p style={{ marginTop: '2px' }}>v1.0.0</p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="main-content">
        
        {/* NAVBAR */}
        <nav className="navbar">
          <div className="navbar-title">
            <h1>AI Resume Analyzer</h1>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="status-badge">
              <span className={`status-dot ${status.isMongoConnected ? 'success' : 'warning'}`} />
              <span>{status.isMongoConnected ? 'MongoDB Connected' : 'Local Memory Fallback'}</span>
            </div>
            <div className="status-badge">
              <span className={`status-dot ${status.isDemoMode ? 'warning' : 'success'}`} />
              <span>{status.isDemoMode ? 'Demo (Mock AI)' : 'Gemini AI Active'}</span>
            </div>
          </div>
        </nav>

        {/* NOTIFICATIONS & WARNINGS */}
        {!alertDismissed && (status.isDemoMode || !status.isMongoConnected) && (
          <div className="alert-banner">
            <div className="alert-content">
              <span className="alert-warning-icon">⚠</span>
              <span>
                {status.isDemoMode && status.isMongoConnected && 
                  "Running in Demo Mode. To get real AI analysis, add your GEMINI_API_KEY in the backend/.env file and restart the backend."}
                {!status.isMongoConnected && status.isDemoMode && 
                  "MongoDB is disconnected AND running in Demo Mode. To configure the full experience, connect a MongoDB database and specify your GEMINI_API_KEY in backend/.env."}
                {!status.isMongoConnected && !status.isDemoMode && 
                  "MongoDB is disconnected. App is currently storing data in temporary local memory (will be reset when server restarts)."}
              </span>
            </div>
            <button 
              type="button" 
              className="alert-dismiss" 
              onClick={() => setAlertDismissed(true)}
            >
              ✕
            </button>
          </div>
        )}

        {/* DASHBOARD WORKSPACE GRID */}
        {isComparing ? (
          <CompareResumes 
            resumes={resumes} 
            token={token} 
            onAnalyzeDirect={handleAnalyzeResumeDirect}
          />
        ) : isLoading && !selectedResume ? (
          <div className="loading-container animate-fade-in">
            <div className="loading-ring" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Analyzing Resume Text</h3>
            <p className="loading-steps">Extracting text, running keywords, and generating ATS report...</p>
          </div>
        ) : selectedResume ? (
          <div className="dashboard-grid animate-fade-in">
            <AnalysisResult 
              data={selectedResume} 
              onGenerateCoverLetter={handleGenerateCoverLetter}
              isGeneratingCoverLetter={isLoading}
            />
            <ChatInterface 
              resumeId={selectedResume._id} 
              chatHistory={selectedResume.chatHistory}
              onSendMessage={handleSendMessage}
            />
          </div>
        ) : (
          <div className="dashboard-grid animate-fade-in">
            
            {/* Left side: Upload Form */}
            <UploadZone onAnalyze={handleAnalyzeResume} isLoading={isLoading} />

            {/* Right side: App Pitch / Instructions */}
            <div className="panel" style={{ background: 'linear-gradient(135deg, rgba(20, 26, 45, 0.25), rgba(10, 15, 26, 0.45))' }}>
              <div className="panel-header">
                <h2 className="panel-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Features & AI Capabilities
                </h2>
              </div>
              <div className="panel-body" style={{ justifyContent: 'center', gap: '24px' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', background: 'rgba(255, 255, 255, 0.015)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', transition: 'all 0.25s ease' }}>
                  <div style={{ padding: '12px', background: 'var(--color-primary-glow)', borderRadius: '14px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>ATS Scoring & Summary</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      Get a comprehensive quality score out of 100 based on ATS criteria and a concise professional summary of your candidate profile.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', background: 'rgba(255, 255, 255, 0.015)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', transition: 'all 0.25s ease' }}>
                  <div style={{ padding: '12px', background: 'rgba(168, 85, 247, 0.15)', borderRadius: '14px', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>Strengths & Gaps Analysis</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      Understand what parts of your resume are strong and where you need improvement. Compare directly against job descriptions to see missing keywords.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', background: 'rgba(255, 255, 255, 0.015)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', transition: 'all 0.25s ease' }}>
                  <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '14px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>Interactive AI Career Coach</h3>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                      Don't just look at reviews — chat directly with the AI! Ask it to rewrite achievements, suggest certifications, or help format sections of your resume.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
