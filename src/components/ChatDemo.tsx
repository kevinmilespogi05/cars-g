import React, { useState } from 'react';
import { ChatConversation, ChatMessage } from '../types';
import { MessageCircleIcon, UsersIcon, ZapIcon } from 'lucide-react';

interface ChatDemoProps {
  onStartChat: () => void;
}

export const ChatDemo: React.FC<ChatDemoProps> = ({ onStartChat }) => {
  const [activeFeature, setActiveFeature] = useState<'realtime' | 'secure' | 'responsive'>('realtime');

  const features = [
    {
      id: 'realtime',
      icon: ZapIcon,
      title: 'Real-Time Messaging',
      description: 'Instant message delivery using WebSocket technology',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'secure',
      icon: UsersIcon,
      title: 'Secure & Private',
      description: 'End-to-end conversation privacy with user authentication',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'responsive',
      icon: MessageCircleIcon,
      title: 'Mobile First',
      description: 'Optimized for all devices with responsive design',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-20">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
            <MessageCircleIcon size={40} className="text-blue-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Real-Time Chat
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Experience instant messaging with modern WebSocket technology. 
            Connect with other users in real-time with typing indicators, 
            message history, and more.
          </p>
          <button
            onClick={onStartChat}
            className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <MessageCircleIcon size={24} className="mr-2" />
            Start Chatting Now
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                onClick={() => setActiveFeature(feature.id as any)}
                className={`p-6 rounded-xl cursor-pointer transition-all duration-300 ${
                  activeFeature === feature.id 
                    ? 'transform scale-105 shadow-xl' 
                    : 'hover:scale-105 hover:shadow-lg'
                } ${feature.bgColor} border-2 ${
                  activeFeature === feature.id 
                    ? 'border-blue-300' 
                    : 'border-transparent'
                }`}
              >
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4 ${feature.bgColor}`}>
                  <Icon size={24} className={feature.color} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Demo Chat Preview */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Chat Preview</h3>
            <p className="text-sm text-gray-600">See how the chat interface looks</p>
          </div>
          
          <div className="p-6 bg-gray-50 min-h-[400px]">
            <div className="max-w-md mx-auto space-y-4">
              {/* Sample Messages */}
              <div className="flex justify-start">
                <div className="max-w-xs">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 text-xs font-semibold">U</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">User ABC123</span>
                  </div>
                  <div className="bg-white text-gray-900 p-3 rounded-lg rounded-bl-md border border-gray-200 shadow-sm">
                    <p className="text-sm">Hey! How's the Cars-G app working for you?</p>
                    <div className="text-xs mt-2 text-gray-500">2 minutes ago</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="max-w-xs">
                  <div className="bg-blue-500 text-white p-3 rounded-lg rounded-br-md shadow-sm">
                    <p className="text-sm">It's amazing! The real-time chat feature is working perfectly! 🚀</p>
                    <div className="text-xs mt-2 text-white/80">1 minute ago</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-xs">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 text-xs font-semibold">U</span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">User ABC123</span>
                  </div>
                  <div className="bg-white text-gray-900 p-3 rounded-lg rounded-bl-md border border-gray-200 shadow-sm">
                    <p className="text-sm">That's great to hear! The WebSocket implementation is really smooth.</p>
                    <div className="text-xs mt-2 text-gray-500">just now</div>
                  </div>
                </div>
              </div>

              {/* Typing Indicator */}
              <div className="flex justify-start">
                <div className="bg-white text-gray-600 px-3 py-2 rounded-lg text-sm border border-gray-200 shadow-sm">
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  User ABC123 typing...
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Start Chatting?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join the conversation and experience real-time messaging today!
          </p>
          <button
            onClick={onStartChat}
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 hover:scale-105 shadow-lg"
          >
            <MessageCircleIcon size={24} className="mr-2" />
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}; 