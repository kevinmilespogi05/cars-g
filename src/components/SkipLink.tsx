import { useState } from 'react';
import { motion } from 'framer-motion';

export const SkipLink = () => {
  const [isVisible, setIsVisible] = useState(false);

  const handleSkip = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView();
    }
  };

  return (
    <motion.a
      href="#main-content"
      onClick={handleSkip}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      initial={{ opacity: 0, y: -100 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -100 }}
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-50
        bg-blue-500 text-white px-6 py-3 rounded-lg
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        transform transition-transform
        ${isVisible ? 'translate-y-0' : '-translate-y-full'}
      `}
    >
      Skip to main content
    </motion.a>
  );
}; 