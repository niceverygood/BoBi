import { LucideIcon, FileSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
    className?: string;
}

export default function EmptyState({
    icon: Icon = FileSearch,
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
                <Icon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
            {action}
        </div>
    );
}
