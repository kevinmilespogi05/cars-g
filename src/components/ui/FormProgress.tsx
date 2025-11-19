import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FormStep {
  id: string;
  label: string;
  completed?: boolean;
  active?: boolean;
}

export interface FormProgressProps {
  steps: FormStep[];
  currentStep: number;
  className?: string;
}

export function FormProgress({ steps, currentStep, className }: FormProgressProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Progress Bar */}
      <div className="relative mb-6">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2" />
        <div
          className="absolute top-1/2 left-0 h-1 bg-blue-600 transition-all duration-300 -translate-y-1/2"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
        />
      </div>

      {/* Steps */}
      <div className="flex justify-between relative">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = step.completed || stepNumber < currentStep;
          const isActive = step.active || stepNumber === currentStep;
          const isPast = stepNumber < currentStep;

          return (
            <div
              key={step.id}
              className="flex flex-col items-center flex-1 relative z-10"
            >
              {/* Step Circle */}
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold text-sm transition-all duration-300',
                  isCompleted
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : isActive
                    ? 'bg-white border-blue-600 text-blue-600 ring-4 ring-blue-100'
                    : 'bg-white border-gray-300 text-gray-400'
                )}
              >
                {isCompleted && !isActive ? (
                  <CheckCircle2 className="h-5 w-5 text-white" />
                ) : (
                  <span>{stepNumber}</span>
                )}
              </div>

              {/* Step Label */}
              <div
                className={cn(
                  'mt-2 text-xs font-medium text-center max-w-[80px]',
                  isActive || isPast ? 'text-gray-900' : 'text-gray-400'
                )}
              >
                {step.label}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-5 left-[50%] w-full h-0.5 -z-10',
                    isPast ? 'bg-blue-600' : 'bg-gray-200'
                  )}
                  style={{ marginLeft: '20px' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current Step Info */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          Step {currentStep} of {steps.length}
        </p>
      </div>
    </div>
  );
}

