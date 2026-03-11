import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
    text?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ text = '분석 중입니다...', className, size = 'md' }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div className={cn('flex flex-col items-center justify-center gap-4 py-12', className)}>
            <div className="relative">
                <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
                <div className="absolute inset-0 blur-xl opacity-30">
                    <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
                </div>
            </div>
            {text && <p className="text-sm text-muted-foreground animate-pulse">{text}</p>}
        </div>
    );
}
