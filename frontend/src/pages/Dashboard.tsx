import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getDashboardData } from '../services/dashboardService';
import { sendChatMessage } from '../services/chatService';

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    logAvailableVoices?: () => SpeechSynthesisVoice[];
  }
}

/**
 * Dashboard Page - Money Story
 * Premium financial overview with sidebar navigation and comprehensive insights
 */
export default function Dashboard() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [dashboard, setDashboard] = useState<null | any>(null);
  const [error, setError] = useState<string | null>(null);
  const [animateBars, setAnimateBars] = useState(false);
  
  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [voiceResponse, setVoiceResponse] = useState<string | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Track if voices are loaded for speech synthesis
  const voicesLoadedRef = useRef(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Cookie-based auth - cookies are sent automatically by axios
        const data = await getDashboardData();
        console.log('📊 Dashboard data:', data);
        setDashboard(data);
      } catch (err) {
        console.error('Dashboard fetch failed', err);
        setError('Unable to load dashboard right now.');
      }
    };
    fetchDashboard();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimateBars(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Track when voices are loaded for speech synthesis
  useEffect(() => {
    const onVoicesChanged = () => {
      voicesLoadedRef.current = true;
    };

    // Set up voiceschanged handler
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = onVoicesChanged;
      
      // Check if voices are already loaded
      if (window.speechSynthesis.getVoices().length > 0) {
        voicesLoadedRef.current = true;
      }
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recognition if active
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      // Stop speech synthesis if active
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechSynthesisRef.current = null;
    };
  }, []);

  /**
   * Check if voice recognition is supported in the browser
   */
  const isVoiceSupported = () => {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  };

  /**
   * Start listening to user's voice input
   * Uses Web Speech API to convert speech to text
   */
  const startListening = () => {
    // Check if voice is supported
    if (!isVoiceSupported()) {
      setVoiceMessage('Voice is not supported on this browser. Please use Chrome or Edge.');
      setTimeout(() => setVoiceMessage(null), 5000);
      return;
    }

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Store reference for cleanup
    recognitionRef.current = recognition;

    // Handle recognition start
    recognition.onstart = () => {
      setIsListening(true);
      setVoiceMessage(null);
      setVoiceResponse(null);
    };

    // Handle recognition result
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setVoiceMessage(transcript);
      setIsProcessingVoice(true);

      try {
        // Send recognized text to AI chat endpoint
        const response = await sendChatMessage(transcript);
        if (response?.message) {
          setVoiceResponse(response.message);
          // Speak the response out loud
          speak(response.message);
        } else {
          setVoiceResponse('I could not generate a response. Please try again.');
          speak('I could not generate a response. Please try again.');
        }
      } catch (error: any) {
        console.error('Voice chat error:', error);
        const errorMsg = error?.response?.status === 401
          ? 'Please sign in again to continue.'
          : '⚠️ AI is overloaded. Try again in a moment.';
        setVoiceResponse(errorMsg);
        speak(errorMsg);
      } finally {
        setIsProcessingVoice(false);
      }
    };

    // Handle recognition errors
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsProcessingVoice(false);
      
      let errorMsg = 'Could not understand. Please try again.';
      if (event.error === 'no-speech') {
        errorMsg = 'No speech detected. Please try again.';
      } else if (event.error === 'not-allowed') {
        errorMsg = 'Microphone permission denied. Please allow microphone access.';
      }
      
      setVoiceMessage(errorMsg);
      setTimeout(() => setVoiceMessage(null), 5000);
    };

    // Handle recognition end
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    // Start recognition
    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start recognition:', error);
      setIsListening(false);
      setVoiceMessage('Failed to start voice recognition. Please try again.');
      setTimeout(() => setVoiceMessage(null), 5000);
    }
  };

  /**
   * Stop listening to voice input
   */
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  /**
   * Helper function to log all available voices for debugging
   * Call this in console: window.logAvailableVoices()
   */
  useEffect(() => {
    // Make function available globally for debugging
    (window as any).logAvailableVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('=== Available Voices ===');
      voices.forEach((v) => console.log(`Name: ${v.name}, Lang: ${v.lang}, Default: ${v.default}`));
      console.log(`Total voices: ${voices.length}`);
      return voices;
    };

    // Log voices when they become available (may require voiceschanged event)
    const logVoicesOnce = () => {
      if (window.speechSynthesis.getVoices().length > 0) {
        console.log('Voices loaded. Use window.logAvailableVoices() to see all voices.');
      }
    };

    // Try to log voices immediately
    logVoicesOnce();

    // Also listen for voiceschanged event (voices load asynchronously)
    window.speechSynthesis.addEventListener('voiceschanged', logVoicesOnce);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', logVoicesOnce);
    };
  }, []);

  /**
   * Find the best available Indian English voice
   * Prefers voices with lang === "en-IN" or names containing "India", "Ravi", "Heera", or "Hindi"
   * Falls back to best available English voice if no Indian voice found
   * @returns SpeechSynthesisVoice | null
   */
  const findBestIndianVoice = (): SpeechSynthesisVoice | null => {
    if (!('speechSynthesis' in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      console.warn('No voices available yet. Voices may load asynchronously.');
      return null;
    }

    // Priority 1: Indian English voices (lang === "en-IN")
    const indianLangVoices = voices.filter(
      (v) => v.lang.toLowerCase() === 'en-in'
    );
    if (indianLangVoices.length > 0) {
      // Prefer default voice if available
      const defaultVoice = indianLangVoices.find((v) => v.default);
      if (defaultVoice) {
        console.log('Selected Indian voice (en-IN default):', defaultVoice.name);
        return defaultVoice;
      }
      console.log('Selected Indian voice (en-IN):', indianLangVoices[0].name);
      return indianLangVoices[0];
    }

    // Priority 2: Voices with Indian-sounding names
    const indianNameKeywords = ['india', 'ravi', 'heera', 'hindi'];
    const indianNamedVoices = voices.filter((v) =>
      indianNameKeywords.some((keyword) =>
        v.name.toLowerCase().includes(keyword)
      )
    );
    if (indianNamedVoices.length > 0) {
      const defaultVoice = indianNamedVoices.find((v) => v.default);
      if (defaultVoice) {
        console.log('Selected Indian-named voice (default):', defaultVoice.name);
        return defaultVoice;
      }
      console.log(
        'Selected Indian-named voice:',
        indianNamedVoices[0].name
      );
      return indianNamedVoices[0];
    }

    // Fallback: Best available English voice
    const englishVoices = voices.filter((v) =>
      v.lang.toLowerCase().startsWith('en')
    );
    if (englishVoices.length > 0) {
      const defaultVoice = englishVoices.find((v) => v.default);
      if (defaultVoice) {
        console.log('Selected fallback English voice (default):', defaultVoice.name);
        return defaultVoice;
      }
      console.log('Selected fallback English voice:', englishVoices[0].name);
      return englishVoices[0];
    }

    // Last resort: Use default system voice
    const defaultVoice = voices.find((v) => v.default);
    if (defaultVoice) {
      console.log('Selected system default voice:', defaultVoice.name);
      return defaultVoice;
    }

    console.warn('No suitable voice found, using first available voice');
    return voices[0] || null;
  };

  /**
   * Speak text out loud using Web Speech Synthesis API
   * Forces Rishi (Enhanced) voice and prevents ghost/dragged/echo voice issues
   * Cleans text (₹ -> rupees, newlines, etc.) for better speech quality
   * @param text - The text to speak
   */
  const speak = (text: string) => {
    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported');
      return;
    }

    const synth = window.speechSynthesis;

    // ✅ Cancel any previous speech (prevents echo / ghost sound)
    synth.cancel();

    // Get available voices
    const voices = synth.getVoices();

    // Wait for voices if needed (recursive retry)
    if (!voices.length) {
      setTimeout(() => speak(text), 300);
      return;
    }

    // ✅ Force Rishi (Enhanced) only
    const selected =
      voices.find(
        (v) =>
          v.name.toLowerCase().includes('rishi') &&
          v.voiceURI.toLowerCase().includes('enhanced')
      ) ||
      voices.find((v) => v.name.toLowerCase().includes('rishi')) ||
      voices.find((v) => v.lang === 'en-IN') ||
      voices[0];

    if (!selected) {
      console.error('No suitable voice found');
      return;
    }

    // Console log to confirm which voice is being used
    console.log('Using voice:', selected.name, selected.voiceURI);

    // Clean text for better speech quality
    // Replace ₹ with "rupees", clean newlines, normalize whitespace
    const cleanedText = text
      .replace(/₹/g, 'rupees')
      .replace(/\n/g, '. ')
      .replace(/\s+/g, ' ')
      .trim();

    // Create utterance
    const msg = new SpeechSynthesisUtterance(cleanedText);

    // Set voice and language
    msg.voice = selected;
    msg.lang = 'en-IN';

    // ✅ FIXED HUMAN SETTINGS (NO GHOST EFFECT)
    msg.rate = 1; // Normal speed
    msg.pitch = 1; // Normal pitch
    msg.volume = 1; // Full volume

    // Store reference for cleanup
    speechSynthesisRef.current = msg;

    // Handle speech end
    msg.onend = () => {
      speechSynthesisRef.current = null;
    };

    // Handle speech errors
    msg.onerror = (event: any) => {
      console.error('Speech synthesis error:', event);
      speechSynthesisRef.current = null;
    };

    // Speak (only called once per response)
    synth.speak(msg);
  };

  const formatCurrency = (value: number | undefined | null) => {
    if (value === null || value === undefined) return '₹0';
    return `₹${Math.round(value).toLocaleString('en-IN')}`;
  };

  const summary = dashboard?.summary;
  const report = dashboard?.report;

  const lastIncomeLabel = () => {
    if (!summary?.lastIncomeDate) return 'No income yet';
    const lastDate = new Date(summary.lastIncomeDate);
    const diffDays = Math.max(
      0,
      Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    if (diffDays === 0) return 'Last payout: today';
    if (diffDays === 1) return 'Last payout: 1 day ago';
    return `Last payout: ${diffDays} days ago`;
  };

  const chartData = useMemo(() => {
    if (!dashboard?.weeklySpendingGraph?.length) {
      return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
        day,
        value: 0,
      }));
    }
    return dashboard.weeklySpendingGraph.map((point: any) => ({
      day: point.day,
      value: point.amount,
    }));
  }, [dashboard]);

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
    []
  );

  const categoryIcons: Record<string, JSX.Element> = {
    'Food & Dining': (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    Shopping: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    ),
    Transport: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
    'Rent & Utilities': (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  };

  const colorPalette = [
    'bg-pastel-orange',
    'bg-pastel-blue',
    'bg-pastel-green',
    'bg-pastel-tan',
  ];

  const spendingCategories = (dashboard?.topCategories || []).map(
    (cat: any, index: number) => {
      const icon = categoryIcons[cat.category] || (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      );

      const trendIcon =
        cat.trend === 'up' ? '▲' : cat.trend === 'down' ? '▼' : '▬';

      return {
        icon,
        label: cat.category,
        change: formatCurrency(cat.amount),
        changePercent: `${cat.changePercent}% ${trendIcon}`,
        color: colorPalette[index % colorPalette.length],
      };
    }
  );

  const goals = dashboard?.goals || [];

  const reportUpdatedLabel = () => {
    if (!report?.lastUpdated) return null;
    const updated = new Date(report.lastUpdated);
    const diffMinutes = Math.floor(
      (Date.now() - updated.getTime()) / (1000 * 60)
    );
    if (diffMinutes < 1) return 'Updated just now';
    if (diffMinutes < 60) return `Updated ${diffMinutes} min ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Updated ${diffHours} hr ago`;
    return updated.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (error) {
    return (
      <Layout>
        <p className="p-6 text-center text-text/70">{error}</p>
      </Layout>
    );
  }

  if (!dashboard) {
    return (
      <Layout>
        <p className="p-6 text-center text-text/70">Loading dashboard...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top Bar */}
        <header className="bg-white/60 backdrop-blur-sm border-b border-pastel-tan/30 sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-semibold text-text">Dashboard</h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-xl hover:bg-pastel-orange/20 transition-colors"
                  title="Toggle theme"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={
                        isDarkMode
                          ? 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
                          : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'
                      }
                    />
                  </svg>
                </button>
                <button className="p-2 rounded-xl hover:bg-pastel-orange/20 transition-colors relative">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-pastel-orange rounded-full"></span>
                </button>
                <button className="p-2 rounded-xl hover:bg-pastel-orange/20 transition-colors">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pastel-green animate-pulse"></span>
              <span className="text-xs text-text/50">Synced and Analyzing</span>
            </div>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
          {/* 1. Financial Overview Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Total Spent (Month)</p>
              <p className="text-3xl font-semibold text-text mb-1">
                {formatCurrency(summary?.totalSpentThisMonth)}
              </p>
              <p className="text-xs text-text/40">
                Across {summary?.transactionCount || 0} transactions
              </p>
            </div>
            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Income Received</p>
              <p className="text-3xl font-semibold text-text mb-1">
                {formatCurrency(summary?.totalIncomeThisMonth)}
              </p>
              <p className="text-xs text-text/40">{lastIncomeLabel()}</p>
            </div>
            <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
              <p className="text-sm text-text/50 mb-2">Remaining Budget</p>
              <p className="text-3xl font-semibold text-text mb-1">
                {formatCurrency(summary?.remainingBudget)}
              </p>
              <p className="text-xs text-text/40">Based on spending pace</p>
            </div>
          </div>

          {/* 2. Activity Graph */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-text">
                Spending Activity
              </h2>
              <select className="px-4 py-2 rounded-xl border border-pastel-tan/30 bg-white text-sm text-text focus:outline-none focus:ring-2 focus:ring-pastel-green/30">
                <option>Week</option>
                <option>Month</option>
                <option>Custom</option>
              </select>
            </div>
            <div className="relative h-48 flex items-end justify-between gap-2 sm:gap-4">
              {[0.25, 0.5, 0.75, 1].map((tick) => (
                <div
                  key={tick}
                  className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-text/10"
                  style={{ bottom: `${tick * 100}%` }}
                ></div>
              ))}
              {chartData.map((point, index) => {
                const normalized = point.value / maxValue;
                const heightPercent = Math.max(
                  normalized * 100,
                  point.value === 0 ? 4 : 14
                );
                const isToday =
                  point.day.toLowerCase() === todayLabel.toLowerCase();
                const baseColor = 'rgba(248, 176, 120, 1)';
                const mutedColor = 'rgba(248, 176, 120, 0.35)';
                const activeColor = 'rgba(233, 150, 100, 1)';
                const barColor =
                  point.value === 0
                    ? mutedColor
                    : isToday
                      ? activeColor
                      : baseColor;

                return (
                  <div
                    key={index}
                    className="group flex-1 flex flex-col items-center gap-2 min-w-[28px] h-full"
                  >
                    <div className="relative w-full h-full flex flex-col justify-end items-center">
                      <div
                        className="w-full rounded-t-[10px] transition-all duration-300 ease-out origin-bottom"
                        style={{
                          height: `${heightPercent}%`,
                          backgroundColor: barColor,
                          opacity: point.value === 0 ? 0.4 : 1,
                          transform: animateBars ? 'scaleY(1)' : 'scaleY(0)',
                          borderRadius: '10px 10px 0 0',
                        }}
                      >
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-text text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
                          ₹{point.value.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-text/80 whitespace-nowrap">
                      {point.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Financial Report */}
          {report && (
            <div className="bg-white/85 rounded-3xl p-6 shadow-soft border border-pastel-tan/30">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-text/40 mb-1">
                    AI FINANCIAL REPORT
                  </p>
                  <h2 className="text-2xl font-semibold text-text">
                    {report.summary || 'AI is preparing your financial story'}
                  </h2>
                </div>
                <div className="flex flex-col items-end text-right shrink-0">
                  {report.source && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pastel-blue/20 text-text/70">
                      {report.source === 'onboarding'
                        ? 'Onboarding Snapshot'
                        : `${report.source} update`}
                    </span>
                  )}
                  <span className="text-xs text-text/50 mt-2">
                    {reportUpdatedLabel()}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-2xl border border-pastel-tan/30 bg-white/70">
                  <p className="text-sm font-semibold text-text/70 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-pastel-blue/20 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-pastel-blue"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </span>
                    Key Points
                  </p>
                  <ul className="space-y-2 text-sm text-text/80">
                    {(report.keyPoints?.length
                      ? report.keyPoints
                      : ['AI is still analyzing your activity.']
                    ).map((point: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-pastel-orange font-semibold mt-0.5">
                          •
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl border border-pastel-tan/30 bg-white/70">
                  <p className="text-sm font-semibold text-text/70 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-pastel-green/20 flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-pastel-green"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    Recommendations
                  </p>
                  <ul className="space-y-2 text-sm text-text/80">
                    {(report.recommendations?.length
                      ? report.recommendations
                      : [
                          'Complete onboarding steps and add your first transaction to unlock guidance.',
                        ]
                    ).map((rec: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-pastel-green font-semibold mt-0.5">
                          {idx + 1}.
                        </span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 4. Top Spending Categories */}
          <div>
            <h2 className="text-lg md:text-xl font-semibold text-text mb-4">
              Top Spending Categories
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {spendingCategories.length === 0 && (
                <p className="text-sm text-text/60 col-span-2 md:col-span-4">
                  No expenses recorded yet this month.
                </p>
              )}
              {spendingCategories.map((category, index) => (
                <div
                  key={index}
                  className={`${category.color} rounded-2xl p-4 shadow-soft border border-pastel-tan/20 hover:shadow-soft-lg transition-all duration-300`}
                >
                  <div className="text-text/70 mb-3">{category.icon}</div>
                  <p className="text-sm font-medium text-text mb-1">
                    {category.label}
                  </p>
                  <p className="text-lg font-semibold text-text mb-1">
                    {category.change}
                  </p>
                  <p className="text-xs text-text/50">
                    {category.changePercent}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Goals Progress */}
          <div>
            <h2 className="text-xl font-semibold text-text mb-4">
              Your Goals at a Glance
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.length === 0 && (
                <p className="text-sm text-text/60 col-span-2">
                  Add a goal to see your progress here.
                </p>
              )}
              {goals.map((goal: any, index: number) => (
                <div
                  key={`${goal.name}-${index}`}
                  className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-text">
                      {goal.name}
                    </h3>
                    <span className="text-sm font-medium text-text/60">
                      {goal.percentComplete}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-pastel-tan/30 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-pastel-green to-pastel-green/80 transition-all duration-700"
                      style={{ width: `${goal.percentComplete}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-text/50">
                    {formatCurrency(goal.currentAmount)} of{' '}
                    {formatCurrency(goal.targetAmount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Floating Action Buttons - AI and Voice */}
      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 flex flex-col items-end gap-3 z-50">
        {/* Buttons Row - Side by Side */}
        <div className="flex items-center gap-3">
          {/* Voice (Microphone) Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isListening) {
                stopListening();
              } else {
                startListening();
              }
            }}
            type="button"
            className={`w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary via-primary to-pastel-blue text-white shadow-soft-lg hover:shadow-soft-lg hover:scale-110 transition-all duration-300 flex items-center justify-center group overflow-hidden relative ${
              isListening ? 'animate-pulse' : ''
            }`}
            title={isListening ? 'Stop listening' : 'Voice command'}
          >
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-pastel-blue/50 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-pastel-blue rounded-full"></div>

            {/* Microphone Icon */}
            <svg
              className="w-6 h-6 md:w-7 md:h-7 relative z-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>

            {/* Tooltip */}
            <span className="hidden md:block absolute right-full mr-4 px-4 py-2 bg-text/95 backdrop-blur-sm text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-soft-lg pointer-events-none">
              {isListening ? 'Stop listening' : 'Voice command'}
              <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-text/95 rotate-45"></span>
            </span>
          </button>

          {/* AI Button */}
          <Link
            to="/ai"
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-primary via-primary to-pastel-blue text-white shadow-soft-lg hover:shadow-soft-lg hover:scale-110 transition-all duration-300 flex items-center justify-center group overflow-hidden relative"
            title="Talk to your finance coach"
            onClick={(e) => {
              // Prevent event bubbling from voice button
              e.stopPropagation();
            }}
          >
          {/* Animated background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-pastel-blue/50 rounded-full animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-pastel-blue rounded-full"></div>

          {/* Icon */}
          <svg
            className="w-6 h-6 md:w-7 md:h-7 relative z-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>

          {/* Tooltip */}
          <span className="hidden md:block absolute right-full mr-4 px-4 py-2 bg-text/95 backdrop-blur-sm text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-soft-lg pointer-events-none">
            Talk to your finance coach
            <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-text/95 rotate-45"></span>
          </span>
        </Link>
        </div>

        {/* Listening Indicator - Always visible below buttons when listening */}
        {isListening && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-soft-lg border border-pastel-tan/30 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-pastel-orange animate-pulse"></div>
            <p className="text-sm font-medium text-text whitespace-nowrap">Listening...</p>
          </div>
        )}
      </div>

      {/* Voice Messages Overlay - Shows user input and AI response */}
      {(voiceMessage || voiceResponse || isProcessingVoice) && (
        <div className="fixed bottom-32 right-6 md:bottom-36 md:right-8 max-w-md w-full sm:w-auto z-40">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-soft-lg border border-pastel-tan/30">
            {/* Processing Indicator */}
            {isProcessingVoice && !isListening && (
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 rounded-full bg-pastel-blue animate-pulse"></div>
                <p className="text-sm font-medium text-text">Processing...</p>
              </div>
            )}

            {/* User Voice Message */}
            {voiceMessage && !isListening && (
              <div className="mb-3 p-3 rounded-xl bg-pastel-green/20 border border-pastel-green/30">
                <p className="text-xs text-text/50 mb-1">You said:</p>
                <p className="text-sm text-text font-medium">{voiceMessage}</p>
              </div>
            )}

            {/* AI Voice Response */}
            {voiceResponse && (
              <div className="p-3 rounded-xl bg-pastel-blue/20 border border-pastel-blue/30">
                <p className="text-xs text-text/50 mb-1">AI Response:</p>
                <p className="text-sm text-text whitespace-pre-line">{voiceResponse}</p>
              </div>
            )}

            {/* Clear Button */}
            {(voiceMessage || voiceResponse) && !isListening && !isProcessingVoice && (
              <button
                onClick={() => {
                  setVoiceMessage(null);
                  setVoiceResponse(null);
                  window.speechSynthesis.cancel();
                }}
                className="mt-3 w-full px-3 py-2 text-xs rounded-xl bg-pastel-tan/30 text-text hover:bg-pastel-tan/40 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
