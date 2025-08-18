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
      <div key={reply.id} className="space-y-3">
        <div 
          className={`p-3 bg-gray-50 rounded-lg border-l-2 border-gray-200`}
          style={{ marginLeft: `${Math.min(depth * 24, 120)}px` }}
        >
          <div className="flex items-start gap-2">
            <img
              className="h-6 w-6 rounded-full object-cover border border-gray-200"
              src={reply.user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.user.username)}`}
              alt={reply.user.username}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{reply.user.username}</span>
                <span className="text-xs text-gray-500">
                  {new Date(reply.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
              
              {/* Reply Actions */}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => onLike(reply.id)}
                  disabled={likeLoading[reply.id]}
                  className={`flex items-center gap-1 text-xs transition-colors ${reply.is_liked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                >
                  {likeLoading[reply.id] ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Heart className={`h-3 w-3 ${reply.is_liked ? 'fill-current' : ''}`} />
                  )}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      const event = new CustomEvent('open-like-details', {
                        detail: { type: 'reply', id: reply.id }
                      });
                      window.dispatchEvent(event);
                    }}
                    className={(reply.likes_count ?? 0) > 0 ? 'cursor-pointer' : ''}
                  >
                    {reply.likes_count ?? 0}
                  </span>
                </button>
                
                <button
                  onClick={() => toggleReplyForm(reply.id)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Reply className="h-3 w-3" />
                  <span>Reply</span>
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
