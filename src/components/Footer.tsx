import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Mail, 
  MapPin, 
  Clock, 
  Facebook, 
  ExternalLink,
  Phone,
  Building2,
  AlertCircle
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

  // We intentionally avoid shifting the footer using sidebar offsets so it spans full width.
  const footerStyle: React.CSSProperties = {
    width: '100%',
  };

  // Handle phone click for desktop vs mobile
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

  return (
    <footer 
      className="bg-gray-900 text-white relative z-[5] w-full border-t border-gray-800"
      style={footerStyle}
      role="contentinfo"
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-12 mb-8">
          
          {/* LGU Info Section */}
          <nav className="lg:col-span-4" aria-label="LGU Information">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-bold text-white">{LGU_NAME}</h2>
            </div>
            
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Committed to serving our community with transparency, efficiency, and dedication. 
              Your voice matters, and we're here to listen and act.
            </p>
            
            <div className="space-y-3">
              <a
                href={LGU_FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors duration-200 text-sm group"
                aria-label="Follow us on Facebook (opens in new window)"
              >
                <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors duration-200">
                  <Facebook className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="font-medium">Follow on Facebook</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>

          </nav>

          {/* Contact Information Section */}
          <section className="lg:col-span-3 lg:border-l lg:border-gray-800/60 lg:pl-8" aria-label="Contact Information">
            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wide">Contact Us</h3>
            <div className="space-y-4">
              
              {/* Email */}
              <div className="flex items-start gap-3 group">
                <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors duration-200">
                  <Mail className="h-4 w-4 text-blue-400" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Email</p>
                  <a 
                    href={`mailto:${LGU_EMAIL}`}
                    className="text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm break-all"
                    title={`Email: ${LGU_EMAIL}`}
                  >
                    {LGU_EMAIL}
                  </a>
                </div>
              </div>
              
              {/* Phone */}
              <div className="flex items-start gap-3 group">
                <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors duration-200">
                  <Phone className="h-4 w-4 text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Phone</p>
                  <a 
                    href={`tel:${LGU_PHONE}`}
                    onClick={(e) => handlePhoneClick(e, LGU_PHONE)}
                    className="text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm font-medium"
                    title={`Phone: ${LGU_PHONE}`}
                  >
                    {LGU_PHONE}
                  </a>
                </div>
              </div>
              
              {/* Address */}
              <div className="flex items-start gap-3 group">
                <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors duration-200">
                  <MapPin className="h-4 w-4 text-blue-400 flex-shrink-0" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Address</p>
                  <a 
                    href={LGU_GOOGLE_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm inline-flex items-center gap-1"
                    title="View on Google Maps (opens in new window)"
                  >
                    <span className="line-clamp-3">{LGU_ADDRESS}</span>
                    <ExternalLink className="h-3 w-3 flex-shrink-0 mt-px" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>

          </section>

          {/* Office Hours & Emergency Section */}
          <section className="lg:col-span-3 lg:border-l lg:border-gray-800/60 lg:pl-8" aria-label="Office Hours">
            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wide">Office Hours</h3>
            <div className="space-y-4">
              
              {/* Regular Hours */}
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="h-4 w-4 text-blue-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-gray-500 text-xs font-medium mb-1 uppercase tracking-wide">Regular Hours</p>
                  <p className="text-gray-300 text-sm font-medium leading-relaxed">{LGU_OFFICE_HOURS}</p>
                </div>
              </div>
              
              {/* Emergency Services Alert */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 transition-colors duration-200 hover:bg-red-500/15 hover:border-red-500/30">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
                    <AlertCircle className="h-3 w-3 text-red-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-red-300 text-xs font-bold mb-1 uppercase">Emergency Services</p>
                    <p className="text-red-300/90 text-sm font-semibold">24/7 Available</p>
                    <p className="text-gray-400 text-xs mt-1">For urgent matters</p>
                  </div>
                </div>
              </div>
            </div>

          </section>

          {/* Quick Navigation Section */}
          <nav className="lg:col-span-2 lg:border-l lg:border-gray-800/60 lg:pl-8" aria-label="Quick Navigation">
            <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wide">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                  <Link 
                    to="/privacy-policy" 
                    className="text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Privacy Policy
                  </Link>
              </li>
              <li>
                  <Link 
                    to="/terms-of-service" 
                    className="text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Terms of Service
                  </Link>
              </li>
              <li>
                <a 
                  href="#accessibility" 
                  className="text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Accessibility
                </a>
              </li>
              <li>
                <a 
                  href="#sitemap" 
                  className="text-gray-400 hover:text-blue-400 transition-colors duration-200 text-sm font-medium"
                >
                  Sitemap
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-8" role="presentation"></div>

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-gray-500 text-center sm:text-left text-xs">
            <p className="font-medium">
              © {new Date().getFullYear()} {LGU_NAME}. All rights reserved.
            </p>
            <p className="text-gray-600 mt-1">Making communities safer, one report at a time.</p>
          </div>
          
          <div className="flex items-center gap-4 text-xs flex-wrap justify-center sm:justify-end">
            <Link to="/privacy-policy" className="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Privacy</Link>
            <span className="text-gray-700" aria-hidden="true">•</span>
            <Link to="/terms-of-service" className="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Terms</Link>
            <span className="text-gray-700" aria-hidden="true">•</span>
            <a href="#cookies" className="text-gray-300 hover:text-blue-400 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cookies</a>
          </div>
        </div>

        {/* Back to Top Button (hidden, can be shown on scroll) */}
        <div className="mt-8 pt-4 border-t border-gray-800/50 text-center">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-gray-400 hover:text-blue-400 transition-colors duration-200 text-xs font-medium py-2 px-3 rounded-lg hover:bg-gray-800/50"
            aria-label="Return to top of page"
          >
            ↑ Back to Top
          </button>
        </div>
      </div>
    </footer>
  );
}
