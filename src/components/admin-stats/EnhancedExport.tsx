import React, { useState } from 'react';
import { Download, Share2, Link as LinkIcon, Mail, Copy, Check, FileText, Image as ImageIcon } from 'lucide-react';

interface EnhancedExportProps {
  onExportCSV: () => void;
  onExportImage?: () => void;
  onGenerateLink?: () => Promise<string>;
  onShareEmail?: (email: string) => void;
}

export function EnhancedExport({
  onExportCSV,
  onExportImage,
  onGenerateLink,
  onShareEmail,
}: EnhancedExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shareMode, setShareMode] = useState<'export' | 'share'>('export');
  const [email, setEmail] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const handleGenerateLink = async () => {
    if (onGenerateLink) {
      const link = await onGenerateLink();
      setGeneratedLink(link);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleShareEmail = () => {
    if (email && onShareEmail) {
      onShareEmail(email);
      setEmail('');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
      >
        <Download className="h-4 w-4 mr-2" />
        Export & Share
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          {/* Mode Selector */}
          <div className="border-b border-gray-200 p-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShareMode('export')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  shareMode === 'export'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Download className="h-4 w-4 inline mr-1" />
                Export
              </button>
              <button
                onClick={() => setShareMode('share')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  shareMode === 'share'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Share2 className="h-4 w-4 inline mr-1" />
                Share
              </button>
            </div>
          </div>

          {/* Export Mode */}
          {shareMode === 'export' && (
            <div className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Export Dashboard</h4>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onExportCSV();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">CSV Spreadsheet</p>
                    <p className="text-xs text-gray-500">Excel compatible data export</p>
                  </div>
                </button>


                {onExportImage && (
                  <button
                    onClick={() => {
                      onExportImage();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <ImageIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Dashboard Screenshot</p>
                      <p className="text-xs text-gray-500">PNG image for presentations</p>
                    </div>
                  </button>
                )}
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 All exports include current filters and time range settings
                </p>
              </div>
            </div>
          )}

          {/* Share Mode */}
          {shareMode === 'share' && (
            <div className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Share Dashboard</h4>
              
              {/* Generate Link */}
              {onGenerateLink && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Shareable Link
                  </label>
                  {!generatedLink ? (
                    <button
                      onClick={handleGenerateLink}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600"
                    >
                      <LinkIcon className="h-4 w-4" />
                      Generate Dashboard Link
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={generatedLink}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-xs text-gray-600"
                        />
                        <button
                          onClick={handleCopyLink}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          title="Copy link"
                        >
                          {linkCopied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Link expires in 7 days • Read-only access
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Email Share */}
              {onShareEmail && (
                <div>
                  <label htmlFor="share-email" className="block text-xs font-medium text-gray-700 mb-2">
                    Share via Email
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="share-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      onClick={handleShareEmail}
                      disabled={!email}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Send email"
                    >
                      <Mail className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Send dashboard snapshot and link to email
                  </p>
                </div>
              )}

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-700">
                  ⚠️ Shared links include current dashboard state. Recipients need appropriate permissions.
                </p>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="border-t border-gray-200 p-3">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

