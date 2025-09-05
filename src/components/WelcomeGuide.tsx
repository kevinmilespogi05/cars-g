import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Shield, MapPin, Award, MessageCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WelcomeGuideProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
}

const getSteps = (userRole?: string) => {
  if (userRole === 'admin') {
    return [
      {
        id: 1,
        title: "Welcome to CARS-G Admin!",
        description: "Your community safety management platform. Let's get you started with a quick tour.",
        icon: Shield,
        color: "bg-blue-500"
      },
      {
        id: 2,
        title: "Monitor Community",
        description: "Use the interactive map to monitor community areas and track all reports in real-time.",
        icon: MapPin,
        color: "bg-green-500",
        action: {
          text: "Open Map",
          path: "/admin/map"
        }
      },
      {
        id: 3,
        title: "Stay Connected",
        description: "Chat with patrol teams and community members. Stay informed about what's happening.",
        icon: MessageCircle,
        color: "bg-orange-500",
        action: {
          text: "Open Chat",
          path: "/chat"
        }
      },
      {
        id: 4,
        title: "Track Performance",
        description: "Monitor community engagement and see how the platform is performing.",
        icon: Award,
        color: "bg-red-500",
        action: {
          text: "View Leaderboard",
          path: "/leaderboard"
        }
      }
    ];
  } else if (userRole === 'patrol') {
    return [
      {
        id: 1,
        title: "Welcome to CARS-G Patrol!",
        description: "Your community safety patrol platform. Let's get you started with a quick tour.",
        icon: Shield,
        color: "bg-blue-500"
      },
      {
        id: 2,
        title: "Patrol Dashboard",
        description: "Access your patrol dashboard to manage patrol activities and respond to community needs.",
        icon: MapPin,
        color: "bg-green-500",
        action: {
          text: "Open Patrol",
          path: "/patrol"
        }
      }
    ];
  } else {
    return [
      {
        id: 1,
        title: "Welcome to CARS-G!",
        description: "Your community safety platform. Let's get you started with a quick tour.",
        icon: Shield,
        color: "bg-blue-500"
      },
      {
        id: 2,
        title: "Report Issues",
        description: "See something that needs attention? Report it quickly and easily. Your reports help keep the community safe.",
        icon: FileText,
        color: "bg-green-500",
        action: {
          text: "Create Report",
          path: "/reports/create"
        }
      },
      {
        id: 3,
        title: "Track Progress",
        description: "Monitor your reports and see how they're being resolved. Get updates in real-time.",
        icon: MapPin,
        color: "bg-purple-500",
        action: {
          text: "View Reports",
          path: "/reports"
        }
      },
      {
        id: 4,
        title: "Stay Connected",
        description: "Chat with community members and patrol teams. Stay informed about what's happening.",
        icon: MessageCircle,
        color: "bg-orange-500",
        action: {
          text: "Open Chat",
          path: "/chat"
        }
      },
      {
        id: 5,
        title: "Earn Rewards",
        description: "Get points and recognition for helping your community. Check the leaderboard to see how you're doing.",
        icon: Award,
        color: "bg-red-500",
        action: {
          text: "View Leaderboard",
          path: "/leaderboard"
        }
      }
    ];
  }
};

export function WelcomeGuide({ isOpen, onClose, userRole }: WelcomeGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = getSteps(userRole);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = () => {
    onClose();
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-[#800000] rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900">Welcome Guide</span>
            </div>
            <button
              onClick={skipTour}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <div className={`h-16 w-16 ${currentStepData.color} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <currentStepData.icon className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {currentStepData.title}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {currentStepData.description}
            </p>
          </div>

          {/* Action Button */}
          {currentStepData.action && (
            <div className="mb-6">
              <Link
                to={currentStepData.action.path}
                className="w-full bg-[#800000] text-white py-3 px-4 rounded-lg hover:bg-[#600000] transition-colors font-medium flex items-center justify-center"
                onClick={onClose}
              >
                {currentStepData.action.text}
              </Link>
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    index <= currentStep ? 'bg-[#800000]' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {currentStep + 1} of {steps.length}
            </span>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            <button
              onClick={nextStep}
              className="flex items-center space-x-2 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] transition-colors"
            >
              <span>{currentStep === steps.length - 1 ? 'Finish' : 'Next'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
