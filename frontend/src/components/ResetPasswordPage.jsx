import React, { useState } from 'react';

export default function ResetPasswordPage({ token }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('Your password has been successfully reset! Redirecting to login...');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password. The link may have expired.');
      }
    } catch (err) {
      setError('A network error occurred. Please verify the server is running.');
    } finally {
      setIsLoading(false);
    }
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
      <div className="panel" style={{ width: '100%', maxWidth: '440px', boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9)' }}>
        <div className="panel-header" style={{ justifyContent: 'center', flexDirection: 'column', gap: '8px', padding: '32px 28px 24px 28px' }}>
          <div className="logo-icon" style={{ width: '48px', height: '48px', marginBottom: '8px' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center' }}>
            Reset Password
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Enter a secure new password for your account
          </p>
        </div>

        <div className="panel-body" style={{ padding: '24px 32px 32px 32px' }}>
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

          {success && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '0.82rem',
              color: 'var(--color-success)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              animation: 'fadeIn var(--transition-normal)'
            }}>
              <span style={{ fontWeight: 800 }}>✓</span>
              <span>{success}</span>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="upload-form" style={{ gap: '20px' }}>
              <div className="input-group">
                <label className="input-label" htmlFor="password">New Password</label>
                <input
                  id="password"
                  type="password"
                  className="chat-input"
                  style={{ padding: '14px' }}
                  placeholder="Enter new password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="chat-input"
                  style={{ padding: '14px' }}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

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
                    Updating Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <a
              href="/"
              style={{
                color: 'var(--color-primary)',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                fontFamily: 'var(--font-primary)'
              }}
            >
              Back to Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
