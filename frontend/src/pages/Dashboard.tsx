import { useEffect, useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getDashboardData } from '../services/dashboardService';
import { sendChatMessage } from '../services/chatService';
import {
  connectGmail,
  getPendingGmailTransactions,
  approvePendingTransaction,
  rejectPendingTransaction,
} from '../services/gmailService';
import { getAllInsights } from '../services/aiInsightsService';
import FinancialReportCard from '../components/FinancialReportCard';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api/base';
import axios from 'axios';

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
  const [dashboard, setDashboard] = useState<null | any>(null);
  const [error, setError] = useState<string | null>(null);
  const [animateBars, setAnimateBars] = useState(false);

  // Gmail integration state
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [isGmailConnecting, setIsGmailConnecting] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isUploadingBank, setIsUploadingBank] = useState(false);

  // Description modal state
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<any>(null);
  const [descriptionText, setDescriptionText] = useState('');

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);
  const [voiceResponse, setVoiceResponse] = useState<string | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Track if voices are loaded for speech synthesis
  const voicesLoadedRef = useRef(false);

  // AI Insights state
  const [allInsights, setAllInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Cookie-based auth - cookies are sent automatically by axios
        const data = await getDashboardData();
        console.log('📊 Dashboard data:', data);
        setDashboard(data);

        // Set Gmail connection status from dashboard response
        if (data?.isGmailConnected !== undefined) {
          setIsGmailConnected(data.isGmailConnected);
        }

        // Always fetch pending Gmail transactions when dashboard loads
        const userId =
          data?.userId ||
          (typeof window !== 'undefined' ? document.body.dataset.userId : null);
        if (userId) {
          console.log(
            '📬 Fetching pending Gmail transactions for user:',
            userId
          );
          fetchPendingTransactions(userId);
        } else {
          console.warn(
            '⚠️ No userId available to fetch pending Gmail transactions'
          );
        }
      } catch (err) {
        console.error('Dashboard fetch failed', err);
        setError('Unable to load dashboard right now.');
      }
    };
    fetchDashboard();
  }, []);

  // Fetch pending Gmail transactions
  const fetchPendingTransactions = async (userId: string) => {
    if (!userId) {
      console.warn('⚠️ Cannot fetch pending transactions: no userId');
      return;
    }

    setIsLoadingPending(true);
    try {
      console.log('📬 Fetching pending Gmail transactions for userId:', userId);
      const response = await getPendingGmailTransactions(userId);
      console.log('📬 Full response:', JSON.stringify(response, null, 2));
      
      if (response && response.success && response.transactions) {
        console.log(
          `✅ Found ${response.transactions.length} pending Gmail transactions`
        );
        console.log('📬 Transactions:', response.transactions);
        setPendingTransactions(response.transactions);
        // If there are pending transactions, assume Gmail is connected
        if (response.transactions.length > 0) {
          setIsGmailConnected(true);
        }
      } else if (response && response.transactions && Array.isArray(response.transactions)) {
        // Handle case where response has transactions but no success field
        console.log(
          `✅ Found ${response.transactions.length} pending Gmail transactions (no success field)`
        );
        setPendingTransactions(response.transactions);
        if (response.transactions.length > 0) {
          setIsGmailConnected(true);
        }
      } else {
        console.log('ℹ️ No pending Gmail transactions found');
        console.log('📬 Response structure:', response);
        setPendingTransactions([]);
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch pending Gmail transactions:', err);
      console.error('❌ Error details:', err?.response?.data || err?.message);
      setPendingTransactions([]);
    } finally {
      setIsLoadingPending(false);
    }
  };

  // Handle Gmail connection
  const handleConnectGmail = async () => {
    // Try to get userId from dashboard data, or fallback to document.body.dataset
    const userId =
      dashboard?.userId ||
      (typeof window !== 'undefined' ? document.body.dataset.userId : null);

    if (!userId) {
      console.error('No userId available');
      alert('Unable to identify user. Please refresh the page and try again.');
      return;
    }

    setIsGmailConnecting(true);
    try {
      // Get OAuth URL from backend
      const response = await connectGmail(userId);

      if (response.success && response.authUrl) {
        // Open OAuth URL in popup window
        const popup = window.open(
          response.authUrl,
          'Gmail OAuth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          alert(
            'Popup blocked. Please allow popups for this site and try again.'
          );
          setIsGmailConnecting(false);
          return;
        }

        // Listen for OAuth completion via URL parameters
        const checkOAuthComplete = setInterval(() => {
          try {
            // Check if popup is closed
            if (popup.closed) {
              clearInterval(checkOAuthComplete);
              setIsGmailConnecting(false);

              // Check URL for success/error
              const urlParams = new URLSearchParams(window.location.search);
              const gmailSuccess = urlParams.get('gmail_success');
              const gmailError = urlParams.get('gmail_error');

              if (gmailSuccess === 'true') {
                setIsGmailConnected(true);
                alert(
                  'Gmail Connected Successfully — Auto-sync running every 10 minutes'
                );
                // Refresh pending transactions
                fetchPendingTransactions(userId);
                // Clean URL
                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname
                );
              } else if (gmailError) {
                alert(`Gmail connection failed: ${gmailError}`);
              } else {
                // User might have closed popup manually
                // Try to check connection status
                fetchPendingTransactions(userId);
              }
            }
          } catch (err) {
            console.error('Error checking OAuth status:', err);
          }
        }, 1000);
      } else {
        alert(response.message || 'Failed to get OAuth URL. Please try again.');
        setIsGmailConnecting(false);
      }
    } catch (err: any) {
      console.error('Gmail connection failed:', err);
      alert(
        err?.response?.data?.message ||
          'Failed to connect Gmail. Please check if the AI service is running on port 8001.'
      );
      setIsGmailConnecting(false);
    }
  };

  // Check OAuth result from URL parameters
  const checkOAuthResult = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gmailSuccess = urlParams.get('gmail_success');
    const gmailError = urlParams.get('gmail_error');

    if (gmailSuccess === 'true') {
      setIsGmailConnected(true);
      alert(
        'Gmail Connected Successfully — Auto-sync running every 10 minutes'
      );
      const userId =
        dashboard?.userId ||
        (typeof window !== 'undefined' ? document.body.dataset.userId : null);
      if (userId) {
        fetchPendingTransactions(userId);
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (gmailError) {
      alert(`Gmail connection failed: ${gmailError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  // Check OAuth result on component mount (in case of redirect)
  useEffect(() => {
    checkOAuthResult();
  }, []);

  // Handle approve transaction - show description modal first
  const handleApprove = (transaction: any) => {
    // Validate transaction has required fields
    if (!transaction.text || !transaction.amount) {
      alert('Transaction is missing required information (text or amount).');
      return;
    }

    setPendingApproval(transaction);
    setDescriptionText(''); // Start with empty description
    setShowDescriptionModal(true);
  };

  // Confirm approval with description
  const confirmApprove = async () => {
    // Validate required fields
    if (!pendingApproval) {
      alert('No transaction selected for approval.');
      return;
    }

    if (!pendingApproval.text || !pendingApproval.amount) {
      alert('Transaction is missing required information (text or amount).');
      return;
    }

    if (!descriptionText.trim()) {
      alert('Please enter a description for this transaction.');
      return;
    }

    setIsApproving(true);
    try {
      // Add transaction directly with description
      const userId =
        dashboard?.userId ||
        (typeof window !== 'undefined' ? document.body.dataset.userId : null);
      if (!userId) {
        alert('Unable to identify user. Please refresh the page.');
        setIsApproving(false);
        return;
      }

      const transactionData = {
        type: pendingApproval.type,
        amount: pendingApproval.amount,
        text: descriptionText.trim(), // Send as 'text' (required field)
        // Note: source will be set to 'manual' by default in backend
      };

      // Add transaction via API
      const addResponse = await api.post(
        '/api/transactions/add',
        transactionData
      );

      // Backend returns 201 status with message, not success field
      if (addResponse.status === 201 || addResponse.data.message) {
        // Approve the pending transaction (mark as approved)
        await approvePendingTransaction(pendingApproval._id);

        // Remove from pending list
        setPendingTransactions((prev) =>
          prev.filter((tx) => tx._id !== pendingApproval._id)
        );

        // Close modal
        setShowDescriptionModal(false);
        setPendingApproval(null);
        setDescriptionText('');

        // Reload dashboard to show new transaction
        const data = await getDashboardData();
        setDashboard(data);

        // Show success message
        alert('Transaction added successfully!');
      } else {
        alert('Failed to add transaction. Please try again.');
      }
    } catch (err: any) {
      console.error('Approve failed:', err);
      alert(err?.response?.data?.message || 'Failed to add transaction.');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle reject transaction
  const handleReject = async (pendingId: string) => {
    try {
      const response = await rejectPendingTransaction(pendingId);
      if (response.success) {
        // Remove from pending list
        setPendingTransactions((prev) =>
          prev.filter((tx) => tx._id !== pendingId)
        );
        // Show success message
        alert('Transaction rejected.');
      } else {
        alert('Failed to reject transaction. Please try again.');
      }
    } catch (err: any) {
      console.error('Reject failed:', err);
      alert(err?.response?.data?.message || 'Failed to reject transaction.');
    }
  };

  // Handle bank statement upload
  const handleBankUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }

    const userId =
      dashboard?.userId ||
      (typeof window !== 'undefined' ? document.body.dataset.userId : null);

    if (!userId) {
      alert('Unable to identify user. Please refresh the page.');
      return;
    }

    setIsUploadingBank(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);

      const response = await axios.post(
        'http://localhost:8001/parse',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60000, // 60 seconds for large PDFs
        }
      );

      // Check if response indicates success (even if some transactions failed)
      if (response.data && response.data.success !== false) {
        const parsed = response.data.parsed || 0;
        const added = response.data.added || 0;
        const failed = response.data.failed || 0;

        let message = `Bank Statement Processing Complete!\n\n`;
        message += `📊 Parsed: ${parsed} transactions\n`;
        message += `✅ Successfully added: ${added} transactions\n`;
        if (failed > 0) {
          message += `⚠️ Failed/timeout: ${failed} transactions\n`;
          message += `\nNote: Some transactions may still be processing in the background.`;
        }

        alert(message);
        // Reload dashboard to show new transactions
        const data = await getDashboardData();
        setDashboard(data);
      } else {
        // Partial success - still show what was added
        const added = response.data?.added || 0;
        if (added > 0) {
          alert(
            `Bank Statement Partially Processed!\n\n✅ Added: ${added} transactions\n⚠️ Some transactions may have timed out but may still be processing.`
          );
          const data = await getDashboardData();
          setDashboard(data);
        } else {
          alert('Failed to process bank statement. Please try again.');
        }
      }
    } catch (err: any) {
      console.error('Bank upload failed:', err);

      // Check if it's a timeout but some transactions might have been added
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        alert(
          'Upload timed out, but some transactions may have been added. Please refresh the dashboard to check.'
        );
        // Still reload dashboard in case some transactions were added
        try {
          const data = await getDashboardData();
          setDashboard(data);
        } catch (refreshErr) {
          console.error('Failed to refresh dashboard:', refreshErr);
        }
      } else {
        alert(
          err?.response?.data?.error ||
            'Failed to upload bank statement. Please try again.'
        );
      }
    } finally {
      setIsUploadingBank(false);
      // Reset file input
      e.target.value = '';
    }
  };

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
      setVoiceMessage(
        'Voice is not supported on this browser. Please use Chrome or Edge.'
      );
      setTimeout(() => setVoiceMessage(null), 5000);
      return;
    }

    // Initialize Speech Recognition
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
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
          setVoiceResponse(
            'I could not generate a response. Please try again.'
          );
          speak('I could not generate a response. Please try again.');
        }
      } catch (error: any) {
        console.error('Voice chat error:', error);
        const errorMsg =
          error?.response?.status === 401
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
        errorMsg =
          'Microphone permission denied. Please allow microphone access.';
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
      voices.forEach((v) =>
        console.log(`Name: ${v.name}, Lang: ${v.lang}, Default: ${v.default}`)
      );
      console.log(`Total voices: ${voices.length}`);
      return voices;
    };

    // Log voices when they become available (may require voiceschanged event)
    const logVoicesOnce = () => {
      if (window.speechSynthesis.getVoices().length > 0) {
        console.log(
          'Voices loaded. Use window.logAvailableVoices() to see all voices.'
        );
      }
    };

    // Try to log voices immediately
    logVoicesOnce();

    // Also listen for voiceschanged event (voices load asynchronously)
    window.speechSynthesis.addEventListener('voiceschanged', logVoicesOnce);

    return () => {
      window.speechSynthesis.removeEventListener(
        'voiceschanged',
        logVoicesOnce
      );
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
        console.log(
          'Selected Indian voice (en-IN default):',
          defaultVoice.name
        );
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
        console.log(
          'Selected Indian-named voice (default):',
          defaultVoice.name
        );
        return defaultVoice;
      }
      console.log('Selected Indian-named voice:', indianNamedVoices[0].name);
      return indianNamedVoices[0];
    }

    // Fallback: Best available English voice
    const englishVoices = voices.filter((v) =>
      v.lang.toLowerCase().startsWith('en')
    );
    if (englishVoices.length > 0) {
      const defaultVoice = englishVoices.find((v) => v.default);
      if (defaultVoice) {
        console.log(
          'Selected fallback English voice (default):',
          defaultVoice.name
        );
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
    // Education/School related
    'School / college fees': (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
    School: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
    College: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
    Education: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    // Withdrawal related
    Withdrawal: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    'Atm withdrawal': (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    Atm: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    // Other/General
    Other: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    'Food & Dining': (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    Shopping: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    ),
    Transport: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
    'Rent & Utilities': (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
    Food: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    Groceries: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
    Entertainment: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    Healthcare: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    ),
    Bills: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    Subscriptions: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
    Travel: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    'Personal Care': (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
    ),
    'Gas & Fuel': (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    'Dining Out': (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    'Online Shopping': (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    ),
    Utilities: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
    Rent: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
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
      // Default minimal icon (circle) if category not found
      const icon = categoryIcons[cat.category] || (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );

      // Capitalize first letter of category name
      const capitalizedLabel = cat.category
        ? cat.category.charAt(0).toUpperCase() +
          cat.category.slice(1).toLowerCase()
        : cat.category;

      return {
        icon,
        label: capitalizedLabel,
        change: formatCurrency(cat.amount),
        changePercent: `${cat.changePercent}%`, // Removed triangle icons
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
        <header className="bg-white/60 dark:bg-gray-900/60 border-pastel-tan/30 dark:border-gray-700 backdrop-blur-sm border-b sticky top-0 z-30">
          <div className="px-6 py-3">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <h1 className="text-2xl font-semibold text-text dark:text-white">
                  Dashboard
                </h1>
              </div>
              <div className="flex gap-3 items-center">
                {/* Connect Gmail Button */}
                <button
                  onClick={handleConnectGmail}
                  disabled={isGmailConnecting}
                  className={`flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1.5 rounded-full text-sm font-medium shadow-sm hover:from-orange-600 hover:to-orange-700 transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.98] duration-200 ${
                    isGmailConnecting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={isGmailConnected ? 'Gmail Connected' : 'Connect Gmail'}
                >
                  {isGmailConnecting ? (
                    <>
                      <svg
                        className="w-4 h-4 text-white animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span>
                        {isGmailConnected ? 'Gmail Connected' : 'Connect Gmail'}
                      </span>
                    </>
                  )}
                </button>
                {/* Upload Bank Statement Button */}
                <button
                  onClick={() => document.getElementById('pdfInput')?.click()}
                  disabled={isUploadingBank}
                  className={`flex items-center gap-1.5 bg-[#FFF7ED] text-[#B45309] px-3 py-1.5 rounded-full text-sm font-medium shadow-sm border border-[#FCD9B6] hover:bg-[#FDEDD3] transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.98] duration-200 ${
                    isUploadingBank ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Upload Bank Statement PDF"
                >
                  {isUploadingBank ? (
                    <>
                      <svg
                        className="w-4 h-4 text-[#B45309] animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 text-[#B45309]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <span>Upload PDF</span>
                    </>
                  )}
                </button>
                <input
                  id="pdfInput"
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleBankUpload}
                />
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
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
              <p className="text-sm text-text/50 mb-2">Total Spent (Month)</p>
              <p className="text-3xl font-semibold text-text dark:text-white mb-1">
                {formatCurrency(summary?.totalSpentThisMonth)}
              </p>
              <p className="text-xs text-text/40">
                Across {summary?.transactionCount || 0} transactions
              </p>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
              <p className="text-sm text-text/50 mb-2">Income Received</p>
              <p className="text-3xl font-semibold text-text dark:text-white mb-1">
                {formatCurrency(summary?.totalIncomeThisMonth)}
              </p>
              <p className="text-xs text-text/40">{lastIncomeLabel()}</p>
            </div>
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20 dark:border-gray-700">
              <p className="text-sm text-text/50 mb-2">Remaining Budget</p>
              <p className="text-3xl font-semibold text-text dark:text-white mb-1">
                {formatCurrency(summary?.remainingBudget)}
              </p>
              <p className="text-xs text-text/40">Based on spending pace</p>
            </div>
          </div>

          {/* 2. Activity Graph */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-text dark:text-white">
                Spending Activity
              </h2>
              <select className="px-4 py-2 rounded-xl border border-pastel-tan/30 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-text dark:text-white focus:outline-none focus:ring-2 focus:ring-pastel-green/30 dark:focus:ring-green-600/30">
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

          {/* 3. Comprehensive AI Insights (5 Reports) */}
          {allInsights && allInsights.reports && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-text dark:text-white mb-4">
                Comprehensive AI Financial Reports
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {allInsights.reports.income && (
                  <FinancialReportCard
                    data={allInsights.reports.income}
                    updatedAt={allInsights.updatedAt}
                  />
                )}
                {allInsights.reports.expense && (
                  <FinancialReportCard
                    data={allInsights.reports.expense}
                    updatedAt={allInsights.updatedAt}
                  />
                )}
                {allInsights.reports.savings && (
                  <FinancialReportCard
                    data={allInsights.reports.savings}
                    updatedAt={allInsights.updatedAt}
                  />
                )}
                {allInsights.reports.investment && (
                  <FinancialReportCard
                    data={allInsights.reports.investment}
                    updatedAt={allInsights.updatedAt}
                  />
                )}
                {allInsights.reports.goals && (
                  <div className="lg:col-span-2">
                    <FinancialReportCard
                      data={allInsights.reports.goals}
                      updatedAt={allInsights.updatedAt}
                      showPrediction={true}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. Financial Report (Legacy) */}
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

          {/* 4. Gmail Transactions (Pending Verification) */}
          <div className="bg-white/80 rounded-3xl p-6 shadow-soft border border-pastel-tan/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-text">
                {pendingTransactions.length > 0
                  ? `Gmail Transactions (${pendingTransactions.length} new)`
                  : 'Gmail Transactions (synced)'}
              </h2>
            </div>

            {isLoadingPending ? (
              <div className="text-center text-text/50 py-6">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-pastel-green"></div>
                <p className="mt-2 text-sm">Loading pending transactions...</p>
              </div>
            ) : pendingTransactions.length === 0 ? (
              <div className="text-center text-text/50 py-6">
                No Gmail transactions waiting for review
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTransactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="flex items-center gap-4 p-5 bg-gradient-to-r from-white to-gray-50 rounded-2xl border border-pastel-tan/30 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-text mb-1 line-clamp-2">
                            {transaction.text}
                          </p>
                          <p className="text-xs text-text/40">
                            {new Date(transaction.createdAt).toLocaleDateString(
                              'en-IN',
                              {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-lg text-text mb-1">
                            ₹{transaction.amount?.toLocaleString('en-IN')}
                          </p>
                          <span
                            className={`inline-block px-3 py-1 text-xs rounded-full font-semibold ${
                              transaction.type === 'income'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {transaction.type === 'income'
                              ? 'Income'
                              : 'Expense'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(transaction)}
                        className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all text-sm font-semibold shadow-sm hover:shadow-md"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => handleReject(transaction._id)}
                        className="px-5 py-2.5 border-2 border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-all text-sm font-semibold"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Top Spending Categories */}
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
                  <div className="text-white mb-2.5 flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
                    {category.icon}
                  </div>
                  <p className="text-sm font-medium text-text mb-1">
                    {category.label}
                  </p>
                  <p className="text-lg font-semibold text-text">
                    {category.change}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Goals Progress */}
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
            <p className="text-sm font-medium text-text whitespace-nowrap">
              Listening...
            </p>
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
                <p className="text-sm text-text whitespace-pre-line">
                  {voiceResponse}
                </p>
              </div>
            )}

            {/* Clear Button */}
            {(voiceMessage || voiceResponse) &&
              !isListening &&
              !isProcessingVoice && (
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

      {/* Description Modal for Approving Transaction */}
      {showDescriptionModal && pendingApproval && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-text">
                Add Transaction Description
              </h3>
              <button
                onClick={() => {
                  setShowDescriptionModal(false);
                  setPendingApproval(null);
                  setDescriptionText('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-text/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text/60">Amount</span>
                  <span className="font-bold text-lg text-text">
                    ₹{pendingApproval.amount?.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text/60">Type</span>
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-semibold ${
                      pendingApproval.type === 'income'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {pendingApproval.type === 'income' ? 'Income' : 'Expense'}
                  </span>
                </div>
              </div>

              <label className="block text-sm font-medium text-text mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                placeholder="Enter a description for this transaction..."
                className="w-full px-4 py-3 border border-pastel-tan/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-pastel-green/30 resize-none"
                rows={4}
                autoFocus
              />
              <p className="text-xs text-text/50 mt-2">
                This description will be used as the transaction description.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDescriptionModal(false);
                  setPendingApproval(null);
                  setDescriptionText('');
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmApprove}
                disabled={!descriptionText.trim() || isApproving}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isApproving ? (
                  <>
                    <svg
                      className="w-5 h-5 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Adding...</span>
                  </>
                ) : (
                  'Add Transaction'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
