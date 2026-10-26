import { useState } from 'react';
import { Bot, Send, User, AlertCircle } from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { api } from '../services/api';

export default function Assistant() {
  const { profile } = useProfile();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello! I am the NutriForge Label Assistant. Ask me anything about packaged nutrition facts, deceptive marketing claims, ingredient definitions, or how foods align with your ${profile.goal.replace('_', ' ')} goal.`
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
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col pb-4 space-y-4">

      {/* Header */}
      <div className="pb-2 border-b border-[#eae4d5]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-bold tracking-wider uppercase text-[#183c27] bg-[#e6ede7] px-2.5 py-0.5 rounded-full border border-[#cfded1]">
            Decision Support
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#122b1c] tracking-tight flex items-center gap-2">
          <span>AI Label Assistant</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#4f5f53] mt-0.5">
          Literacy and ingredient intelligence grounded in your profile and analyzed products.
        </p>
      </div>

      {/* Chat Window */}
      <div className="flex-1 bg-[#fcfbf9] border border-[#eae4d5] rounded-2xl shadow-health flex flex-col overflow-hidden">

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                msg.role === 'user'
                  ? 'bg-[#183c27] text-white border-[#122b1c]'
                  : 'bg-[#e6ede7] text-[#183c27] border-[#cfded1]'
              }`}>
                {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
              </div>
              <div className={`max-w-[82%] rounded-2xl px-5 py-3.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                msg.role === 'user'
                  ? 'bg-[#183c27] text-white rounded-tr-xs'
                  : 'bg-[#f6f4ee] border border-[#eae4d5] text-[#171d18] rounded-tl-xs'
              }`}>
                <p>{msg.text}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-[#e6ede7] text-[#183c27] flex items-center justify-center shrink-0 border border-[#cfded1]">
                <Bot size={15} />
              </div>
              <div className="bg-[#f6f4ee] border border-[#eae4d5] rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-[#183c27] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[#183c27] rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-[#183c27] rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer Bar */}
        {disclaimer && (
          <div className="px-5 py-2.5 bg-[#f6f4ee] border-t border-[#eae4d5] text-[11px] text-[#4f5f53] flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-[#68856c]" />
            <span className="leading-snug">{disclaimer}</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 bg-[#f6f4ee] border-t border-[#eae4d5]">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about protein scaling, added sugars, or ingredient definitions..."
              className="w-full bg-white border border-[#ded5c2] rounded-xl pl-4 pr-12 py-3 text-xs sm:text-sm text-[#171d18] placeholder-[#8b9a8f] focus:outline-none focus:ring-2 focus:ring-[#24593b] focus:border-[#24593b] shadow-health transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 top-2 p-2 bg-[#183c27] text-white rounded-lg hover:bg-[#122b1c] disabled:opacity-40 transition-colors shadow-xs"
              aria-label="Send message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
