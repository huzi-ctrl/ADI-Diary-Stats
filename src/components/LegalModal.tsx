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
          padding: '2rem', position: 'relative', background: 'var(--bg-main)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '1.5rem', right: '1.5rem',
            background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%',
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
              <p>Your privacy is strictly protected. <strong>DriveStats ADI</strong> is designed to operate entirely in your local web browser. We do not store, track, or share your calendar data on any centralized servers.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>1. Data Collection & Storage</h3>
              <p>When you sync a Google, Microsoft Outlook, or iCalendar feed, the events are fetched directly by your browser. The data processing happens completely client-side. The dashboard statistics, including lessons, times, and dates, are never uploaded to any database owned by us.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>2. Third-Party Integrations</h3>
              <p>The app interacts with third-party APIs (such as Google Calendar API and Microsoft Graph API) directly from your device. Any OAuth access tokens generated during login are strictly stored locally in your browser's <code>localStorage</code> and are only used for the express purpose of syncing your calendar.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>3. AI Insights (Optional)</h3>
              <p>If you choose to enable the AI Insights functionality and provide your own API key (e.g., OpenAI or Google Gemini), anonymous summary statistics will be transmitted securely to those respective AI providers for the purpose of generating insights. We do not intermediate this process; your API key is stored only on your device, and the data is sent directly to the provider.</p>

              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>4. Changes to This Policy</h3>
              <p>We may update our Privacy Policy periodically. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
            </>
          ) : (
            <>
              <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
              <p>Please read these Terms of Service completely before using DriveStats ADI. By using the app, you agree to be bound by these terms.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>1. Service Description</h3>
              <p>DriveStats ADI provides analytical dashboard tools for Approved Driving Instructors. The service is provided "as is" and relies on the accurate integration of third-party calendar providers.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>2. User Responsibilities</h3>
              <p>You are solely responsible for maintaining the confidentiality of any API keys, calendar feed URLs, or OAuth tokens used within the app. Because the application runs completely locally, you are responsible for securing your own device.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>3. Disclaimer of Warranties</h3>
              <p>The app and all its contents are provided on an "as is" basis without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or entirely accurate, especially considering its reliance on third-party calendar APIs.</p>
              
              <h3 style={{ color: 'var(--text-main)', marginTop: '0.5rem' }}>4. Limitation of Liability</h3>
              <p>In no event shall the creators or maintainers of DriveStats ADI be liable for any direct, indirect, incidental, or consequential damages arising out of your use of the application, including but not limited to lost revenue, miscalculated business metrics, or third-party data breaches.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
