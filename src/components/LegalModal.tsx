import React from 'react';
import { X } from 'lucide-react';

interface LegalModalProps {
  type: 'privacy' | 'tos' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  const isPrivacy = type === 'privacy';

  return (
    <div 
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(5px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 9999, padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        className="glass-card animate-slide-up"
        style={{
          width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto',
          padding: '2rem', position: 'relative', background: 'var(--bg-dark)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.5rem', right: '1.5rem',
            background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '50%',
            width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center',
            color: 'var(--text-main)', cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
          {isPrivacy ? 'Privacy Policy' : 'Terms of Service'}
        </h2>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {isPrivacy ? (
            <>
              <p><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</p>
              <p>Your privacy is strictly protected. <strong>ADI stats</strong> is designed to operate entirely in your local web browser. We do not store, track, or share your calendar data on any centralized servers.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>1. Data Accessed</h3>
              <p>Our application requests access to your Google Calendar data. Specifically, we request read-only access to your calendar events (e.g., event titles, start times, end times, and descriptions) to analyze your scheduling statistics.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>2. Data Usage</h3>
              <p>We use the Google user data we access strictly to generate local analytical dashboards and scheduling efficiency metrics for you. The data is processed entirely client-side within your web browser to calculate lessons taught, hours worked, and revenue generated.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>3. Data Sharing</h3>
              <p>We <strong>do not</strong> share, transfer, or sell your Google user data to any third parties. Your data never leaves your device unless you explicitly enable the optional "AI Insights" feature, in which case anonymized scheduling statistics (not raw calendar data) are sent securely to the AI provider (e.g., OpenAI or Google Gemini) using your own provided API key.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>4. Data Storage & Protection</h3>
              <p>We do not store your Google user data on any centralized servers or databases. All calendar data and OAuth access tokens are stored securely and locally in your browser's <code>localStorage</code> and are cleared when you log out or clear your browser data.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>5. Data Retention & Deletion</h3>
              <p>Because we do not store your data on our servers, data retention is entirely under your control. You can permanently delete all associated Google user data and access tokens at any time by clearing your browser cache, logging out of the application, or revoking the application's access directly from your Google Account settings.</p>

              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>6. Changes to This Policy</h3>
              <p>We may update our Privacy Policy periodically. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
            </>
          ) : (
            <>
              <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
              <p>Please read these Terms of Service completely before using ADI stats. By using the app, you agree to be bound by these terms.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>1. Service Description</h3>
              <p>ADI stats provides analytical dashboard tools for Approved Driving Instructors. The service is provided "as is" and relies on the accurate integration of third-party calendar providers.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>2. User Responsibilities</h3>
              <p>You are solely responsible for maintaining the confidentiality of any API keys, calendar feed URLs, or OAuth tokens used within the app. Because the application runs completely locally, you are responsible for securing your own device.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>3. Disclaimer of Warranties</h3>
              <p>The app and all its contents are provided on an "as is" basis without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or entirely accurate, especially considering its reliance on third-party calendar APIs.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>4. Limitation of Liability</h3>
              <p>In no event shall the creators or maintainers of ADI stats be liable for any direct, indirect, incidental, or consequential damages arising out of your use of the application, including but not limited to lost revenue, miscalculated business metrics, or third-party data breaches.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
