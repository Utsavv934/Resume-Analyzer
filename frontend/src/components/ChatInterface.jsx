import React, { useState, useRef, useEffect } from 'react';

export default function ChatInterface({ resumeId, chatHistory, onSendMessage }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatHistoryRef = useRef(null);

  // Auto-scroll to bottom of chat history on update without scrolling the main page
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({
        top: chatHistoryRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chatHistory, isSending]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message || message.trim() === '' || isSending) return;

    const userMsg = message.trim();
    setMessage('');
    setIsSending(true);

    try {
      await onSendMessage(resumeId, userMsg);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Ask Resume AI Assistant
        </h2>
      </div>
      <div className="panel-body">
        <div className="chat-container">
          
          {chatHistory && chatHistory.length > 0 ? (
            <div className="chat-history" ref={chatHistoryRef}>
              {chatHistory.map((msg, index) => (
                <div key={index} className={`chat-bubble ${msg.role}`}>
                  <div className="chat-message">
                    {msg.message}
                  </div>
                  <span className="chat-meta">
                    {msg.role === 'user' ? 'You' : 'Resume AI'} • {formatTime(msg.timestamp || new Date())}
                  </span>
                </div>
              ))}
              
              {isSending && (
                <div className="chat-bubble model">
                  <div className="chat-message" style={{ display: 'flex', gap: '5px', padding: '12px 16px', alignItems: 'center' }}>
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="chat-empty-state">
              <svg className="chat-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M8 10h.01" />
                <path d="M12 10h.01" />
                <path d="M16 10h.01" />
              </svg>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Interactive Coaching Session</h3>
              <p style={{ fontSize: '0.8rem', maxWidth: '300px', lineHeight: '1.4' }}>
                Ask tailorable questions about this resume. For example:
              </p>
              <div className="chat-coaching-pills">
                <button 
                  type="button" 
                  className="coaching-pill-btn" 
                  onClick={() => setMessage("How can I better phrase my project achievements to sound more impactful?")}
                >
                  "How can I better phrase my projects?"
                </button>
                <button 
                  type="button" 
                  className="coaching-pill-btn" 
                  onClick={() => setMessage("What are the most critical skills I am missing for this job description?")}
                >
                  "What missing skills are critical?"
                </button>
                <button 
                  type="button" 
                  className="coaching-pill-btn" 
                  onClick={() => setMessage("Can you rewrite my resume summary to focus on leadership skills?")}
                >
                  "Can you rewrite my summary?"
                </button>
              </div>
            </div>
          )}

          <form className="chat-input-area" onSubmit={handleSubmit}>
            <input
              type="text"
              className="chat-input"
              placeholder="Ask a question about this resume analysis..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending || !resumeId}
            />
            <button 
              type="submit" 
              className="chat-send-btn" 
              disabled={isSending || !message.trim() || !resumeId}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
