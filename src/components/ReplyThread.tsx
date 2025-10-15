import React, { useState } from 'react';
import { Heart, Reply, Loader2 } from 'lucide-react';
import { CommentReply } from '../types';

interface ReplyThreadProps {
  replies: CommentReply[];
  commentId: string;
  onLike: (replyId: string) => void;
  onReply: (replyId: string, commentId: string) => void;
  likeLoading: { [key: string]: boolean };
  nestedReplyForms: { [key: string]: { content: string; submitting: boolean } };
  setNestedReplyForms: React.Dispatch<React.SetStateAction<{ [key: string]: { content: string; submitting: boolean } }>>;
  onShowLikeDetails?: (replyId: string, username: string) => void;
  maxDepth?: number;
}

export function ReplyThread({ 
  replies, 
  commentId, 
  onLike, 
  onReply, 
  likeLoading, 
  nestedReplyForms, 
  setNestedReplyForms,
  onShowLikeDetails,
  maxDepth = 5 
}: ReplyThreadProps) {
  const [expandedReplies, setExpandedReplies] = useState<{ [key: string]: boolean }>({});

  const toggleReplyForm = (replyId: string) => {
    setNestedReplyForms(prev => {
      if (prev[replyId]) {
        const newState = { ...prev };
        delete newState[replyId];
        return newState;
      } else {
        return {
          ...prev,
          [replyId]: { content: '', submitting: false }
        };
      }
    });
  };

  const handleReplyInputChange = (replyId: string, content: string) => {
    setNestedReplyForms(prev => ({
      ...prev,
      [replyId]: { 
        content, 
        submitting: prev[replyId]?.submitting || false 
      }
    }));
  };

  const renderReply = (reply: CommentReply, depth: number = 0): React.ReactNode => {
    // Safety check for malformed reply data
    if (!reply || !reply.id || !reply.content) {
      console.warn('Malformed reply data:', reply);
      return null;
    }

    if (depth > maxDepth) {
      return (
        <div className="ml-6 p-2 text-xs text-gray-500 italic">
          Maximum reply depth reached
        </div>
      );
    }

    const hasNestedReplies = reply.replies && reply.replies.length > 0;
    const isExpanded = expandedReplies[reply.id];

    return (
      <div key={reply.id} className="space-y-2">
        <div 
          className="flex gap-2"
          style={{ marginLeft: `${Math.min(depth * 20, 100)}px` }}
        >
          <img
            className="h-7 w-7 rounded-full object-cover flex-shrink-0"
            src={reply.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user.username)}`}
            alt={reply.user.username}
          />
          <div className="flex-1 min-w-0">
            <div className="inline-block bg-gray-100 rounded-2xl px-3 py-1.5">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[13px] font-semibold text-gray-900">{reply.user.username}</span>
              </div>
              <p className="text-[13px] leading-relaxed text-gray-900 whitespace-pre-wrap">{reply.content}</p>
            </div>
            
            {/* Reply Actions - Facebook style */}
            <div className="flex items-center gap-3 mt-1 px-3">
              <span className="text-[11px] text-gray-500">
                {new Date(reply.created_at).toLocaleString('en-US', { 
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric', 
                  minute: '2-digit' 
                })}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onLike(reply.id)}
                  disabled={likeLoading[reply.id]}
                  className={`text-[12px] font-semibold flex items-center gap-1 ${reply.is_liked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'} transition-colors`}
                >
                  {likeLoading[reply.id] ? (
                    <Loader2 className="h-3 w-3 animate-spin inline" />
                  ) : (
                    <>
                      <Heart className={`h-3 w-3 ${reply.is_liked ? 'fill-current' : ''}`} />
                      <span>Like</span>
                    </>
                  )}
                </button>
                {reply.likes_count > 0 && onShowLikeDetails && (
                  <button
                    onClick={() => onShowLikeDetails(reply.id, reply.user.username)}
                    className="text-[12px] font-semibold text-red-600 hover:underline cursor-pointer"
                  >
                    {reply.likes_count}
                  </button>
                )}
              </div>
                
              <button
                onClick={() => toggleReplyForm(reply.id)}
                className="text-[12px] font-semibold text-gray-600 hover:text-gray-800 transition-colors"
              >
                Reply
              </button>
            </div>

            {/* Nested Reply Form */}
            {nestedReplyForms[reply.id] && (
              <div className="mt-3 p-2 bg-white rounded border">
                <textarea
                  value={nestedReplyForms[reply.id]?.content || ''}
                  onChange={(e) => handleReplyInputChange(reply.id, e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white text-gray-900 placeholder-gray-400 resize-none"
                  rows={2}
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    onClick={() => toggleReplyForm(reply.id)}
                    className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onReply(reply.id, commentId)}
                    disabled={nestedReplyForms[reply.id]?.submitting || !nestedReplyForms[reply.id]?.content?.trim()}
                    className="px-2 py-1 bg-primary-color text-white text-xs rounded hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {nestedReplyForms[reply.id]?.submitting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Reply'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nested Replies */}
        {hasNestedReplies && (
          <div className="space-y-2">
            {depth < maxDepth && (
              <button
                onClick={() => setExpandedReplies(prev => ({ ...prev, [reply.id]: !prev[reply.id] }))}
                className="ml-6 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {isExpanded ? 'Hide replies' : `Show ${reply.replies!.length} reply${reply.replies!.length !== 1 ? 's' : ''}`}
              </button>
            )}
            
                         {isExpanded && reply.replies && (
               <div className="space-y-2">
                 {reply.replies.filter(nestedReply => nestedReply && nestedReply.id && nestedReply.content).map(nestedReply => 
                   renderReply(nestedReply, depth + 1)
                 )}
               </div>
             )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {replies?.filter(reply => reply && reply.id && reply.content).map(reply => renderReply(reply, 0))}
    </div>
  );
}
