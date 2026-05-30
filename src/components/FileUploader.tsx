import React, { useState, useRef } from 'react';
import { Upload, Calendar, Link, AlertTriangle, ShieldCheck, ArrowLeft } from 'lucide-react';

interface FileUploaderProps {
  onFileParsed: (text: string, fileName: string) => void;
  handleConnectGoogle: () => void;
  handleConnectOutlook: () => void;
  calendarUrl: string;
  setCalendarUrl: (url: string) => void;
  handleSyncLiveCalendar: (url?: string) => void;
  isSyncing?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFileParsed, 
  handleConnectGoogle,
  handleConnectOutlook,
  calendarUrl = '',
  setCalendarUrl,
  handleSyncLiveCalendar,
  isSyncing = false
}) => {
  const [activeTab, setActiveTab] = useState<'webcal' | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.ics')) {
      setError('Invalid file type. Please upload an iCalendar (.ics) file.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        onFileParsed(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ maxWidth: '600px', margin: '1rem auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="mobile-uploader-wizard">
      
      {/* Brand Intro Card */}
      <div className="glass-card" style={{ padding: '1.5rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(34, 211, 238, 0.15))', padding: '0.75rem', borderRadius: '50%', color: 'var(--accent-indigo)', display: 'flex' }}>
          <Calendar size={32} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>DriveStats Schedule Analyzer</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.35rem', maxWidth: '480px', lineHeight: 1.4 }}>
            Unlock AI-powered scheduling feedback, Year-over-Year utilization reviews, and revenue diagnostics. Connect your diary securely.
          </p>
        </div>
      </div>

      {activeTab === null ? (
        /* SERVICE SELECTION LANDING */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '0.25rem' }}>
              Select Live Connection Service
            </span>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
              {/* Google Button */}
              <button 
                type="button"
                className="glass-card hover-glow" 
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 1rem', cursor: 'pointer', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)', transition: 'all 0.2s', borderRadius: '12px' }}
                onClick={handleConnectGoogle}
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" width={32} height={32} alt="Google" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Google Calendar</span>
              </button>

              {/* Outlook Button */}
              <button 
                type="button"
                className="glass-card hover-glow" 
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 1rem', cursor: 'pointer', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)', transition: 'all 0.2s', borderRadius: '12px' }}
                onClick={handleConnectOutlook}
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" width={32} height={32} alt="Microsoft" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Outlook Calendar</span>
              </button>

              {/* iCal Link Button */}
              <button 
                type="button"
                className="glass-card hover-glow" 
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 1rem', cursor: 'pointer', border: '1px solid var(--border-light)', background: 'var(--bg-card)', color: 'var(--text-main)', transition: 'all 0.2s', borderRadius: '12px' }}
                onClick={() => setActiveTab('webcal')}
              >
                <div style={{ background: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent-cyan)', padding: '0.4rem', borderRadius: '50%', display: 'flex' }}>
                  <Link size={24} />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>iCal URL Feed</span>
              </button>
            </div>
          </div>

          {/* Offline File Upload Card (Smaller Option 2) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: '0.25rem' }}>
              Alternatively: Upload Offline File
            </span>
            
            <div 
              className={`glass-card ${dragActive ? 'drag-active' : ''}`}
              style={{ padding: '1.25rem', textAlign: 'center', borderStyle: 'dashed', cursor: 'pointer', transition: 'all 0.2s ease', borderColor: dragActive ? 'var(--accent-indigo)' : 'var(--border-light)' }}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              
              <Upload size={18} style={{ color: 'var(--text-muted)', margin: '0 auto 0.4rem auto' }} />
              <h4 style={{ margin: '0 0 0.15rem 0', fontSize: '0.85rem', color: 'var(--text-main)' }}>Upload local iCalendar file (.ics)</h4>
              <span style={{ fontSize: '0.725rem', color: 'var(--text-dim)', display: 'block', marginBottom: '0.75rem' }}>Drag & drop or click to browse</span>

              {/* Privacy Disclaimer */}
              <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(52, 211, 153, 0.04)', border: '1px solid rgba(52, 211, 153, 0.15)', padding: '0.5rem 0.75rem', borderRadius: '8px', textAlign: 'left', alignItems: 'flex-start' }}>
                <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: '0.05rem' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                  <strong>Local Privacy Notice:</strong> Your file is processed strictly inside your browser. We never save, upload, or transmit your private calendar data to any external server.
                </span>
              </div>

              {error && (
                <div style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', gap: '0.3rem', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={12} />
                  {error}
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        /* CONFIGURE SELECTED LIVE CONNECTION TAB (Webcal only) */
        <div className="glass-card animate-slide-up" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Header & Back Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
              className="hover-glow"
            >
              <ArrowLeft size={14} />
              Back to services
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Link size={14} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>iCalendar URL Feed Link</span>
            </div>
          </div>

          {/* WEBCAL/ICAL URL CONFIGURE */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Provide Private Live Feed Link</span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Private Webcal / HTTPS Link</label>
              <input 
                type="text" 
                className="select-input" 
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', width: '100%' }}
                placeholder="e.g. webcal://calendar.google.com/calendar/ical/..."
                value={calendarUrl}
                onChange={(e) => setCalendarUrl(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(52, 211, 153, 0.04)', border: '1px solid rgba(52, 211, 153, 0.15)', padding: '0.5rem 0.75rem', borderRadius: '8px', alignItems: 'flex-start' }}>
              <ShieldCheck size={14} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: '0.05rem' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                <strong>Privacy notice:</strong> This URL is only saved in your local web storage. Requests are dispatched directly from your browser. We never share or expose your private URLs.
              </span>
            </div>

            <button
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.65rem', borderColor: 'var(--accent-cyan)', color: 'var(--text-main)', background: 'var(--bg-nested)' }}
              onClick={() => handleSyncLiveCalendar(calendarUrl)}
              disabled={isSyncing || !calendarUrl.trim()}
            >
              Connect iCal URL Feed
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
