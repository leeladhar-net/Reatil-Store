'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  RefreshCw, 
  Footprints,
  Cpu,
  User,
  Sparkles,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AskQuestion() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I am your AI Retail Assistant. I have analyzed Neeman's latest 75-day sales, store ranks, and stock registers. Ask me anything about stock movement, replenishment needs, underperforming locations, or top categories!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sampleQuestions = [
    "Which store needs restocking most urgently?",
    "What is our best-selling product category by revenue?",
    "Identify dead stock items that we should mark down.",
    "Summarize the performance differences between flagship and outlet stores."
  ];

  // Auto scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userText = textToSend;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userText }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer from AI Core');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: "Sorry, I ran into an error connecting to the Gemini LLM endpoint. Please verify that your GEMINI_API_KEY environment variable is valid and has not expired." 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Hello! I am your AI Retail Assistant. I have analyzed Neeman's latest 75-day sales, store ranks, and stock registers. Ask me anything about stock movement, replenishment needs, underperforming locations, or top categories!"
      }
    ]);
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-zinc-950">
      {/* Header Panel */}
      <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-zinc-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-950/40">
            <MessageSquare size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-normal">Ask-a-Question Box</h1>
            <p className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
              <Cpu size={12} className="text-indigo-400" />
              <span>Interactive Gemini Retail Advisor</span>
            </p>
          </div>
        </div>
        <button
          onClick={handleClearChat}
          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 text-[11px] font-semibold transition-colors flex items-center gap-1.5"
        >
          Clear Chat
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scrollbar-thin">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-4 items-start ${isUser ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`p-2.5 rounded-xl shrink-0 border ${
                  isUser 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}>
                  {isUser ? <User size={16} /> : <Sparkles size={16} />}
                </div>

                {/* Bubble content */}
                <div className={`p-4 rounded-2xl max-w-[85%] border shadow-sm leading-relaxed text-xs font-medium ${
                  isUser
                    ? 'bg-indigo-600/10 text-zinc-100 border-indigo-950/40 rounded-tr-none'
                    : 'bg-zinc-900/40 text-zinc-300 border-zinc-850/80 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            );
          })}

          {/* Loader bubble */}
          {loading && (
            <div className="flex gap-4 items-start">
              <div className="p-2.5 rounded-xl bg-zinc-900 text-indigo-400 border border-zinc-800 shrink-0">
                <Sparkles size={16} className="animate-spin" />
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/40 text-zinc-500 border border-zinc-850/80 rounded-tl-none flex items-center gap-2 text-xs font-semibold">
                <RefreshCw size={14} className="animate-spin text-indigo-500" />
                <span>Running database queries &amp; drafting response...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input panel & suggestions (Shrink-0 to keep at bottom) */}
      <div className="p-6 border-t border-zinc-900 bg-zinc-950/80 shrink-0">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Quick Suggestions (rendered when no user chats are active for clean screen) */}
          {messages.length === 1 && !loading && (
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Suggested Questions</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="p-3 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-850/60 hover:border-zinc-800 rounded-xl text-left text-zinc-400 hover:text-white transition-all text-[11px] font-medium flex items-center justify-between group"
                  >
                    <span>{q}</span>
                    <ArrowRight size={12} className="text-zinc-650 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-indigo-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex gap-3 items-center"
          >
            <input
              type="text"
              placeholder="Ask a question about sales metrics, low stock items, or store performance..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-800 px-4 py-3 rounded-2xl text-zinc-200 text-xs placeholder-zinc-500 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-colors disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
