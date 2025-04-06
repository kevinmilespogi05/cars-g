import React from 'react';
import { MapPin, Shield, Award } from 'lucide-react';

export function Home() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Community Assistance and Reporting System
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Make your community safer and better, one report at a time
        </p>
        
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-center mb-4">
              <MapPin className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Report Incidents</h3>
            <p className="text-gray-600">
              Easily report community issues with location tagging and photo uploads
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
            <p className="text-gray-600">
              Monitor the status of reported incidents and community responses
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-center mb-4">
              <Award className="h-12 w-12 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Earn Rewards</h3>
            <p className="text-gray-600">
              Get points and badges for your contributions to the community
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}