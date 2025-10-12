import React from 'react';
import { Building2, Mail, Clock, Facebook, MapPin, ExternalLink } from 'lucide-react';

/**
 * LGUInfo Component
 * 
 * Displays comprehensive Local Government Unit (LGU) information including:
 * - LGU name and address
 * - Contact email
 * - Office hours
 * - Links to Facebook page and Google Maps location
 * 
 * Customization:
 * - Update the LGU constants below to match your local government unit
 * - Modify the color scheme via Tailwind classes
 * - Add additional contact methods or information sections as needed
 */

// LGU Constants - Update these to match your Local Government Unit
const LGU_NAME = 'Castillejos Local Government Unit';
const LGU_ADDRESS = 'Municipal Building, San Juan, Castillejos, Zambales, 2208, Philippines';
const LGU_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=100086396687833';
const LGU_GOOGLE_MAPS_URL = 'https://maps.google.com/?q=Municipal+Building,+San+Juan,+Castillejos,+Zambales,+2208,+Philippines';
const LGU_EMAIL = 'mayorsoffice.jdk2022@gmail.com';
const LGU_OFFICE_HOURS = 'Monday–Friday, 8:00 AM – 5:00 PM';

export function LGUInfo() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="h-5 w-5 text-blue-600" />
        <h3 className="text-base font-semibold text-gray-900">
          Local Government Unit
        </h3>
      </div>

      {/* LGU Name */}
      <div className="mb-4">
        <h4 className="text-sm font-bold text-gray-900 mb-2">
          {LGU_NAME}
        </h4>
        <div className="flex items-start gap-2 text-xs text-gray-600">
          <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
          <p className="leading-relaxed">{LGU_ADDRESS}</p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-3"></div>

      {/* Contact Information */}
      <div className="space-y-2.5">
        {/* Email */}
        <div className="flex items-start gap-2">
          <Mail className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">
              Email
            </p>
            <a
              href={`mailto:${LGU_EMAIL}`}
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline break-all"
              aria-label={`Send email to ${LGU_EMAIL}`}
            >
              {LGU_EMAIL}
            </a>
          </div>
        </div>

        {/* Office Hours */}
        <div className="flex items-start gap-2">
          <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
          <div className="flex-1">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-0.5">
              Office Hours
            </p>
            <p className="text-xs text-gray-700">
              {LGU_OFFICE_HOURS}
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-3"></div>

      {/* External Links */}
      <div className="space-y-2">
        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-2">
          Quick Links
        </p>
        
        {/* Facebook Link */}
        <a
          href={LGU_FACEBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all duration-200 group"
          aria-label="Visit LGU Facebook page (opens in new tab)"
        >
          <Facebook className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
          <span className="text-xs font-medium text-blue-700 flex-1">
            Facebook Page
          </span>
          <ExternalLink className="h-3 w-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </a>

        {/* Google Maps Link */}
        <a
          href={LGU_GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-2.5 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-all duration-200 group"
          aria-label="View LGU location on Google Maps (opens in new tab)"
        >
          <MapPin className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
          <span className="text-xs font-medium text-green-700 flex-1">
            Google Maps
          </span>
          <ExternalLink className="h-3 w-3 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </a>
      </div>
    </div>
  );
}

