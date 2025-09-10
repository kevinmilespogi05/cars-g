import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { Report } from '../types';
import { reportsService } from '../services/reportsService';

const steps = ['Details', 'Location', 'Preview'];

export function SampleCaseFlow() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState<Report['priority']>('medium');
  const [location_address, setLocationAddress] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const next = () => setStep(s => Math.min(steps.length - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload: any = {
        title,
        description,
        category,
        priority,
        location_lat: lat ? Number(lat) : undefined,
        location_lng: lng ? Number(lng) : undefined,
        location_address,
        images: [],
      };
      const created = await reportsService.createReport(payload);
      setSubmittedId(created.id);
      setStep(steps.length - 1);
    } catch (e: any) {
      alert(e?.message || 'Failed to create case');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className={`flex items-center gap-2 text-sm ${i <= step ? 'text-blue-700' : 'text-gray-500'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${i <= step ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300'}`}>{i+1}</div>
            <span>{s}</span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" placeholder="Brief title" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded" placeholder="Describe the issue" />
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Category</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border border-gray-300 rounded" placeholder="e.g., Waste" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="px-3 py-2 border border-gray-300 rounded">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Address</label>
            <input value={location_address} onChange={(e) => setLocationAddress(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" placeholder="123 Street, City" />
          </div>
          <div className="flex gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Latitude</label>
              <input value={lat} onChange={(e) => setLat(e.target.value)} className="px-3 py-2 border border-gray-300 rounded" placeholder="14.123" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Longitude</label>
              <input value={lng} onChange={(e) => setLng(e.target.value)} className="px-3 py-2 border border-gray-300 rounded" placeholder="121.123" />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {submittedId ? (
            <div className="p-4 border rounded bg-green-50 text-green-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Case created successfully. ID: {submittedId}
            </div>
          ) : (
            <div className="p-4 border rounded bg-gray-50 text-gray-800">
              <div className="font-medium">Review</div>
              <div className="text-sm mt-2">
                <div><strong>Title:</strong> {title || '—'}</div>
                <div><strong>Description:</strong> {description || '—'}</div>
                <div><strong>Category:</strong> {category || '—'}</div>
                <div><strong>Priority:</strong> {priority}</div>
                <div><strong>Address:</strong> {location_address || '—'}</div>
                <div><strong>Lat/Lng:</strong> {lat || '—'}, {lng || '—'}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={prev} disabled={step === 0} className="px-3 py-1.5 border border-gray-300 rounded text-sm inline-flex items-center gap-1 disabled:opacity-50">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        {step < steps.length - 1 && (
          <button onClick={next} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm inline-flex items-center gap-1">
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        {step === steps.length - 1 && !submittedId && (
          <button onClick={submit} disabled={submitting || !title.trim() || !description.trim()} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm inline-flex items-center gap-1 disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit Case'}
          </button>
        )}
      </div>
    </div>
  );
}
