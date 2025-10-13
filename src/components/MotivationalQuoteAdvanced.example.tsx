/**
 * Advanced Usage Examples for MotivationalQuote Component
 * 
 * This file demonstrates various advanced integration patterns
 * for the MotivationalQuote component in different scenarios.
 * 
 * NOTE: This is an example file for reference only.
 * It is not imported into the main application.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MotivationalQuote, Quote } from './MotivationalQuote';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// EXAMPLE 1: Refresh Quote on Quick Action Click
// ============================================================================

export function SideNavWithQuoteRefresh() {
  // Use a key to force re-mount and trigger new quote
  const [quoteKey, setQuoteKey] = useState(0);

  // This function can be called when any Quick Action is clicked
  const handleQuickActionClick = () => {
    setQuoteKey(prev => prev + 1); // Increment key to refresh quote
  };

  return (
    <div className="space-y-5">
      {/* Quick Actions with refresh callback */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="space-y-2">
          <button 
            onClick={handleQuickActionClick}
            className="w-full p-3 text-left rounded-lg hover:bg-gray-50"
          >
            Report Issue
          </button>
          <button 
            onClick={handleQuickActionClick}
            className="w-full p-3 text-left rounded-lg hover:bg-gray-50"
          >
            View Reports
          </button>
        </div>
      </div>

      {/* Motivational Quote with key-based refresh */}
      <MotivationalQuote key={quoteKey} />
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Track Quote Views with Analytics
// ============================================================================

export function MotivationalQuoteWithAnalytics() {
  const handleQuoteChange = useCallback((quote: Quote) => {
    // Track with your analytics service
    console.log('Quote viewed:', quote);
    
    // Example: Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'quote_viewed', {
        quote_text: quote.text,
        quote_author: quote.author,
        timestamp: new Date().toISOString()
      });
    }

    // Example: Custom analytics API
    fetch('/api/analytics/quote-viewed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quote_text: quote.text,
        quote_author: quote.author,
        user_id: 'current_user_id'
      })
    }).catch(err => console.error('Analytics error:', err));
  }, []);

  return <MotivationalQuote onQuoteChange={handleQuoteChange} />;
}

// ============================================================================
// EXAMPLE 3: Context-Aware Quotes
// ============================================================================

export function ContextAwareMotivationalQuote({ context }: { context: 'reports' | 'profile' | 'leaderboard' }) {
  const quoteSets = {
    reports: [
      { text: "Every report helps build a stronger community.", author: "Cars-G" },
      { text: "Your voice matters. Speak up, make change.", author: "Cars-G" },
      { text: "Together we can solve any problem.", author: "Cars-G" }
    ],
    profile: [
      { text: "Your contributions make a difference.", author: "Cars-G" },
      { text: "Growth comes from consistent action.", author: "Cars-G" },
      { text: "You are valued in this community.", author: "Cars-G" }
    ],
    leaderboard: [
      { text: "Success is measured in impact, not numbers.", author: "Cars-G" },
      { text: "Compete with yourself, not others.", author: "Cars-G" },
      { text: "Every contribution counts equally.", author: "Cars-G" }
    ]
  };

  return <MotivationalQuote customQuotes={quoteSets[context]} />;
}

// ============================================================================
// EXAMPLE 4: Auto-Rotating Quotes
// ============================================================================

export function AutoRotatingQuote({ intervalSeconds = 30 }: { intervalSeconds?: number }) {
  const [quoteKey, setQuoteKey] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteKey(prev => prev + 1);
    }, intervalSeconds * 1000);

    return () => clearInterval(interval);
  }, [intervalSeconds]);

  return <MotivationalQuote key={quoteKey} />;
}

// ============================================================================
// EXAMPLE 5: Quotes from API with Error Handling
// ============================================================================

