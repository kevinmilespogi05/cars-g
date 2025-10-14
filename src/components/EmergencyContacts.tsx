import React from 'react';
import { Shield } from 'lucide-react';

/**
 * EmergencyContacts Component
 * 
 * Displays a grid of emergency contact numbers for quick access.
 * On mobile devices, clicking a number will initiate a phone call.
 * On desktop, clicking will copy the number to clipboard.
 * 
 * Customization:
 * - Add/remove contact cards by modifying the contacts array
 * - Adjust grid columns via the grid-cols-* classes
 * - Modify color schemes by changing the bg-* and border-* classes
 */

interface EmergencyContact {
  id: string;
  title: string;
  description: string;
  number: string;
  displayNumber: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    hover: string;
  };
}

export function EmergencyContacts() {
  // Handler for telephone links to prevent errors on desktop
  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>, phoneNumber: string) => {
    // Check if device has phone calling capabilities
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (!isMobile) {
      // Prevent default tel: link behavior on desktop
      e.preventDefault();
      
      // Copy to clipboard
      navigator.clipboard.writeText(phoneNumber).then(() => {
        // Show toast notification
        alert(`Phone number ${phoneNumber} copied to clipboard!`);
      }).catch(() => {
        // Fallback if clipboard fails
        alert(`Call: ${phoneNumber}`);
      });
    }
    // On mobile, let the default tel: behavior work
  };

  const contacts: EmergencyContact[] = [
    {
      id: 'national-emergency',
      title: 'National Emergency',
      description: 'For immediate assistance',
      number: '911',
      displayNumber: '911',
      colorScheme: {
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-emergency-text',
        hover: 'hover:bg-emergency-hover/20'
      }
    },
    {
      id: 'red-cross',
      title: 'Red Cross',
      description: 'Medical emergencies',
      number: '143',
      displayNumber: '143',
      colorScheme: {
        bg: 'bg-orange-50',
        border: 'border-emergency-accent/30',
        text: 'text-emergency-accent',
        hover: 'hover:bg-emergency-hover/20'
      }
    },
    {
      id: 'police',
      title: 'Police',
      description: 'Police assistance',
      number: '9117',
      displayNumber: '9117',
      colorScheme: {
        bg: 'bg-blue-50',
        border: 'border-primary-300',
        text: 'text-primary-700',
        hover: 'hover:bg-primary-100'
      }
    },
    {
      id: 'fire',
      title: 'Fire Department',
      description: 'Fire emergencies',
      number: '117',
      displayNumber: '117',
      colorScheme: {
        bg: 'bg-yellow-50',
        border: 'border-emergency-accent/30',
        text: 'text-emergency-accent',
        hover: 'hover:bg-emergency-hover/20'
      }
    },
    {
      id: 'ndrrmc',
      title: 'NDRRMC',
      description: 'Disaster response',
      number: '0289115061',
      displayNumber: '(02) 8911-5061',
      colorScheme: {
        bg: 'bg-green-50',
        border: 'border-accent-500/30',
        text: 'text-accent-500',
        hover: 'hover:bg-accent-500/10'
      }
    },
    {
      id: 'health',
      title: 'Health Department',
      description: 'Health emergencies',
      number: '0287111001',
      displayNumber: '(02) 8711-1001',
      colorScheme: {
        bg: 'bg-purple-50',
        border: 'border-secondary-500/30',
        text: 'text-secondary-500',
        hover: 'hover:bg-secondary-100'
      }
    }
  ];

  return (
    <div className="bg-emergency-bg rounded-xl shadow-sm border border-emergency-accent/20 p-4">
      <h3 className="text-base font-semibold text-emergency-text mb-3 flex items-center gap-2">
        <Shield className="h-5 w-5 text-emergency-accent" />
        Emergency Contacts
      </h3>
      
      {/* Responsive grid: 1 col on mobile, 2 cols on larger screens */}
      <div className="grid grid-cols-1 gap-2.5">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className={`${contact.colorScheme.bg} border ${contact.colorScheme.border} rounded-lg p-2.5 ${contact.colorScheme.hover} transition-all duration-200`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold text-sm ${contact.colorScheme.text}`}>
                  {contact.title}
                </h4>
                <p className="text-text-secondary text-xs mt-0.5">
                  {contact.description}
                </p>
              </div>
              <a
                href={`tel:${contact.number}`}
                onClick={(e) => handlePhoneClick(e, contact.number)}
                className={`${contact.colorScheme.text} hover:text-emergency-text font-bold text-base whitespace-nowrap flex-shrink-0 transition-colors`}
                aria-label={`Call ${contact.title} at ${contact.displayNumber}`}
              >
                {contact.displayNumber}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

