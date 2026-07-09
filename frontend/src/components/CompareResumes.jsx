import React, { useState, useEffect } from 'react';

export default function CompareResumes({ resumes, token, onAnalyzeDirect }) {
  const [resumeAId, setResumeAId] = useState('');
  const [resumeBId, setResumeBId] = useState('');
  
  const [resumeA, setResumeA] = useState(null);
  const [resumeB, setResumeB] = useState(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [uploadingA, setUploadingA] = useState(false);
  const [uploadingB, setUploadingB] = useState(false);

  // Fetch full details for Resume A when selection changes
  useEffect(() => {
    if (!resumeAId) {
      setResumeA(null);
      return;
    }
    const fetchA = async () => {
      setLoadingA(true);
      try {
        const res = await fetch(`/api/resumes/${resumeAId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setResumeA(data.data);
        }
      } catch (err) {
        console.error('Error fetching resume A:', err);
      } finally {
        setLoadingA(false);
      }
    };
    fetchA();
  }, [resumeAId, token]);

  // Fetch full details for Resume B when selection changes
  useEffect(() => {
    if (!resumeBId) {
      setResumeB(null);
      return;
    }
    const fetchB = async () => {
      setLoadingB(true);
      try {
        const res = await fetch(`/api/resumes/${resumeBId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setResumeB(data.data);
        }
      } catch (err) {
        console.error('Error fetching resume B:', err);
      } finally {
        setLoadingB(false);
      }
    };
    fetchB();
  }, [resumeBId, token]);

  // Compute skill differences
  const getSkillsComparison = () => {
    if (!resumeA?.analysis?.skills || !resumeB?.analysis?.skills) return null;
    const skillsA = new Set(resumeA.analysis.skills.map(s => s.toLowerCase().trim()));
    const skillsB = new Set(resumeB.analysis.skills.map(s => s.toLowerCase().trim()));

    const shared = [];
    const onlyA = [];
    const onlyB = [];

    // Find original case mappings
    const mapA = {};
    resumeA.analysis.skills.forEach(s => { mapA[s.toLowerCase().trim()] = s; });
    const mapB = {};
    resumeB.analysis.skills.forEach(s => { mapB[s.toLowerCase().trim()] = s; });

    skillsA.forEach(s => {
      if (skillsB.has(s)) {
        shared.push(mapA[s] || mapB[s]);
      } else {
        onlyA.push(mapA[s]);
      }
    });

    skillsB.forEach(s => {
      if (!skillsA.has(s)) {
        onlyB.push(mapB[s]);
      }
    });

    return { shared, onlyA, onlyB };
  };

  const skillsComp = getSkillsComparison();

  // Helper to determine score color
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 10px' }} className="animate-fade-in print-hide">
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>⚖️ Compare Resumes</h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Compare scores, missing gaps, and skill overlap side-by-side to optimize for your target roles.
          </p>
        </div>
      </div>

      {/* SELECTORS CONTAINER */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
        
        {/* Selector A */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>Select First Resume</label>
          <select 
            value={resumeAId} 
            onChange={(e) => setResumeAId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: '#0d111d', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
          >
            <option value="">-- Choose a Resume --</option>
            {resumes.map(r => (
              <option key={r._id} value={r._id}>
                {r.fileName} ({r.analysis?.score}% Match)
              </option>
            ))}
          </select>

          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Or upload from device:</span>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '6px',
              color: 'var(--color-primary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: uploadingA ? 'not-allowed' : 'pointer',
              textAlign: 'center'
            }}>
              {uploadingA ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }}>
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                  </svg>
                  Uploading...
                </>
              ) : 'Choose PDF File'}
              <input
                type="file"
                accept=".pdf"
                disabled={uploadingA}
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setUploadingA(true);
                  try {
                    const data = await onAnalyzeDirect(file);
                    setResumeAId(data._id);
                  } catch (err) {
                    alert(err.message || 'Upload failed');
                  } finally {
                    setUploadingA(false);
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* Selector B */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-secondary)' }}>Select Second Resume</label>
          <select 
            value={resumeBId} 
            onChange={(e) => setResumeBId(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', background: '#0d111d', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
          >
            <option value="">-- Choose a Resume --</option>
            {resumes.map(r => (
              <option key={r._id} value={r._id}>
                {r.fileName} ({r.analysis?.score}% Match)
              </option>
            ))}
          </select>

          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Or upload from device:</span>
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'rgba(139, 92, 246, 0.05)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '6px',
              color: 'var(--color-secondary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: uploadingB ? 'not-allowed' : 'pointer',
              textAlign: 'center'
            }}>
              {uploadingB ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }}>
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                  </svg>
                  Uploading...
                </>
              ) : 'Choose PDF File'}
              <input
                type="file"
                accept=".pdf"
                disabled={uploadingB}
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setUploadingB(true);
                  try {
                    const data = await onAnalyzeDirect(file);
                    setResumeBId(data._id);
                  } catch (err) {
                    alert(err.message || 'Upload failed');
                  } finally {
                    setUploadingB(false);
                  }
                }}
              />
            </label>
          </div>
        </div>

      </div>

      {/* COMPARISON RESULTS DASHBOARD */}
      {(!resumeA && !resumeB) ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>Compare Resumes</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '320px', textAlign: 'center', lineHeight: '1.4' }}>
            Choose two uploaded resume profiles from the dropdown menus above to compare differences side-by-side.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 1. SCORE COMPARISON PANEL */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Score Resume A */}
            <div className="panel" style={{ padding: '24px', background: resumeAId && resumeBId && resumeA?.analysis?.score > resumeB?.analysis?.score ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(0, 0, 0, 0))' : 'rgba(255, 255, 255, 0.02)', position: 'relative' }}>
              {loadingA ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><div className="loading-ring" /></div>
              ) : resumeA ? (
                <div>
                  {resumeAId && resumeBId && resumeA?.analysis?.score > resumeB?.analysis?.score && (
                    <span style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '0.72rem', fontWeight: 800, background: 'var(--color-primary-glow)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: '12px' }}>
                      ★ HIGHER SCORE
                    </span>
                  )}
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{resumeA.fileName}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: getScoreColor(resumeA.analysis.score) }}>
                      {resumeA.analysis.score}
                    </span>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Overall Evaluation</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Job Desc: {resumeA.targetJobDescription ? 'Tailored' : 'General Scan'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '16px' }}>No version selected.</div>
              )}
            </div>

            {/* Score Resume B */}
            <div className="panel" style={{ padding: '24px', background: resumeAId && resumeBId && resumeB?.analysis?.score > resumeA?.analysis?.score ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(0, 0, 0, 0))' : 'rgba(255, 255, 255, 0.02)', position: 'relative' }}>
              {loadingB ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><div className="loading-ring" /></div>
              ) : resumeB ? (
                <div>
                  {resumeAId && resumeBId && resumeB?.analysis?.score > resumeA?.analysis?.score && (
                    <span style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '0.72rem', fontWeight: 800, background: 'var(--color-secondary-glow)', border: '1px solid rgba(139,92,246,0.3)', color: 'var(--color-secondary)', padding: '4px 10px', borderRadius: '12px' }}>
                      ★ HIGHER SCORE
                    </span>
                  )}
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{resumeB.fileName}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '14px' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 900, color: getScoreColor(resumeB.analysis.score) }}>
                      {resumeB.analysis.score}
                    </span>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Overall Evaluation</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Job Desc: {resumeB.targetJobDescription ? 'Tailored' : 'General Scan'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '16px' }}>No version selected.</div>
              )}
            </div>

          </div>

          {/* 2. SKILL OVERLAP TRACKER */}
          {skillsComp && (
            <div className="panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '16px', color: '#ffffff' }}>🛠️ Skill & Keyword Overlap Comparison</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Shared skills */}
                <div>
                  <h5 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    Shared Skills ({skillsComp.shared.length})
                  </h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {skillsComp.shared.length > 0 ? (
                      skillsComp.shared.map((s, i) => (
                        <span key={i} style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', borderRadius: '6px' }}>
                          {s}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No shared skills detected.</span>
                    )}
                  </div>
                </div>

                {/* Unique skills grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  
                  {/* Unique A */}
                  <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                      Unique to Version A ({skillsComp.onlyA.length})
                    </h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {skillsComp.onlyA.length > 0 ? (
                        skillsComp.onlyA.map((s, i) => (
                          <span key={i} style={{ fontSize: '0.72rem', padding: '4px 8px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)', color: '#a5b4fc', borderRadius: '6px' }}>
                            {s}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None.</span>
                      )}
                    </div>
                  </div>

                  {/* Unique B */}
                  <div style={{ background: 'rgba(255,255,255,0.005)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                    <h5 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                      Unique to Version B ({skillsComp.onlyB.length})
                    </h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {skillsComp.onlyB.length > 0 ? (
                        skillsComp.onlyB.map((s, i) => (
                          <span key={i} style={{ fontSize: '0.72rem', padding: '4px 8px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.15)', color: '#d8b4fe', borderRadius: '6px' }}>
                            {s}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None.</span>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* 3. CORE INSIGHTS PANEL GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Version A Details */}
            <div className="panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '16px', color: 'var(--color-primary)' }}>📊 Version A Evaluation Details</h4>
              {resumeA ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Strengths */}
                  <div>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: '#10b981' }}>✓ Strengths</h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                      {resumeA.analysis.strengths.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: '#f59e0b' }}>⚠ Action Items</h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                      {resumeA.analysis.improvements.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>

                  {/* Gaps */}
                  {resumeA.analysis.jobMatch?.gaps && (
                    <div>
                      <h5 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: '#ef4444' }}>✕ Missing Job Gaps</h5>
                      <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                        {resumeA.analysis.jobMatch.gaps.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}

                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No version details loaded.</div>
              )}
            </div>

            {/* Version B Details */}
            <div className="panel" style={{ padding: '24px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '16px', color: 'var(--color-secondary)' }}>📊 Version B Evaluation Details</h4>
              {resumeB ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Strengths */}
                  <div>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: '#10b981' }}>✓ Strengths</h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                      {resumeB.analysis.strengths.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div>
                    <h5 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: '#f59e0b' }}>⚠ Action Items</h5>
                    <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                      {resumeB.analysis.improvements.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>

                  {/* Gaps */}
                  {resumeB.analysis.jobMatch?.gaps && (
                    <div>
                      <h5 style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: '#ef4444' }}>✕ Missing Job Gaps</h5>
                      <ul style={{ paddingLeft: '16px', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', margin: 0 }}>
                        {resumeB.analysis.jobMatch.gaps.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}

                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No version details loaded.</div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
