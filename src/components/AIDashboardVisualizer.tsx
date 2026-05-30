import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { RefreshCw, AlertCircle, Play } from 'lucide-react';
import { getCachedAiItem, setCachedAiItem, formatAiError } from '../utils/aiHelper';

interface AIDashboardVisualizerProps {
  contextData: unknown;
  promptGoal: string;
  aiProvider: 'gemini' | 'openai';
  aiModel: string;
  aiApiKey: string;
}

export const AIDashboardVisualizer: React.FC<AIDashboardVisualizerProps> = ({
  contextData,
  promptGoal,
  aiProvider,
  aiModel,
  aiApiKey
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasRunOnce, setHasRunOnce] = useState(false);

  const cacheKey = useMemo(() => {
    const dataStr = contextData ? JSON.stringify(contextData) : '';
    const dataHash = dataStr.length + '_' + dataStr.substring(0, 50) + '_' + dataStr.substring(Math.max(0, dataStr.length - 50));
    return `ai_widget_${promptGoal.replace(/\s+/g, '_')}_${aiProvider}_${aiModel}_${dataHash}`;
  }, [contextData, promptGoal, aiProvider, aiModel]);

  // If the dataset or goal changes, reset hasRunOnce so it re-generates or re-runs from cache
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasRunOnce(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [cacheKey]);

  const runWidgetCode = useCallback((jsCode: string) => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    
    const executeVisualizer = new Function('container', 'data', `
      try {
        ${jsCode}
      } catch(e) {
        container.innerHTML = '<div style="color:#f87171; padding:1rem; background:rgba(239,68,68,0.1); border-radius:8px; border:1px solid #ef4444;"><strong>Widget Execution Error:</strong> ' + e.message + '</div>';
      }
    `);

    executeVisualizer(containerRef.current, contextData);
    setHasRunOnce(true);
  }, [contextData]);

  const generateAndExecute = useCallback(async (force = false) => {
    if (!aiApiKey) {
      setError('API Key is missing.');
      return;
    }

    // Check localStorage cache first
    const cached = getCachedAiItem<string>(cacheKey, 7 * 24 * 60 * 60 * 1000);
    if (cached && !force) {
      runWidgetCode(cached);
      return;
    }

    setLoading(true);
    setError(null);
    if (containerRef.current) containerRef.current.innerHTML = '';
    
    try {
      const systemPrompt = `You are an expert Frontend Developer and Data Visualization AI for DriveStats.
CRITICAL RULES:
1. Your ONLY output must be a valid, executable JavaScript block. 
2. NO markdown wrappers. NO conversational text. NO JSON objects.
3. You MUST use Vanilla JS (e.g. document.createElement, container.innerHTML) to build the DOM. Do NOT just dump raw JSON or plain text.
4. If you output anything other than pure, executable JavaScript, the system will crash.
5. Create a visually premium, glassmorphic widget using the data provided.

START YOUR RESPONSE EXACTLY LIKE THIS:
const render = function(container, data) {
  // your logic here
};
render(container, data);`;

      const userPrompt = `Generate the JS visualization for the following data:\n${JSON.stringify(contextData)}\n\nGOAL: ${promptGoal}`;
      
      let jsCode = '';
      if (aiProvider === 'gemini') {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${aiApiKey.trim()}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.1 },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
          })
        });
        if (!response.ok) {
          const errData = await response.json().catch(()=>({}));
          throw new Error(errData?.error?.message || `Gemini API Error: ${response.status}`);
        }
        const result = await response.json();
        const parts = result?.candidates?.[0]?.content?.parts || [];
        jsCode = parts.map((p: any) => p.text || '').join('');
      } else {
        const endpoint = 'https://api.openai.com/v1/chat/completions';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiApiKey.trim()}` },
          body: JSON.stringify({
            model: aiModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.1
          })
        });
        if (!response.ok) throw new Error(`OpenAI API Error: ${response.status}`);
        const result = await response.json();
        jsCode = result?.choices?.[0]?.message?.content || '';
      }

      // Smart regex extraction to catch cases where AI wrapped it in markdown anyway
      const codeBlockMatch = jsCode.match(/```(?:javascript|js)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        jsCode = codeBlockMatch[1].trim();
      } else {
        // Fallback: strip any stray backticks just in case
        jsCode = jsCode.replace(/```(javascript|js|json)?/g, '').replace(/```/g, '').trim();
      }

      setCachedAiItem(cacheKey, jsCode);
      runWidgetCode(jsCode);

    } catch (err) {
      console.error(err);
      setError(formatAiError(err));
    } finally {
      setLoading(false);
    }
  }, [aiApiKey, aiModel, aiProvider, contextData, promptGoal, cacheKey, runWidgetCode]);

  useEffect(() => {
    // Only auto-run if we have an API key, haven't run yet, and aren't currently loading
    if (aiApiKey && !hasRunOnce && !loading) {
        const timer = setTimeout(() => {
          generateAndExecute();
        }, 0);
        return () => clearTimeout(timer);
    }
  }, [aiApiKey, hasRunOnce, loading, generateAndExecute]);

  return (
    <div className="glass-card" style={{ padding: '1rem', position: 'relative', overflow: 'hidden', minHeight: '250px' }}>
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--accent-cyan)' }}>
          <RefreshCw size={28} className="spin-animation" style={{ marginBottom: '1rem' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>AI Generating Interactive Dashboard...</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>Writing and executing custom JavaScript widgets based on your calendar data.</span>
        </div>
      )}
      
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      
      {!loading && !error && !hasRunOnce && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '200px' }}>
           <button onClick={() => generateAndExecute(false)} className="btn btn-primary" style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto' }}>
             <Play size={14} /> Run Dynamic Widget Engine
           </button>
        </div>
      )}

      {/* The container where the AI will inject its DOM elements */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          display: loading || (!hasRunOnce && !error) ? 'none' : 'block' 
        }} 
      />
      
      {/* Regenerate button overlay */}
      {!loading && hasRunOnce && (
        <button 
          onClick={() => generateAndExecute(true)}
          style={{ 
            position: 'absolute', 
            top: '0.5rem', 
            right: '0.5rem', 
            background: 'var(--bg-nested)', 
            border: '1px solid var(--border-light)', 
            color: 'var(--text-muted)', 
            padding: '0.3rem 0.6rem', 
            borderRadius: '6px', 
            fontSize: '0.7rem', 
            cursor: 'pointer', 
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            transition: 'all 0.2s'
          }}
          className="hover-glow"
        >
          <RefreshCw size={10} /> Regenerate Widget
        </button>
      )}
    </div>
  );
};
