import React from 'react';

export default function HistoryList({ resumes, activeId, onSelect, onDelete }) {
  
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getScoreColorClass = (score) => {
    if (score >= 80) return 'rgba(16, 185, 129, 0.1)';
    if (score >= 50) return 'rgba(245, 158, 11, 0.1)';
    return 'rgba(239, 68, 68, 0.1)';
  };

  const getScoreTextColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="history-section">
      <h3 className="history-title">Analysis History</h3>
      {resumes && resumes.length > 0 ? (
        <ul className="history-list">
          {resumes.map((resume) => (
            <li 
              key={resume._id} 
              className={`history-item ${activeId === resume._id ? 'active' : ''}`}
              onClick={() => onSelect(resume._id)}
            >
              <div className="history-item-header">
                <span className="history-filename" title={resume.fileName}>
                  {resume.fileName}
                </span>
                
                {resume.analysis && resume.analysis.score !== undefined && (
                  <span 
                    className="history-score" 
                    style={{ 
                      backgroundColor: getScoreColorClass(resume.analysis.score),
                      color: getScoreTextColor(resume.analysis.score)
                    }}
                  >
                    {resume.analysis.score}
                  </span>
                )}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span className="history-date">
                  {formatDate(resume.createdAt)}
                </span>
                <button 
                  type="button" 
                  className="history-delete-btn" 
                  onClick={(e) => onDelete(resume._id, e)}
                  title="Delete Analysis"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', textAlign: 'center', marginTop: '16px', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
          No previous analyses found. Upload a resume to get started!
        </div>
      )}
    </div>
  );
}
