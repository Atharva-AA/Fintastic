import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { sendChatMessage } from '../services/chatService';

type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  loading?: boolean;
}

type ChatResponseType =
  | 'chat'
  | 'confirmation_required'
  | 'auto_executed'
  | 'executed'
  | 'cancelled'
  | string;

interface ChatApiResponse {
  message: string;
  type?: ChatResponseType;
}

const createChatMessage = (
  role: MessageRole,
  content: string
): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  role,
  content,
  timestamp: new Date().toISOString(),
  loading: false,
});

export default function AI() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createChatMessage('assistant', "Hi, I'm your financial agent 🧠"),
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingText, setThinkingText] = useState('AI is thinking...');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const thinkingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Quick suggestion chips
  const suggestions = [
    'How am I doing this month?',
    'Am I overspending?',
    'When can I reach my goals?',
    'How can I save more?',
    'What should I do this week?',
  ];

  // System intelligence data
  const coachInsights = [
    { label: 'Income stability', value: 'Medium', color: 'bg-pastel-orange' },
    {
      label: 'Spending risk',
      value: 'Slightly high',
      color: 'bg-pastel-orange',
    },
    { label: 'Goal health', value: 'On track', color: 'bg-pastel-green' },
    {
      label: 'Suggested focus',
      value: 'Emergency Fund',
      color: 'bg-pastel-blue',
    },
  ];

  const appendMessage = (role: MessageRole, content: string) => {
    setMessages((prev) => [...prev, createChatMessage(role, content)]);
  };

  const clearThinkingTimers = () => {
    thinkingTimers.current.forEach((timer) => clearTimeout(timer));
    thinkingTimers.current = [];
  };

  const scheduleThinkingUpdates = () => {
    clearThinkingTimers();
    setThinkingText('Understanding your message...');
    thinkingTimers.current.push(
      setTimeout(() => setThinkingText('Analyzing your finances...'), 800)
    );
    thinkingTimers.current.push(
      setTimeout(
        () => setThinkingText('Searching memory & behavior patterns...'),
        2000
      )
    );
    thinkingTimers.current.push(
      setTimeout(
        () => setThinkingText('Preparing intelligent response...'),
        3500
      )
    );
  };

  const stopThinking = () => {
    clearThinkingTimers();
    setIsThinking(false);
    setThinkingText('');
  };

  const typeEffect = (text: string) => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    setMessages((prev) => [
      ...prev,
      { ...createChatMessage('assistant', ''), loading: true },
    ]);

    let i = 0;
    typingIntervalRef.current = setInterval(() => {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (
          lastIndex >= 0 &&
          updated[lastIndex].role === 'assistant' &&
          updated[lastIndex].loading
        ) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: text.slice(0, i),
          };
        }
        return updated;
      });

      i += 1;
      if (i > text.length) {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
        }
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          if (lastIndex >= 0) {
            updated[lastIndex] = {
              ...updated[lastIndex],
              content: text,
              loading: false,
            };
          }
          return updated;
        });
      }
    }, 15);
  };

  useEffect(() => {
    return () => {
      clearThinkingTimers();
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return;

    const isDecision = trimmed === 'CONFIRM' || trimmed === 'CANCEL';

    appendMessage('user', trimmed);
    setInputValue('');
    setIsSending(true);
    setIsThinking(true);
    scheduleThinkingUpdates();
    if (isDecision) {
      setRequiresConfirmation(false);
    }

    try {
      // Note: Authentication is handled via HTTP-only cookies automatically
      // The API instance (withCredentials: true) sends cookies with each request
      const response: ChatApiResponse = await sendChatMessage(trimmed);
      stopThinking();
      if (response?.message) {
        typeEffect(response.message);
      } else {
        appendMessage(
          'assistant',
          'I could not generate a response. Please try again.'
        );
      }
      setRequiresConfirmation(response?.type === 'confirmation_required');
    } catch (error: any) {
      stopThinking();
      setRequiresConfirmation(false);

      // Handle 401 (unauthorized) - the interceptor will redirect, but show message first
      if (error?.response?.status === 401) {
        appendMessage(
          'assistant',
          'Please sign in again to continue chatting.'
        );
        // The 401 interceptor in base.js will redirect to login page
      } else {
        // Other errors (network, server, etc.)
        appendMessage(
          'assistant',
          '⚠️ AI is overloaded. Try again in a moment.'
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() || isSending) return;
    sendMessage(inputValue);
  };

  const handleDecision = (decision: 'CONFIRM' | 'CANCEL') => {
    if (isSending) return;
    sendMessage(decision);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-pastel-beige">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-semibold text-text mb-2">
              Fintastic Coach
            </h1>
            <p className="text-sm text-text/50 mb-1">
              Your personal money mentor
            </p>
            <p className="text-xs text-text/40">
              Ask anything about your money, goals, spending, or future plans.
            </p>
            <p className="text-xs text-text/50 mt-1">
              My answers are based on your latest financial report 📊
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chat Area */}
            <div className="lg:col-span-2 space-y-4">
              {/* Chat Window */}
              <div className="bg-white/80 rounded-3xl shadow-soft border border-pastel-tan/20 flex flex-col h-[600px]">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 1 ? (
                    // Empty State
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center max-w-md">
                        <div className="w-16 h-16 rounded-full bg-pastel-green/20 flex items-center justify-center mx-auto mb-4">
                          <svg
                            className="w-8 h-8 text-text/60"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                            />
                          </svg>
                        </div>
                        <p className="text-base text-text mb-2">
                          Hi, I'm Fintastic. I've studied your financial
                          pattern.
                        </p>
                        <p className="text-sm text-text/60">
                          Ask me anything — big or small.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.role === 'user'
                              ? 'justify-end'
                              : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] ${
                              message.role === 'user'
                                ? 'bg-pastel-green/30 rounded-2xl rounded-tr-sm'
                                : 'bg-pastel-beige/80 rounded-2xl rounded-tl-sm'
                            } p-4 border border-pastel-tan/20`}
                          >
                            <p className="text-sm text-text whitespace-pre-line">
                              {message.content}
                              {message.loading && (
                                <span className="animate-pulse">▍</span>
                              )}
                            </p>
                            <p className="text-xs text-text/40 mt-2">
                              {new Date(message.timestamp).toLocaleTimeString(
                                [],
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}

                  {isThinking && (
                    <div className="ai-thinking flex items-center gap-2 text-text/70">
                      <span className="dot"></span>
                      <span className="dot"></span>
                      <span className="dot"></span>
                      <p className="text-sm">{thinkingText}</p>
                    </div>
                  )}
                </div>

                {/* Quick Suggestions */}
                {messages.length === 1 && (
                  <div className="px-6 pb-4 border-t border-pastel-tan/20">
                    <p className="text-xs text-text/50 mb-3 mt-4">
                      Quick suggestions:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-3 py-2 text-xs rounded-xl bg-pastel-beige border border-pastel-tan/30 text-text hover:bg-pastel-orange/20 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirmation Prompt */}
                {requiresConfirmation && (
                  <div className="px-6 py-4 border-t border-dashed border-pastel-tan/40 bg-pastel-beige/40">
                    <p className="text-sm text-text/70 mb-3">
                      Fintastic needs your confirmation to proceed with the
                      suggested action.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDecision('CONFIRM')}
                        disabled={isSending}
                        className="flex-1 px-4 py-3 rounded-xl bg-pastel-green/40 text-text font-semibold border border-pastel-green/50 hover:bg-pastel-green/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleDecision('CANCEL')}
                        disabled={isSending}
                        className="flex-1 px-4 py-3 rounded-xl bg-pastel-orange/30 text-text font-semibold border border-pastel-orange/40 hover:bg-pastel-orange/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Input Bar */}
                <div className="p-4 border-t border-pastel-tan/20">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask Fintastic something…"
                      className="flex-1 px-4 py-3 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isSending}
                      className="px-4 py-3 rounded-xl bg-pastel-green/40 hover:bg-pastel-green/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-text"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Coach Thinking Panel (Desktop Only) */}
            <div className="hidden lg:block space-y-4">
              <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
                <h2 className="text-lg font-semibold text-text mb-4">
                  What Fintastic sees
                </h2>
                <div className="space-y-3">
                  {coachInsights.map((insight, index) => (
                    <div
                      key={index}
                      className="bg-pastel-beige/50 rounded-2xl p-4 border border-pastel-tan/20"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-text/50">{insight.label}</p>
                        <span
                          className={`w-2 h-2 rounded-full ${insight.color}`}
                        ></span>
                      </div>
                      <p className="text-sm font-medium text-text">
                        {insight.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Context */}
              <div className="bg-pastel-blue/10 rounded-2xl p-4 border border-pastel-tan/20">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-text/60 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="text-xs text-text/50 mb-1">
                      Real-time analysis
                    </p>
                    <p className="text-xs text-text/70">
                      Fintastic is analyzing your latest transactions and
                      patterns to give you the most accurate guidance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .ai-thinking {
          font-size: 14px;
          opacity: 0.7;
          padding: 10px 0;
        }
        .dot {
          animation: blink 1.4s infinite both;
          height: 6px;
          width: 6px;
          margin: 3px;
          background-color: #1f2933;
          border-radius: 50%;
          display: inline-block;
        }
        @keyframes blink {
          0% { opacity: .2; }
          20% { opacity: 1; }
          100% { opacity: .2; }
        }
      `}</style>
    </Layout>
  );
}
