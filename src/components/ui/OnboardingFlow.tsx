import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, CheckCircle, MapPin, FileText, Award, Bell } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  skipable?: boolean;
}

export interface OnboardingFlowProps {
  steps: OnboardingStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  className?: string;
}

export function OnboardingFlow({
  steps,
  onComplete,
  onSkip,
  className
}: OnboardingFlowProps) {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      // If column doesn't exist, show onboarding (new feature)
      if (error && (error.code === '42703' || error.message.includes('column'))) {
        setIsVisible(true);
        return;
      }

      if (error) {
        console.error('Error checking onboarding status:', error);
        // Show onboarding if we can't check status
        setIsVisible(true);
        return;
      }

      if (!data?.onboarding_completed) {
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      // Show onboarding if we can't check status
      setIsVisible(true);
    }
  };

  const markStepComplete = (stepId: string) => {
    setCompletedSteps(prev => new Set([...prev, stepId]));
  };

  const handleNext = () => {
    const current = steps[currentStep];
    markStepComplete(current.id);

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
    handleComplete();
  };

  const handleComplete = async () => {
    if (user) {
      try {
        // Try to update onboarding_completed, but handle gracefully if column doesn't exist
        const { error } = await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
        
        if (error) {
          // If column doesn't exist, just log and continue
          if (error.code === '42703' || error.message.includes('column')) {
            console.warn('onboarding_completed column not found, skipping update');
          } else {
            console.error('Error marking onboarding as complete:', error);
          }
        }
      } catch (error) {
        console.error('Error marking onboarding as complete:', error);
      }
    }

    setIsVisible(false);
    if (onComplete) {
      onComplete();
    }
  };

  if (!isVisible || steps.length === 0) {
    return null;
  }

  const current = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget && current.skipable) {
            handleSkip();
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={cn(
            'bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col',
            className
          )}
        >
          {/* Header */}
          <div className="relative p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  {current.icon}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{current.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">Step {currentStep + 1} of {steps.length}</p>
                </div>
              </div>
              {current.skipable && (
                <button
                  onClick={handleSkip}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label="Skip onboarding"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className="h-full bg-blue-600"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <p className="text-gray-600 mb-6">{current.description}</p>
            <div className="min-h-[200px]">
              {current.content}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    index === currentStep
                      ? 'bg-blue-600'
                      : completedSteps.has(step.id)
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              )}
              <Button
                onClick={handleNext}
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                {currentStep < steps.length - 1 && <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Pre-built onboarding steps
export const defaultOnboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to BANTAY SP!',
    description: 'Your community reporting system for a better neighborhood.',
    icon: <MapPin className="h-6 w-6" />,
    content: (
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">What is BANTAY SP?</h3>
          <p className="text-sm text-gray-700">
            BANTAY SP helps you report community issues, track their resolution, and earn points for your contributions.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <FileText className="h-8 w-8 text-blue-600 mb-2" />
            <h4 className="font-semibold text-sm">Report Issues</h4>
            <p className="text-xs text-gray-600 mt-1">Submit community problems easily</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <Award className="h-8 w-8 text-amber-600 mb-2" />
            <h4 className="font-semibold text-sm">Earn Points</h4>
            <p className="text-xs text-gray-600 mt-1">Get rewarded for contributions</p>
          </div>
        </div>
      </div>
    ),
    skipable: true
  },
  {
    id: 'reporting',
    title: 'How to Report',
    description: 'Learn how to submit a community issue report.',
    icon: <FileText className="h-6 w-6" />,
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
              1
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Click "Create Report"</h4>
              <p className="text-sm text-gray-600">Start by clicking the create button on the reports page</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
              2
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Fill in Details</h4>
              <p className="text-sm text-gray-600">Provide title, description, category, and location</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
              3
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Add Photos</h4>
              <p className="text-sm text-gray-600">Upload images to help illustrate the issue</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Submit</h4>
              <p className="text-sm text-gray-600">Review and submit your report</p>
            </div>
          </div>
        </div>
      </div>
    ),
    skipable: true
  },
  {
    id: 'notifications',
    title: 'Stay Informed',
    description: 'Enable notifications to never miss important updates.',
    icon: <Bell className="h-6 w-6" />,
    content: (
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-2">Why Enable Notifications?</h3>
          <ul className="space-y-2 text-sm text-amber-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Get notified when your reports are verified or resolved</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Receive achievement unlock notifications</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Stay updated on community activities</span>
            </li>
          </ul>
        </div>
        <p className="text-sm text-gray-600">
          You can always manage your notification preferences in your profile settings.
        </p>
      </div>
    ),
    skipable: true
  }
];

