import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function PhilippinesDateTime() {
  const [dateTime, setDateTime] = useState<string>('');
  const [timeOnly, setTimeOnly] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      // Format the date for Philippines timezone (Asia/Manila)
      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      
      // Format the time for Philippines timezone (Asia/Manila)
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      
      const formattedDate = dateFormatter.format(now);
      const formattedTime = timeFormatter.format(now);
      
      setDateTime(`${formattedDate} | ${formattedTime}`);
      setTimeOnly(formattedTime);
    };

    // Update immediately on mount
    updateDateTime();
    
    // Update every second
    const intervalId = setInterval(updateDateTime, 1000);
    
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="w-full">
      {/* Full date and time - for desktop */}
      <div className="hidden sm:block">
        <div className="flex items-center space-x-2 px-4 py-3 rounded-lg border border-white/20 shadow-sm backdrop-blur-sm" style={{backgroundColor: '#660000'}}>
          <Clock className="h-4 w-4 text-white/90 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white/90 leading-tight">
              {dateTime}
            </span>
          </div>
        </div>
      </div>

      {/* Compact time only - for mobile */}
      <div className="sm:hidden">
        <div className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg border border-white/20 shadow-sm backdrop-blur-sm" style={{backgroundColor: '#660000'}}>
          <Clock className="h-3.5 w-3.5 text-white/90 flex-shrink-0" />
          <span className="text-xs font-medium text-white/90">
            {timeOnly}
          </span>
        </div>
      </div>
    </div>
  );
}