export function APIMotivationalQuote() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleQuoteChange = useCallback((quote: Quote) => {
    setHasError(false);
    console.log('Quote loaded:', quote);
  }, []);

  // Only use API when online, fallback to local quotes when offline
  const apiEndpoint = isOnline ? 'https://api.quotable.io/random' : undefined;

  return (
    <div>
      <MotivationalQuote 
        apiEndpoint={apiEndpoint}
        onQuoteChange={handleQuoteChange}
      />
      {!isOnline && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          Offline mode - showing local quotes
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: User Preference - Show/Hide Quotes
// ============================================================================

export function OptionalMotivationalQuote() {
  const [showQuotes, setShowQuotes] = useState(() => {
    // Load preference from localStorage
    const saved = localStorage.getItem('show_motivational_quotes');
    return saved === null ? true : saved === 'true';
  });

  const toggleQuotes = () => {
    setShowQuotes(prev => {
      const newValue = !prev;
      localStorage.setItem('show_motivational_quotes', String(newValue));
      return newValue;
    });
  };

  return (
    <div>
      {showQuotes && <MotivationalQuote />}
      <button 
        onClick={toggleQuotes}
        className="mt-2 text-xs text-gray-500 hover:text-gray-700"
      >
        {showQuotes ? 'Hide' : 'Show'} motivational quotes
      </button>
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Integration with Navigation Events
// ============================================================================

export function NavigationAwareQuote() {
  const navigate = useNavigate();
  const [quoteKey, setQuoteKey] = useState(0);

  // Custom navigate function that also refreshes quote
  const navigateWithQuoteRefresh = useCallback((path: string) => {
    navigate(path);
    setQuoteKey(prev => prev + 1);
  }, [navigate]);

  return (
    <div className="space-y-5">
      {/* Navigation with quote refresh */}
      <div className="space-y-2">
        <button onClick={() => navigateWithQuoteRefresh('/reports')}>
          Go to Reports (+ New Quote)
        </button>
        <button onClick={() => navigateWithQuoteRefresh('/leaderboard')}>
          Go to Leaderboard (+ New Quote)
        </button>
      </div>

      <MotivationalQuote key={quoteKey} />
    </div>
  );
}

// ============================================================================
// EXAMPLE 8: Quotes with Share Functionality
// ============================================================================

export function ShareableMotivationalQuote() {
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);

  const handleShare = async () => {
    if (!currentQuote) return;

    const shareText = `"${currentQuote.text}" — ${currentQuote.author}`;

    // Check if Web Share API is available
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Motivational Quote',
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled or failed:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Quote copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className="space-y-3">
      <MotivationalQuote onQuoteChange={setCurrentQuote} />
      {currentQuote && (
        <button
          onClick={handleShare}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Share this quote
        </button>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 9: A/B Testing Different Quote Sets
// ============================================================================

export function ABTestMotivationalQuote() {
  const [variant] = useState(() => {
    // Randomly assign variant A or B
    return Math.random() > 0.5 ? 'A' : 'B';
  });

  const variantAQuotes = [
    { text: "Short, punchy quotes work best!", author: "Test A" },
    { text: "Action beats perfection.", author: "Test A" }
  ];

  const variantBQuotes = [
    { text: "Longer, more descriptive quotes that provide deeper insights and encourage thoughtful reflection.", author: "Test B" },
    { text: "Sometimes we need more context and explanation to truly understand the message.", author: "Test B" }
  ];

  const handleQuoteView = useCallback((quote: Quote) => {
    // Track which variant is shown
    console.log('A/B Test - Variant:', variant, 'Quote:', quote);
  }, [variant]);

  return (
    <MotivationalQuote 
      customQuotes={variant === 'A' ? variantAQuotes : variantBQuotes}
      onQuoteChange={handleQuoteView}
    />
  );
}

// ============================================================================
// EXAMPLE 10: Multi-Language Support
// ============================================================================

export function MultiLanguageMotivationalQuote({ language = 'en' }: { language?: 'en' | 'es' | 'tl' }) {
  const quotes = {
    en: [
      { text: "Together we build a better community.", author: "Cars-G" },
      { text: "Your voice matters.", author: "Cars-G" }
    ],
    es: [
      { text: "Juntos construimos una mejor comunidad.", author: "Cars-G" },
      { text: "Tu voz importa.", author: "Cars-G" }
    ],
    tl: [
      { text: "Sama-sama tayong bumubuo ng mas magandang komunidad.", author: "Cars-G" },
      { text: "Mahalaga ang iyong tinig.", author: "Cars-G" }
    ]
  };

  return <MotivationalQuote customQuotes={quotes[language]} />;
}

// ============================================================================
// EXAMPLE 11: Quote Persistence (Remember Last Quote)
// ============================================================================

export function PersistentMotivationalQuote() {
  const [savedQuote, setSavedQuote] = useState<Quote | null>(() => {
    try {
      const saved = localStorage.getItem('last_motivational_quote');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleQuoteChange = useCallback((quote: Quote) => {
    setSavedQuote(quote);
    localStorage.setItem('last_motivational_quote', JSON.stringify(quote));
  }, []);

  return (
    <div>
      <MotivationalQuote onQuoteChange={handleQuoteChange} />
      {savedQuote && (
        <div className="mt-2 text-xs text-gray-500">
          Last quote: "{savedQuote.text.substring(0, 30)}..."
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 12: Time-Based Quotes (Morning, Afternoon, Evening)
// ============================================================================

export function TimeBasedMotivationalQuote() {
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const quotes = {
    morning: [
      { text: "Good morning! Start your day with purpose.", author: "Cars-G" },
      { text: "Rise and shine! Your community needs you.", author: "Cars-G" }
    ],
    afternoon: [
      { text: "Keep the momentum going!", author: "Cars-G" },
      { text: "Every action counts, no matter the time.", author: "Cars-G" }
    ],
    evening: [
      { text: "Reflect on your day's contributions.", author: "Cars-G" },
      { text: "Rest well, tomorrow brings new opportunities.", author: "Cars-G" }
    ]
  };

  const timeOfDay = getTimeOfDay();

  return <MotivationalQuote customQuotes={quotes[timeOfDay]} />;
}

// ============================================================================
// EXAMPLE 13: Conditional Rendering Based on User Activity
// ============================================================================

export function ActivityBasedMotivationalQuote({ userReportsCount }: { userReportsCount: number }) {
  const quotes = userReportsCount === 0 
    ? [
        { text: "Start your journey! File your first report.", author: "Cars-G" },
        { text: "Every great change starts with a single action.", author: "Cars-G" }
      ]
    : userReportsCount < 5
    ? [
        { text: "You're making progress! Keep going.", author: "Cars-G" },
        { text: "Your contributions are building a better community.", author: "Cars-G" }
      ]
    : [
        { text: "You're a community champion!", author: "Cars-G" },
        { text: "Your dedication inspires others.", author: "Cars-G" }
      ];

  return <MotivationalQuote customQuotes={quotes} />;
}

// ============================================================================
// EXAMPLE 14: Accessibility-Enhanced Version
// ============================================================================

export function AccessibleMotivationalQuote() {
  const [announceQuote, setAnnounceQuote] = useState(false);
  const announcementRef = useRef<HTMLDivElement>(null);

  const handleQuoteChange = useCallback((quote: Quote) => {
    // Trigger screen reader announcement
    setAnnounceQuote(true);
    setTimeout(() => setAnnounceQuote(false), 100);
  }, []);

  return (
    <div>
      <MotivationalQuote onQuoteChange={handleQuoteChange} />
      
      {/* Additional screen reader announcement */}
      <div 
        ref={announcementRef}
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {announceQuote && "New motivational quote loaded"}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 15: Integration with Notification System
// ============================================================================

export function NotificationIntegratedQuote() {
  const [notification, setNotification] = useState<string | null>(null);

  const handleQuoteChange = useCallback((quote: Quote) => {
    // Show a brief notification when quote changes
    setNotification(`New quote: "${quote.text.substring(0, 40)}..."`);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  return (
    <div className="relative">
      <MotivationalQuote onQuoteChange={handleQuoteChange} />
      
      {notification && (
        <div className="absolute -top-2 left-0 right-0 bg-blue-600 text-white text-xs py-1 px-2 rounded shadow-lg animate-fade-in">
          {notification}
        </div>
      )}
    </div>
  );
}

/**
 * Export all examples for easy testing
 */
export const examples = {
  SideNavWithQuoteRefresh,
  MotivationalQuoteWithAnalytics,
  ContextAwareMotivationalQuote,
  AutoRotatingQuote,
  APIMotivationalQuote,
  OptionalMotivationalQuote,
  NavigationAwareQuote,
  ShareableMotivationalQuote,
  ABTestMotivationalQuote,
  MultiLanguageMotivationalQuote,
  PersistentMotivationalQuote,
  TimeBasedMotivationalQuote,
  ActivityBasedMotivationalQuote,
  AccessibleMotivationalQuote,
  NotificationIntegratedQuote
};


