'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface Step {
    id: number;
    title: string;
    description: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
    completedSteps?: number[];
}

export default function StepIndicator({ steps, currentStep, completedSteps = [] }: StepIndicatorProps) {
    return (
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
            {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(step.id);
                const isCurrent = step.id === currentStep;
                const isUpcoming = step.id > currentStep && !isCompleted;

                return (
                    <div key={step.id} className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div
                                className={cn(
                                    'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                                    isCompleted && 'bg-green-500 text-white',
                                    isCurrent && 'bg-primary text-primary-foreground animate-pulse-glow',
                                    isUpcoming && 'bg-muted text-muted-foreground'
                                )}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                    step.id
                                )}
                            </div>
                            <div className="hidden sm:block">
                                <p className={cn(
                                    'text-sm font-medium',
                                    isCurrent && 'text-primary',
                                    isUpcoming && 'text-muted-foreground'
                                )}>
                                    {step.title}
                                </p>
                                <p className="text-xs text-muted-foreground hidden md:block">{step.description}</p>
                            </div>
                        </div>

                        {index < steps.length - 1 && (
                            <div
                                className={cn(
                                    'w-8 sm:w-16 h-0.5 rounded-full transition-colors',
                                    isCompleted ? 'bg-green-500' : 'bg-muted'
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
