import { useState } from 'react';
import { Bot, Send, User, AlertCircle } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { api } from '../services/api';

export default function Assistant() {
  const { profile } = useProfile();
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      text: `Hello! I am the NutriForge AI Label Assistant. Ask me anything about packaged nutrition facts, label jargon, or how products align with your ${profile.goal.replace('_', ' ')} goal.` 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const historyStr = localStorage.getItem('nutriforge_history') || '[]';
      const recentIds: string[] = JSON.parse(historyStr);

      const res = await api.askAssistant({
        query: userMsg,
        profile,
        context_product_ids: recentIds
      });

      setMessages(prev => [...prev, { role: 'assistant', text: res.response }]);
      if (res.disclaimer) {
        setDisclaimer(res.disclaimer);
      }
    } catch {
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: 'Sorry, I am having trouble connecting to the intelligence engine right now. Please ensure the backend is running.' 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col pb-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Bot className="text-blue-600" />
          AI Nutrition Assistant
        </h1>
        <p className="text-slate-600 text-sm">
          Decision-support & label literacy intelligence grounded in your profile and analyzed products.
        </p>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-blue-100 text-blue-600'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 ${
                msg.role === 'user' 
                  ? 'bg-slate-900 text-white rounded-tr-sm' 
                  : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-sm text-sm'
              }`}>
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          )}
        </div>

        {disclaimer && (
          <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-slate-400" />
            <span>{disclaimer}</span>
          </div>
        )}

        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about protein scaling, added sugars, or ingredient definitions..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
