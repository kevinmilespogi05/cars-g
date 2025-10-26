import React, { useState } from 'react';
import { 
  Shield, 
  Phone, 
  Heart, 
  ShieldCheck, 
  Flame, 
  AlertTriangle, 
  Stethoscope,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/**
 * MainEmergencyContacts Component
 * 
 * Enhanced emergency contacts section for the main content area.
 * Features categorized contacts with modern card design, collapsible sections,
 * and mobile-optimized clickable phone numbers.
 */

interface EmergencyContact {
  id: string;
  title: string;
  description: string;
  number: string;
  displayNumber: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  priority: 'high' | 'medium' | 'low';
}

interface ContactCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function MainEmergencyContacts() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['national-emergency', 'medical', 'police'])
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Handler for telephone links
  const handlePhoneClick = (e: React.MouseEvent<HTMLAnchorElement>, phoneNumber: string) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (!isMobile) {
      e.preventDefault();
      navigator.clipboard.writeText(phoneNumber).then(() => {
        // You could replace this with a proper toast notification
        alert(`Phone number ${phoneNumber} copied to clipboard!`);
      }).catch(() => {
        alert(`Call: ${phoneNumber}`);
      });
    }
  };

  const categories: ContactCategory[] = [
    {
      id: 'national-emergency',
      name: 'National Emergency',
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      id: 'medical',
      name: 'Medical & Health',
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200'
    },
    {
      id: 'police',
      name: 'Police & Security',
      icon: ShieldCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'fire',
      name: 'Fire & Rescue',
      icon: Flame,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      id: 'disaster',
      name: 'Disaster Response',
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      id: 'health',
      name: 'Health Department',
      icon: Stethoscope,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  ];

  const contacts: EmergencyContact[] = [
    {
      id: 'national-emergency-911',
      title: 'National Emergency',
      description: 'For immediate assistance and all emergencies',
      number: '911',
      displayNumber: '911',
      category: 'national-emergency',
      icon: Shield,
      priority: 'high'
    },
    {
      id: 'red-cross',
      title: 'Red Cross',
      description: 'Medical emergencies and disaster relief',
      number: '143',
      displayNumber: '143',
      category: 'medical',
      icon: Heart,
      priority: 'high'
    },
    {
      id: 'police-direct',
      title: 'Police Direct',
      description: 'Direct police assistance line',
      number: '9117',
      displayNumber: '9117',
      category: 'police',
      icon: ShieldCheck,
      priority: 'high'
    },
    {
      id: 'fire-department',
      title: 'Fire Department',
      description: 'Fire emergencies and rescue services',
      number: '117',
      displayNumber: '117',
      category: 'fire',
      icon: Flame,
      priority: 'high'
    },
    {
      id: 'ndrrmc',
      title: 'NDRRMC',
      description: 'National Disaster Risk Reduction and Management Council',
      number: '0289115061',
      displayNumber: '(02) 8911-5061',
      category: 'disaster',
      icon: AlertTriangle,
      priority: 'medium'
    },
    {
      id: 'health-department',
      title: 'Health Department',
      description: 'Health emergencies and public health concerns',
      number: '0287111001',
      displayNumber: '(02) 8711-1001',
      category: 'health',
      icon: Stethoscope,
      priority: 'medium'
    }
  ];

  const getContactsByCategory = (categoryId: string) => {
    return contacts.filter(contact => contact.category === categoryId);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">High Priority</span>;
      case 'medium':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Medium Priority</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-red-50/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-red-100 overflow-hidden animate-fade-in">
      {/* Modern Header with Icon */}
      <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
            <span className="text-2xl">🚨</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Emergency Contacts</h2>
            <p className="text-xs text-red-100">Quick access to essential services</p>
          </div>
        </div>
      </div>

      <div className="p-6">

      {/* Categories */}
      <div className="space-y-4">
        {categories.map((category) => {
          const categoryContacts = getContactsByCategory(category.id);
          const isExpanded = expandedCategories.has(category.id);
          
          if (categoryContacts.length === 0) return null;

          return (
            <div key={category.id} className={`${category.bgColor} ${category.borderColor} border-2 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300`}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/60 transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <category.icon className={`h-6 w-6 ${category.color}`} />
                  <span className={`font-bold text-base ${category.color}`}>{category.name}</span>
                  <span className="text-xs font-semibold text-gray-600 bg-white/80 px-2.5 py-1 rounded-full shadow-sm">
                    {categoryContacts.length} contact{categoryContacts.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {/* Category Contacts */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {categoryContacts.map((contact) => (
                    <div key={contact.id} className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg border border-gray-200 hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="p-2.5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-sm">
                            <contact.icon className="h-5 w-5 text-gray-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <h3 className="font-bold text-gray-900 text-base">{contact.title}</h3>
                              {getPriorityBadge(contact.priority)}
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{contact.description}</p>
                          </div>
                        </div>
                        <a
                          href={`tel:${contact.number}`}
                          onClick={(e) => handlePhoneClick(e, contact.number)}
                          className="flex items-center gap-2 px-4 py-3 sm:px-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-bold text-sm whitespace-nowrap min-h-[48px] justify-center shadow-md hover:shadow-lg transform hover:scale-105"
                          aria-label={`Call ${contact.title} at ${contact.displayNumber}`}
                        >
                          <Phone className="h-4 w-4" />
                          <span className="hidden sm:inline">{contact.displayNumber}</span>
                          <span className="sm:hidden">{contact.number}</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Phone className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-bold text-blue-900 mb-2 text-base">Quick Access Tips</h4>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                On mobile devices, tap any number to call directly
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                On desktop, clicking a number copies it to your clipboard
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                <strong>For life-threatening emergencies, call 911 immediately</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
