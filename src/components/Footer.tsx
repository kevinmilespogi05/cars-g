import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Mail, 
  MapPin, 
  Clock, 
  Facebook, 
  ExternalLink,
  Phone,
  Building2
} from 'lucide-react';

// LGU Footer details – update these to your LGU specifics
const LGU_NAME = 'Castillejos Local Government Unit';
const LGU_ADDRESS = 'Municipal Building, San Juan, Castillejos, Zambales, 2208, Philippines';
const LGU_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=100086396687833';
const LGU_GOOGLE_MAPS_URL = 'https://maps.google.com/?q=Municipal+Building,+San+Juan,+Castillejos,+Zambales,+2208,+Philippines';
const LGU_EMAIL = 'mayorsoffice.jdk2022@gmail.com';
const LGU_OFFICE_HOURS = 'Monday–Friday, 8:00 AM – 5:00 PM';
const LGU_PHONE = '+63 (047) 123-4567';

export function Footer() {
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

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* LGU Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-3">
              <Building2 className="h-6 w-6 text-blue-400 mr-2" />
              <h3 className="text-lg font-bold text-white">{LGU_NAME}</h3>
            </div>
            <p className="text-gray-300 text-sm mb-3 leading-relaxed">
              Committed to serving our community with transparency, efficiency, and dedication. 
              Your voice matters, and we're here to listen and act.
            </p>
            <div className="flex items-center gap-4">
              <a
                href={LGU_FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors text-sm"
              >
                <Facebook className="h-4 w-4" />
                <span>Follow us on Facebook</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-base font-semibold text-white mb-3">Contact Us</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">Email</p>
                  <a 
                    href={`mailto:${LGU_EMAIL}`}
                    className="text-blue-400 hover:text-blue-300 transition-colors text-xs"
                  >
                    {LGU_EMAIL}
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">Phone</p>
                  <a 
                    href={`tel:${LGU_PHONE}`}
                    onClick={(e) => handlePhoneClick(e, LGU_PHONE)}
                    className="text-blue-400 hover:text-blue-300 transition-colors text-xs"
                  >
                    {LGU_PHONE}
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">Address</p>
                  <a 
                    href={LGU_GOOGLE_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors text-xs flex items-center gap-1"
                  >
                    {LGU_ADDRESS}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Office Hours */}
          <div>
            <h4 className="text-base font-semibold text-white mb-3">Office Hours</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-400 text-xs">Regular Hours</p>
                  <p className="text-white text-xs font-medium">{LGU_OFFICE_HOURS}</p>
                </div>
              </div>
              
              <div className="mt-2">
                <p className="text-gray-400 text-xs mb-1">Emergency Services</p>
                <div className="space-y-0.5">
                  <p className="text-red-400 text-xs font-medium">24/7 Available</p>
                  <p className="text-gray-500 text-xs">For urgent matters and emergencies</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 mt-6 pt-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-gray-400 text-xs">
              © {new Date().getFullYear()} {LGU_NAME}. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-xs">
              <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link to="/accessibility" className="text-gray-400 hover:text-white transition-colors">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
