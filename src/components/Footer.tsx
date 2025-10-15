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
    <footer className="bg-gray-900 text-white relative z-[5]">
      <div className="w-full px-2 sm:px-6 lg:px-8 py-1">
        <div className="max-w-7xl mx-auto pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* LGU Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center mb-3">
                <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center mr-3">
                  <Building2 className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-base font-bold text-white">{LGU_NAME}</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed max-w-md">
                Committed to serving our community with transparency, efficiency, and dedication. 
                Your voice matters, and we're here to listen and act.
              </p>
              <a
                href={LGU_FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors text-sm group"
              >
                <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Facebook className="h-4 w-4" />
                </div>
                <span className="font-medium">Follow us on Facebook</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-gray-500 text-xs font-medium mb-0.5">Email</p>
                  <a 
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${LGU_EMAIL}&su=Contact%20from%20CARS-G%20App&body=Hello,%0A%0AI%20am%20contacting%20you%20through%20the%20CARS-G%20community%20safety%20app.%0A%0A`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-blue-400 transition-colors text-xs break-all"
                    title="Open Gmail to compose email"
                  >
                    {LGU_EMAIL}
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-medium mb-0.5">Phone</p>
                  <a 
                    href={`tel:${LGU_PHONE}`}
                    onClick={(e) => handlePhoneClick(e, LGU_PHONE)}
                    className="text-gray-300 hover:text-blue-400 transition-colors text-xs"
                  >
                    {LGU_PHONE}
                  </a>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-4 w-4 text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-gray-500 text-xs font-medium mb-0.5">Address</p>
                  <a 
                    href={LGU_GOOGLE_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-blue-400 transition-colors text-xs inline-flex items-center gap-1"
                  >
                    <span className="line-clamp-2">{LGU_ADDRESS}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Office Hours */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Office Hours</h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-medium mb-0.5">Regular Hours</p>
                  <p className="text-gray-300 text-xs font-medium">{LGU_OFFICE_HOURS}</p>
                </div>
              </div>
              
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="h-5 w-5 bg-red-500/20 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                  <div>
                    <p className="text-red-400 text-xs font-bold mb-0.5">Emergency Services</p>
                    <p className="text-red-300/80 text-xs">24/7 Available</p>
                    <p className="text-gray-400 text-xs mt-1">For urgent matters</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
          {/* Bottom Section */}
          <div className="border-t border-gray-800 mt-6 pt-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-gray-500 text-xs text-center md:text-left">
              <span className="font-medium">© {new Date().getFullYear()} {LGU_NAME}.</span>
              <span className="ml-1">All rights reserved.</span>
            </div>
            <div className="flex items-center gap-5 text-xs">
              <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors font-medium">
                Privacy Policy
              </Link>
              <span className="text-gray-700">•</span>
              <Link to="/terms" className="text-gray-400 hover:text-white transition-colors font-medium">
                Terms of Service
              </Link>
              <span className="text-gray-700">•</span>
              <Link to="/accessibility" className="text-gray-400 hover:text-white transition-colors font-medium">
                Accessibility
              </Link>
            </div>
          </div>
        </div>
        </div>
      </div>
    </footer>
  );
}
