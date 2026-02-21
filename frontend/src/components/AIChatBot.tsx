import React, { useState, useRef, useEffect } from 'react';
import './AIChatBot.css';

const API_BASE = import.meta.env.VITE_SMS_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5000' : '');

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const SUGGESTED_QUESTIONS = [
  "What's open today?",
  "Where can I get halal food?",
  "What's open on Sunday?",
  "How do I apply for SNAP?",
  "Is there food available right now?",
];

export function AIChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-ai-chat', handler);
    return () => window.removeEventListener('open-ai-chat', handler);
  }, []);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !API_BASE) return;
    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setLoading(true);
    const url = `${API_BASE.replace(/\/$/, '')}/api/ask-assistant`;
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data?.error || 'Something went wrong');
        setMessages((prev) => prev.slice(0, -1));
        return;
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || '' }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (!API_BASE) return null;

  return (
    <>
      <button
        type="button"
        className="ai-chatbot-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : 'Open Common Table assistant'}
        aria-expanded={open}
      >
        {open ? '✕' : '💬'}
      </button>
      {open && (
        <div className="ai-chatbot-panel" role="dialog" aria-labelledby="ai-chatbot-title">
          <div className="ai-chatbot-header">
            <h2 id="ai-chatbot-title">Ask Common Table</h2>
            <button type="button" className="ai-chatbot-close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <p className="ai-chatbot-desc">Ask about food shelves, hours, and where to find food near you.</p>
          <div className="ai-chatbot-messages">
            {messages.length === 0 && !loading && (
              <div className="ai-chatbot-suggestions">
                <p className="ai-chatbot-suggest-label">Try asking:</p>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    className="ai-chatbot-chip"
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-chatbot-msg ai-chatbot-msg-${m.role}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="ai-chatbot-msg ai-chatbot-msg-assistant ai-chatbot-typing">
                <span className="ai-chatbot-dots">
                  <span>.</span><span>.</span><span>.</span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {error && <p className="ai-chatbot-error">{error}</p>}
          <form className="ai-chatbot-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask about food near you…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              aria-label="Your message"
            />
            <button type="submit" className="btn btn-primary ai-chatbot-send" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
