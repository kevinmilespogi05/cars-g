import React, { useState, useEffect } from 'react';
import { X, Heart, User } from 'lucide-react';
import { LikeDetail } from '../types';
import { reportsService } from '../services/reportsService';

interface LikeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId?: string;
  reportTitle?: string;
  commentId?: string;
  replyId?: string;
  contextLabel?: string;
}

export function LikeDetailsModal({ isOpen, onClose, reportId, reportTitle, commentId, replyId, contextLabel }: LikeDetailsModalProps) {
  const [likeDetails, setLikeDetails] = useState<LikeDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchLikeDetails();
  }, [isOpen, reportId, commentId, replyId]);

  const fetchLikeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      let details: LikeDetail[] = [];
      if (reportId) {
        details = await reportsService.getLikeDetails(reportId);
      } else if (commentId) {
        details = await reportsService.getCommentLikeDetails(commentId);
      } else if (replyId) {
        details = await reportsService.getReplyLikeDetails(replyId);
      }
      setLikeDetails(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch like details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Likes</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {contextLabel && (
            <p className="text-sm text-gray-600 mb-4">{contextLabel}</p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-color"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm">{error}</p>
              <button
                onClick={fetchLikeDetails}
                className="mt-2 text-primary-color hover:text-primary-dark text-sm underline"
              >
                Try again
              </button>
            </div>
          ) : likeDetails.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No likes yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {likeDetails.map((like) => (
                <div key={like.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0">
                    {like.user.avatar_url ? (
                      <img
                        src={like.user.avatar_url}
                        alt={like.user.username}
                        className="h-8 w-8 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {like.user.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(like.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
