import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function PhilippinesDateTime() {
  const [dateTime, setDateTime] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      // Format the date and time for Philippines timezone (Asia/Manila)
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      
      const formattedDate = dateFormatter.format(now);
      const formattedTime = timeFormatter.format(now);
      
      setDateTime(`${formattedDate} | ${formattedTime}`);
    };

    // Update immediately on mount
    updateDateTime();
    
    // Update every second
    const intervalId = setInterval(updateDateTime, 1000);
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="hidden lg:flex items-center space-x-2 px-4 py-2 rounded-xl border border-white/20 shadow-sm backdrop-blur-sm" style={{backgroundColor: '#660000'}}>
      <Clock className="h-4 w-4 text-white/90 flex-shrink-0" />
      <span className="text-sm font-medium text-white whitespace-nowrap">
        {dateTime}
      </span>
    </div>
  );
}

