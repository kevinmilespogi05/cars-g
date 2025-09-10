import React from 'react';
import { SampleCaseFlow } from '../components/SampleCaseFlow';

export function SampleCaseFlowPage() {
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-3">Sample Case Creation</h1>
      <p className="text-sm text-gray-600 mb-4">Walk through a simple wizard to create a sample case.</p>
      <div className="bg-white border rounded p-4">
        <SampleCaseFlow />
      </div>
    </div>
  );
}


