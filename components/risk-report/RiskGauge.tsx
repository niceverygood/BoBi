'use client';

import { cn } from '@/lib/utils';

interface RiskGaugeProps {
    relativeRisk: number;
    riskLevel: 'high' | 'moderate' | 'low';
}

export default function RiskGauge({ relativeRisk, riskLevel }: RiskGaugeProps) {
    const maxRisk = 6;
    const pct = Math.min((relativeRisk / maxRisk) * 100, 100);

    const colors = {
        high: 'bg-red-500',
        moderate: 'bg-amber-500',
        low: 'bg-blue-500',
    };

    const labels = {
        high: '높음',
        moderate: '보통',
        low: '낮음',
    };

    return (
        <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all', colors[riskLevel])}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-sm font-bold">{relativeRisk}배</span>
                <span className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded',
                    riskLevel === 'high' && 'bg-red-100 text-red-700',
                    riskLevel === 'moderate' && 'bg-amber-100 text-amber-700',
                    riskLevel === 'low' && 'bg-blue-100 text-blue-700',
                )}>
                    {labels[riskLevel]}
                </span>
            </div>
        </div>
    );
}
