import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export function MobileBackToReports() {
  const navigate = useNavigate();

  return (
    <motion.button
      onClick={() => navigate('/dashboard')}
      className="sm:hidden fixed top-20 left-4 z-40 p-3 rounded-lg bg-white shadow-md border border-gray-200 hover:bg-gray-50 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-color focus:ring-offset-2 flex items-center justify-center"
      aria-label="Back to reports"
      title="Back to reports"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <ArrowLeft className="h-5 w-5 text-gray-700" />
    </motion.button>
  );
}
