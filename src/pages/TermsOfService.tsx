import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-red-800 hover:text-red-900 font-medium mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <div className="space-y-6 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using BANTAY SP (Bantay San Pablo), you accept and agree to be bound by the terms 
              and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. User Accounts</h2>
            <p>To use certain features of our platform, you must register for an account. You agree to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Submit false, misleading, or fraudulent reports</li>
              <li>Use the platform for any illegal purpose or to violate any laws</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Upload malicious code, viruses, or any harmful content</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service or servers</li>
              <li>Use the platform to spam or send unsolicited messages</li>
              <li>Impersonate any person or entity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Report Submission</h2>
            <p>When submitting reports through our platform:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>You grant us a license to use, display, and distribute your submitted content</li>
              <li>You confirm that you have the right to submit the content</li>
              <li>You understand that reports may be shared with local government units and authorities</li>
              <li>You agree that your reports should be factual and accurate to the best of your knowledge</li>
              <li>You may submit reports anonymously, but abuse of this feature may result in restrictions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Content Ownership</h2>
            <p>
              You retain ownership of the content you submit. However, by submitting content to BANTAY SP, you grant us a 
              worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display your content for the 
              purpose of operating and improving our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Points and Rewards</h2>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Points earned through the platform have no monetary value</li>
              <li>Points may be used for gamification and recognition purposes only</li>
              <li>We reserve the right to modify the points system at any time</li>
              <li>Points may be revoked for violations of these terms</li>
              <li>Anonymous reports do not earn points</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Privacy and Data Protection</h2>
            <p>
              Your privacy is important to us. Please review our{' '}
              <Link to="/privacy-policy" className="text-red-800 hover:text-red-900 font-semibold hover:underline">
                Privacy Policy
              </Link>
              {' '}to understand how we collect, use, and protect your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account at any time, with or without notice, for any reason, 
              including but not limited to violation of these Terms of Service. Upon termination, your right to use the 
              service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Disclaimer of Warranties</h2>
            <p>
              BANTAY SP is provided "as is" and "as available" without warranties of any kind, either express or implied. 
              We do not warrant that the service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, BANTAY SP shall not be liable for any indirect, incidental, special, 
              consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, 
              or any loss of data, use, goodwill, or other intangible losses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Modifications to Terms</h2>
            <p>
              We reserve the right to modify or replace these Terms of Service at any time. If a revision is material, 
              we will provide at least 30 days' notice prior to any new terms taking effect. Your continued use of the 
              service after any changes constitutes acceptance of those changes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of the Philippines, without regard 
              to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <ul className="list-none mt-2 space-y-1">
              <li><strong>Email:</strong> support@cars-g.com</li>
              <li><strong>Local Government Unit:</strong> Castillejos, Zambales</li>
            </ul>
          </section>

          <section className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              <strong>Last Updated:</strong> October 14, 2025
            </p>
            <p className="text-sm text-gray-500 mt-2">
              By using BANTAY SP, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </section>
        </div>

        {/* Back to Top Button */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-red-800 hover:text-red-900 font-medium transition-colors"
          >
            ↑ Back to Top
          </button>
        </div>
      </motion.div>
    </div>
  );
}

