import React from 'react';
import { motion } from 'framer-motion';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        className="w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
            <p>
              Welcome to Cars G. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you about how we look after your personal data when you visit our website 
              and tell you about your privacy rights and how the law protects you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Data We Collect</h2>
            <p>We collect and process the following data:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Account information (email, username, profile picture)</li>
              <li>Location data when submitting reports</li>
              <li>Report content and images</li>
              <li>Usage data and analytics</li>
              <li>Device information and IP address</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Data</h2>
            <p>We use your data for:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Providing and maintaining our service</li>
              <li>Processing and managing reports</li>
              <li>Improving our services</li>
              <li>Communicating with you about your account</li>
              <li>Ensuring platform security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Storage and Security</h2>
            <p>
              We use Supabase for data storage and authentication. Your data is protected using industry-standard 
              security measures. We implement appropriate technical and organizational security measures to protect 
              your personal data against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Supabase for database and authentication</li>
              <li>Google Maps for location services</li>
              <li>Facebook and Google for social login</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to data processing</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              Email: support@cars-g.com
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Updates to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by posting 
              the new privacy policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <div className="mt-8 text-sm text-gray-500">
            <p>Last Updated: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 