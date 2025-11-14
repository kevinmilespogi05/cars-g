import React from 'react';
import { Phone, Shield, Heart, ShieldCheck, AlertCircle } from 'lucide-react';
import { MobileBackToReports } from '../components/MobileBackToReports';

interface EmergencyContact {
  id: string;
  title: string;
  description: string;
  number: string;
  displayNumber: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  iconComponent: React.ComponentType<{ className?: string }>;
}

export function EmergencyContacts() {
  // Handler for telephone links
  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>, phoneNumber: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (!isMobile) {
      e.preventDefault();
      navigator.clipboard.writeText(phoneNumber).then(() => {
        alert(`Phone number ${phoneNumber} copied to clipboard!`);
      }).catch(() => {
        alert(`Call: ${phoneNumber}`);
      });
    }
  };

  const emergencyContacts: EmergencyContact[] = [
    {
      id: 'national-emergency-911',
      title: 'National Emergency',
      description: 'For immediate assistance and all emergencies',
      number: '911',
      displayNumber: '911',
      icon: '🚨',
      priority: 'high',
      iconComponent: Shield
    },
    {
      id: 'red-cross',
      title: 'Red Cross',
      description: 'Medical emergencies and disaster relief',
      number: '143',
      displayNumber: '143',
      icon: '❤️',
      priority: 'high',
      iconComponent: Heart
    },
    {
      id: 'police-direct',
      title: 'Police Direct',
      description: 'Direct police assistance line',
      number: '9117',
      displayNumber: '9117',
      icon: '👮',
      priority: 'high',
      iconComponent: ShieldCheck
    }
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            High Priority
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
            Medium Priority
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <MobileBackToReports />
      <div className="min-h-screen bg-primary-50/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header - Full Width */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
              <Phone className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Emergency Contacts
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mt-1">
                Quick access to essential emergency services and contacts
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner - Full Width */}
        <div className="mb-8 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-red-900 mb-2">
                Important Information
              </h2>
              <p className="text-sm text-red-800 leading-relaxed">
                For life-threatening emergencies, always call <strong className="font-bold">911</strong> immediately. 
                These numbers are available 24/7 and are free to call from any phone.
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Contacts Grid - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {emergencyContacts.map((contact) => {
            const IconComponent = contact.iconComponent;
            return (
              <article
                key={contact.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-red-300 overflow-hidden group"
                aria-labelledby={`contact-title-${contact.id}`}
              >
                {/* Card Header with Gradient */}
                <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                      <span className="text-3xl" role="img" aria-label={contact.title}>
                        {contact.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 
                        id={`contact-title-${contact.id}`}
                        className="text-xl font-bold text-white"
                      >
                        {contact.title}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  {/* Priority Badge */}
                  <div className="mb-4">
                    {getPriorityBadge(contact.priority)}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 leading-relaxed mb-6">
                    {contact.description}
                  </p>

                  {/* Phone Number Button */}
                  <a
                    href={`tel:${contact.number}`}
                    onClick={(e) => handlePhoneClick(e, contact.number)}
                    className="flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-bold text-lg shadow-md hover:shadow-lg transform hover:scale-105 group-hover:scale-105"
                    aria-label={`Call ${contact.title} at ${contact.displayNumber}`}
                  >
                    <Phone className="h-6 w-6" />
                    <span>{contact.displayNumber}</span>
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        {/* Quick Access Tips - Full Width */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 shadow-lg p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
              <Phone className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-blue-900 mb-4">
                Quick Access Tips
              </h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-blue-800">
                  <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></span>
                  <span className="leading-relaxed">
                    <strong className="font-semibold">On mobile devices:</strong> Tap any phone number to call directly
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-blue-800">
                  <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></span>
                  <span className="leading-relaxed">
                    <strong className="font-semibold">On desktop:</strong> Clicking a number copies it to your clipboard
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-red-800">
                  <span className="w-2 h-2 bg-red-600 rounded-full flex-shrink-0 mt-1.5"></span>
                  <span className="leading-relaxed">
                    <strong className="font-bold">For life-threatening emergencies:</strong> Call 911 immediately - available 24/7
                  </span>
                </li>
                <li className="flex items-start gap-3 text-sm text-blue-800">
                  <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5"></span>
                  <span className="leading-relaxed">
                    <strong className="font-semibold">Stay calm:</strong> Provide clear information about your location and the nature of the emergency
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Additional Resources Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="h-6 w-6 text-red-600" />
            Additional Emergency Resources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>Fire Department: <strong className="text-gray-900">117</strong></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>NDRRMC: <strong className="text-gray-900">(02) 8911-5061</strong></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>Health Department: <strong className="text-gray-900">(02) 8711-1001</strong></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span>Coast Guard: <strong className="text-gray-900">(02) 8527-8481</strong></span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
