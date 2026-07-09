import React, { useState } from 'react';

export default function AnalysisResult({ data, onGenerateCoverLetter, isGeneratingCoverLetter }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  if (!data || !data.analysis) return null;

  const { score, summary, strengths, improvements, skills, formattingFeedback, jobMatch, actionPlan } = data.analysis;

  // Determine score color class and stroke color
  let strokeColor = '#10b981'; // Green
  if (score < 50) {
    strokeColor = '#ef4444'; // Red
  } else if (score < 80) {
    strokeColor = '#f59e0b'; // Amber
  }

  // Calculate circular stroke offset
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Check if job match information is present
  const hasJobMatch = jobMatch && jobMatch.score !== null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow popups to download the PDF.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Cover Letter - ${data.fileName.replace('.pdf', '')}</title>
          <style>
            body {
              font-family: 'Georgia', Times, serif;
              line-height: 1.6;
              color: #1e293b;
              padding: 40px 50px;
              max-width: 800px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .content {
              white-space: pre-wrap;
              font-size: 11pt;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="content">${data.coverLetter ? data.coverLetter.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString();
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Analysis Results
        </h2>
        
        <button 
          type="button" 
          className="coaching-pill-btn" 
          style={{ 
            padding: '6px 12px', 
            fontSize: '0.8rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            margin: 0,
            cursor: 'pointer'
          }}
          onClick={handlePrint}
          title="Export complete ATS report to PDF"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Export PDF
        </button>
      </div>
      
      <div className="panel-body">
        
        {/* Printable Only Header (Hidden on screen) */}
        <div className="print-only-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <h1 style={{ fontSize: '1.6rem', color: '#111', fontWeight: 800 }}>ATS Resume Evaluation Report</h1>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                Powered by ResumeAI Pro • Gemini Intelligence
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>Generated: {formatDate(data.createdAt)}</p>
              <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '2px' }}>File: {data.fileName}</p>
            </div>
          </div>
        </div>

        <div className="results-container">
          
          {/* Score Header */}
          <div className="score-hero">
            <div className="radial-progress-container">
              <svg className="radial-progress-svg">
                <circle className="radial-progress-bg" cx="45" cy="45" r={radius} />
                <circle 
                  className="radial-progress-bar" 
                  cx="45" 
                  cy="45" 
                  r={radius} 
                  stroke={strokeColor}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="score-text">{score}</div>
            </div>
            
            <div className="score-summary-box">
              <h3 className="score-summary-title">ATS Resume Score</h3>
              <p className="score-summary-desc">{summary}</p>
            </div>
          </div>

          {/* Navigation Tabs (Hidden during print) */}
          <div className="result-tabs">
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
              onClick={() => setActiveTab('skills')}
            >
              Skills
            </button>
            {hasJobMatch && (
              <button 
                type="button" 
                className={`tab-btn ${activeTab === 'matching' ? 'active' : ''}`}
                onClick={() => setActiveTab('matching')}
              >
                Job Matching ({jobMatch.score}%)
              </button>
            )}
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'formatting' ? 'active' : ''}`}
              onClick={() => setActiveTab('formatting')}
            >
              Formatting & Action
            </button>
            <button 
              type="button" 
              className={`tab-btn ${activeTab === 'coverletter' ? 'active' : ''}`}
              onClick={() => setActiveTab('coverletter')}
            >
              Cover Letter
            </button>
          </div>

          {/* Tab Contents (Uses .tab-pane for clean print sheets layout) */}
          <div className="tab-content">
            
            {/* OVERVIEW PANEL */}
            <div className={`tab-pane ${activeTab === 'overview' ? 'active' : ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 className="print-section-title" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#10b981', marginBottom: '10px' }}>Key Strengths</h4>
                  <ul className="feedback-list">
                    {strengths.map((str, i) => (
                      <li key={i} className="feedback-item">
                        <span className="feedback-bullet strength">✓</span>
                        <span>{str}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="print-section-title" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f59e0b', marginBottom: '10px' }}>Areas for Improvement</h4>
                  <ul className="feedback-list">
                    {improvements.map((imp, i) => (
                      <li key={i} className="feedback-item">
                        <span className="feedback-bullet improvement">!</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* SKILLS PANEL */}
            <div className={`tab-pane ${activeTab === 'skills' ? 'active' : ''}`}>
              <div>
                <h4 className="print-section-title" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '10px' }}>
                  Identified Skills & Keywords
                </h4>
                <p className="print-hide-desc" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  These skills and technologies were detected from your resume content.
                </p>
                <div className="skills-grid">
                  {skills.length > 0 ? (
                    skills.map((skill, i) => (
                      <span key={i} className="skill-tag">
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>No key skills explicitly identified.</span>
                  )}
                </div>
              </div>
            </div>

            {/* JOB MATCHING PANEL */}
            {hasJobMatch && (
              <div className={`tab-pane ${activeTab === 'matching' ? 'active' : ''}`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', className: 'print-border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Job Fit Alignment</span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: jobMatch.score >= 75 ? '#10b981' : '#f59e0b' }}>
                        {jobMatch.score}% Match
                      </span>
                    </div>
                    <div className="print-progress-bg" style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        className="print-progress-bar"
                        style={{ 
                          height: '100%', 
                          width: `${jobMatch.score}%`, 
                          background: `linear-gradient(to right, ${strokeColor}, var(--color-secondary))` 
                        }} 
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="print-section-title" style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ef4444', marginBottom: '10px' }}>Missing Requirements / Gaps</h4>
                    <ul className="feedback-list">
                      {jobMatch.gaps && jobMatch.gaps.length > 0 ? (
                        jobMatch.gaps.map((gap, i) => (
                          <li key={i} className="feedback-item">
                            <span className="feedback-bullet gap">✕</span>
                            <span>{gap}</span>
                          </li>
                        ))
                      ) : (
                        <li className="feedback-item">
                          <span className="feedback-bullet strength">✓</span>
                          <span style={{ color: 'var(--text-muted)' }}>Excellent! No major gaps detected against the target job description.</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <h4 className="print-section-title" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '10px' }}>Tailoring Recommendations</h4>
                    <ul className="feedback-list">
                      {jobMatch.recommendations && jobMatch.recommendations.map((rec, i) => (
                        <li key={i} className="feedback-item">
                          <span className="feedback-bullet strength">★</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* FORMATTING & ACTION PLAN PANEL */}
            <div className={`tab-pane ${activeTab === 'formatting' ? 'active' : ''}`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <h4 className="print-section-title" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>
                    Formatting & Structure Feedback
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.4', padding: '12px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', className: 'print-text-box' }}>
                    {formattingFeedback || 'Formatting looks standard and parses cleanly.'}
                  </p>
                </div>

                <div>
                  <h4 className="print-section-title" style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-secondary)', marginBottom: '10px' }}>
                    Priority Action Plan
                  </h4>
                  <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {actionPlan.map((action, i) => (
                      <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '0.88rem', lineHeight: '1.4' }}>
                        <span className="print-numbered-bullet" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', background: 'var(--color-primary-glow)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--color-primary)', borderRadius: '50%', flexShrink: 0, fontSize: '0.75rem', fontWeight: 700 }}>
                          {i + 1}
                        </span>
                        <span style={{ marginTop: '2px' }}>{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            {/* COVER LETTER PANEL */}
            <div className={`tab-pane print-exclude ${activeTab === 'coverletter' ? 'active' : ''}`}>
              {!data.targetJobDescription ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" style={{ marginBottom: '16px', display: 'inline-block' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>Target Job Description Required</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto', lineHeight: '1.4' }}>
                    To generate a tailored cover letter, please make sure to paste a target Job Description in the text area when uploading your resume.
                  </p>
                </div>
              ) : !data.coverLetter ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" style={{ marginBottom: '16px', display: 'inline-block' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>Generate Tailored Cover Letter</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto 20px auto', lineHeight: '1.4' }}>
                    Instantly create a professional, recruiter-ready cover letter tailored to your resume achievements and this target job description.
                  </p>
                  <button
                    type="button"
                    className="submit-btn"
                    style={{ width: 'auto', padding: '10px 24px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    onClick={() => onGenerateCoverLetter(data._id)}
                    disabled={isGeneratingCoverLetter}
                  >
                    {isGeneratingCoverLetter ? (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }}>
                          <line x1="12" y1="2" x2="12" y2="6" />
                          <line x1="12" y1="18" x2="12" y2="22" />
                        </svg>
                        Generating Cover Letter...
                      </>
                    ) : (
                      'Generate Cover Letter'
                    )}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      type="button"
                      className="coaching-pill-btn"
                      style={{ margin: 0, padding: '8px 16px', fontSize: '0.8rem', cursor: 'pointer' }}
                      onClick={() => {
                        navigator.clipboard.writeText(data.coverLetter);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                    </button>
                    <button
                      type="button"
                      className="coaching-pill-btn"
                      style={{ margin: 0, padding: '8px 16px', fontSize: '0.8rem', cursor: 'pointer' }}
                      onClick={() => {
                        const element = document.createElement("a");
                        const file = new Blob([data.coverLetter], { type: 'text/plain' });
                        element.href = URL.createObjectURL(file);
                        element.download = `${data.fileName.replace('.pdf', '')}_Cover_Letter.txt`;
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                      }}
                    >
                      Download (.txt)
                    </button>
                    <button
                      type="button"
                      className="coaching-pill-btn"
                      style={{ margin: 0, padding: '8px 16px', fontSize: '0.8rem', cursor: 'pointer' }}
                      onClick={handleDownloadPdf}
                    >
                      Download (PDF)
                    </button>
                  </div>

                  <div style={{ 
                    background: '#0a0d16', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    padding: '24px 30px', 
                    fontFamily: 'Georgia, serif', 
                    fontSize: '0.92rem', 
                    color: '#e2e8f0', 
                    lineHeight: '1.6', 
                    whiteSpace: 'pre-line',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
                    maxHeight: '500px',
                    overflowY: 'auto',
                    textAlign: 'left'
                  }}>
                    {data.coverLetter}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
