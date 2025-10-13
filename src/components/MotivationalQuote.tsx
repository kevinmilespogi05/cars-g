import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';

/**
 * MotivationalQuote Component
 * 
 * A reusable component that displays motivational quotes with smooth animations.
 * Features:
 * - Random quote selection from a curated list
 * - Fade-in/slide animation on quote changes
 * - Manual refresh capability
 * - Accessibility support (ARIA labels, screen reader friendly)
 * - Future-ready for API integration
 * 
 * Usage:
 * ```tsx
 * <MotivationalQuote />
 * // Or with external trigger
 * <MotivationalQuote key={triggerValue} />
 * ```
 */

export interface Quote {
  text: string;
  author: string;
}

interface MotivationalQuoteProps {
  /** Optional: Provide custom quotes array */
  customQuotes?: Quote[];
  /** Optional: Callback when quote changes */
  onQuoteChange?: (quote: Quote) => void;
  /** Optional: API endpoint for fetching quotes (future use) */
  apiEndpoint?: string;
  /** Optional: Disable manual refresh button */
  disableRefresh?: boolean;
}

// Curated list of motivational quotes for community engagement and civic responsibility
const DEFAULT_QUOTES: Quote[] = [
  {
    text: "Success is not final; failure is not fatal: It is the courage to continue that counts.",
    author: "Winston S. Churchill"
  },
  {
    text: "The best way to find yourself is to lose yourself in the service of others.",
    author: "Mahatma Gandhi"
  },
  {
    text: "Alone we can do so little; together we can do so much.",
    author: "Helen Keller"
  },
  {
    text: "Be the change that you wish to see in the world.",
    author: "Mahatma Gandhi"
  },
  {
    text: "The greatest glory in living lies not in never falling, but in rising every time we fall.",
    author: "Nelson Mandela"
  },
  {
    text: "Your voice matters. Your action counts. Your community needs you.",
    author: "Cars-G Team"
  },
  {
    text: "Small acts, when multiplied by millions of people, can transform the world.",
    author: "Howard Zinn"
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs"
  },
  {
    text: "Never doubt that a small group of thoughtful, committed citizens can change the world.",
    author: "Margaret Mead"
  },
  {
    text: "In a gentle way, you can shake the world.",
    author: "Mahatma Gandhi"
  },
  {
    text: "The time is always right to do what is right.",
    author: "Martin Luther King Jr."
  },
  {
    text: "Every great dream begins with a dreamer. Always remember, you have within you the strength to change your community.",
    author: "Harriet Tubman"
  },
  {
    text: "Act as if what you do makes a difference. It does.",
    author: "William James"
  },
  {
    text: "You must be the change you wish to see in the world.",
    author: "Mahatma Gandhi"
  },
  {
    text: "Service to others is the rent you pay for your room here on earth.",
    author: "Muhammad Ali"
  }
];

export function MotivationalQuote({ 
  customQuotes, 
  onQuoteChange,
  apiEndpoint,
  disableRefresh = false
}: MotivationalQuoteProps) {
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const quotes = customQuotes || DEFAULT_QUOTES;

  // Get a random quote from the list
  const getRandomQuote = (): Quote => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
  };

  // Fetch quote from API (future implementation)
  const fetchQuoteFromAPI = async (): Promise<Quote | null> => {
    if (!apiEndpoint) return null;
    
    try {
      const response = await fetch(apiEndpoint);
      if (!response.ok) throw new Error('Failed to fetch quote');
      const data = await response.json();
      return {
        text: data.text || data.quote || data.content,
        author: data.author || 'Unknown'
      };
    } catch (error) {
      console.error('Error fetching quote from API:', error);
      return null;
    }
  };

  // Initialize or change quote
  const changeQuote = async () => {
    setIsRefreshing(true);
    
    // Try API first if endpoint is provided
    let newQuote: Quote | null = null;
    if (apiEndpoint) {
      newQuote = await fetchQuoteFromAPI();
    }
    
    // Fallback to local quotes
    if (!newQuote) {
      newQuote = getRandomQuote();
    }
    
    // Ensure we don't show the same quote twice in a row
    if (currentQuote && newQuote.text === currentQuote.text && quotes.length > 1) {
      newQuote = getRandomQuote();
    }
    
    setCurrentQuote(newQuote);
    onQuoteChange?.(newQuote);
    
    // Small delay for refresh animation
    setTimeout(() => setIsRefreshing(false), 300);
  };

  // Initialize with a random quote on mount
  useEffect(() => {
    changeQuote();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle manual refresh
  const handleRefresh = () => {
    if (!isRefreshing) {
      changeQuote();
    }
  };

  if (!currentQuote) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-sm border border-blue-100 p-5 relative overflow-hidden"
      role="region"
      aria-label="Motivational Quote"
    >
      {/* Decorative background pattern */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
        <Sparkles className="h-24 w-24 text-blue-600" />
      </div>

      {/* Header with icon and refresh button */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Sparkles className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">
            Daily Motivation
          </h3>
        </div>
        
        {!disableRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg hover:bg-white/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Get new quote"
            title="Get new quote"
          >
            <RefreshCw 
              className={`h-4 w-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Quote content with animation */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuote.text}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.4 }}
          className="relative z-10"
        >
          {/* Quote text */}
          <blockquote className="mb-3">
            <p className="text-sm leading-relaxed text-gray-700 font-medium italic relative">
              <span className="text-blue-600 text-2xl leading-none absolute -left-2 -top-1">"</span>
              <span className="pl-4">{currentQuote.text}</span>
              <span className="text-blue-600 text-2xl leading-none">"</span>
            </p>
          </blockquote>

          {/* Author */}
          <footer className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gradient-to-r from-blue-200 to-transparent"></div>
            <cite className="text-xs font-semibold text-gray-600 not-italic">
              — {currentQuote.author}
            </cite>
            <div className="h-px flex-1 bg-gradient-to-l from-blue-200 to-transparent"></div>
          </footer>
        </motion.div>
      </AnimatePresence>

      {/* Accessibility: Screen reader only description */}
      <div className="sr-only" role="status" aria-live="polite">
        Current motivational quote: {currentQuote.text} by {currentQuote.author}
      </div>
    </motion.div>
  );
}

// Export quotes for testing or external use
export { DEFAULT_QUOTES };


