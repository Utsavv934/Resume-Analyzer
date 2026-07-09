import React, { useState, useEffect } from 'react';

export default function AuthPage({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Google OAuth configuration details
  const [googleClientId, setGoogleClientId] = useState(null);
  
  // Mock Google Selection popup state
  const [showGoogleMockPopup, setShowGoogleMockPopup] = useState(false);
  const mockGoogleUsers = [
    'john.doe@gmail.com',
    'jane.careercoach@gmail.com',
    'alex.developer@gmail.com'
  ];

  useEffect(() => {
    // 1. Fetch public Google client ID on mount
    fetch('/api/auth/config')
      .then(res => res.json())
      .then(data => {
        if (data.googleClientId) {
          setGoogleClientId(data.googleClientId);
        }
      })
      .catch(err => console.error('Failed to load OAuth configurations:', err));

    // 2. Load Google Identity Services Script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleCallback = async (response) => {
    setError('');
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: response.credential,
          isMockGoogle: false
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        onAuthSuccess(data.token, data.user);
      } else {
        setError(data.error || 'Google Sign-In failed.');
      }
    } catch (err) {
      setError('A network error occurred. Please verify the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId) return;

    const initializeGoogleButton = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCallback
        });
        
        const btnContainer = document.getElementById('google-signin-btn-container');
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            {
              theme: 'outline',
              size: 'large',
              text: 'continue_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: btnContainer.clientWidth || 376
            }
          );
        }
      } else {
        setTimeout(initializeGoogleButton, 100);
      }
    };

    initializeGoogleButton();
  }, [googleClientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onAuthSuccess(data.token, data.user);
      } else {
        setError(data.error || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      setError('A network error occurred. Please check if the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (googleEmail) => {
    setError('');
    setIsLoading(true);
    setShowGoogleMockPopup(false);
    
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: googleEmail,
          isMockGoogle: true
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        onAuthSuccess(data.token, data.user);
      } else {
        setError(data.error || 'Google Sign-In failed.');
      }
    } catch (err) {
      setError('A network error occurred. Please verify the server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      padding: '20px',
      background: 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(168, 85, 247, 0.12) 0px, transparent 50%), #04060d'
    }}>
      
      {/* GOOGLE MOCK SELECTION POPUP MODAL */}
      {showGoogleMockPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="panel" style={{ width: '90%', maxWidth: '380px', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '8px' }}>Google Account Picker</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Choose a mock Google account to sign in immediately:
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {mockGoogleUsers.map((mockEmail, i) => (
                <button
                  key={i}
                  type="button"
                  className="coaching-pill-btn"
                  style={{
                    padding: '12px',
                    justifyContent: 'center',
                    margin: 0,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                  onClick={() => handleGoogleLogin(mockEmail)}
                >
                  {mockEmail}
                </button>
              ))}
            </div>

            <button
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
              onClick={() => setShowGoogleMockPopup(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* AUTH CARD */}
      <div className="panel" style={{ width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)' }}>
        
        {/* Header */}
        <div className="panel-header" style={{ justifyContent: 'center', flexDirection: 'column', gap: '8px', padding: '32px 28px 24px 28px' }}>
          <div className="logo-icon" style={{ width: '48px', height: '48px', marginBottom: '8px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            {isLogin ? 'Sign in to access your AI resume evaluations' : 'Get started to analyze and optimize your resumes'}
          </p>
        </div>

        {/* Body */}
        <div className="panel-body" style={{ padding: '12px 32px 32px 32px' }}>
          
          {/* Google Sign-in Button */}
          <div style={{ marginBottom: '24px' }}>
            {googleClientId ? (
              <div 
                id="google-signin-btn-container" 
                style={{ 
                  width: '100%', 
                  minHeight: '44px', 
                  display: 'flex', 
                  justifyContent: 'center',
                  background: '#ffffff',
                  borderRadius: '24px',
                  overflow: 'hidden'
                }}
              ></div>
            ) : (
              <button
                type="button"
                className="coaching-pill-btn"
                style={{
                  width: '100%',
                  padding: '12px',
                  justifyContent: 'center',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#ffffff',
                  color: '#1f2937',
                  border: '1px solid #e5e7eb',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
                onClick={() => setShowGoogleMockPopup(true)}
              >
                {/* Google Branded SVG Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 15.02 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.86 3C6.26 7.55 8.9 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.9c2.18-2.02 3.7-4.99 3.7-8.63z" />
                  <path fill="#FBBC05" d="M5.36 14.5c-.24-.72-.38-1.49-.38-2.3s.14-1.58.38-2.3L1.5 6.9C.54 8.82 0 10.96 0 13.2s.54 4.38 1.5 6.3l3.86-3z" stroke="none" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.9c-1.1.74-2.52 1.18-4.23 1.18-3.1 0-5.74-2.51-6.64-5.46L1.5 19.38C3.4 23.23 7.35 23.78 12 23z" />
                </svg>
                Continue with Google
              </button>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '20px 0 8px 0',
              gap: '12px'
            }}>
              <div style={{ height: '1px', background: 'var(--border-color)', flex: 1 }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>OR CONTINUE WITH EMAIL</span>
              <div style={{ height: '1px', background: 'var(--border-color)', flex: 1 }} />
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '0.82rem',
              color: 'var(--color-danger)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeIn var(--transition-normal)'
            }}>
              <span style={{ fontWeight: 800 }}>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="upload-form" style={{ gap: '20px' }}>
            <div className="input-group">
              <label className="input-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="chat-input"
                style={{ padding: '14px' }}
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="chat-input"
                style={{ padding: '14px' }}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {!isLogin && (
              <div className="input-group" style={{ animation: 'fadeIn var(--transition-normal)' }}>
                <label className="input-label" htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="chat-input"
                  style={{ padding: '14px' }}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              style={{ marginTop: '10px' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }}>
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <polyline points="4.93 4.93 7.76 7.76" />
                    <polyline points="16.24 16.24 19.07 19.07" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>{isLogin ? 'Sign In' : 'Create Account'}</>
              )}
            </button>

            {/* Toggle Actions */}
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.82rem' }}>
              {isLogin ? (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>Don't have an account? </span>
                  <button
                    type="button"
                    onClick={handleToggleMode}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-primary)' }}
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>Already have an account? </span>
                  <button
                    type="button"
                    onClick={handleToggleMode}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-primary)' }}
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
