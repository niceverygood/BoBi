'use client';

import { cn } from '@/lib/utils';
import { getRiskBarClassByMultiplier, getRiskBadgeClassByMultiplier } from '@/lib/risk/risk-color';

interface RiskGaugeProps {
    relativeRisk: number;
    riskLevel: 'high' | 'moderate' | 'low';
}

// 라벨은 등급 string을 유지하지만(데이터 분류용), 색은 헬퍼가 relativeRisk
// 숫자만 보고 결정한다. 같은 배율 = 같은 색을 보장 (가이드 §11.3.1).
const LABELS = {
    high: '높음',
    moderate: '보통',
    low: '낮음',
} as const;

export default function RiskGauge({ relativeRisk, riskLevel }: RiskGaugeProps) {
    const maxRisk = 6;
    const pct = Math.min((relativeRisk / maxRisk) * 100, 100);

    return (
        <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all', getRiskBarClassByMultiplier(relativeRisk))}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-sm font-bold">{relativeRisk}배</span>
                <span className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded border',
                    getRiskBadgeClassByMultiplier(relativeRisk),
                )}>
                    {LABELS[riskLevel]}
                </span>
            </div>
        </div>
    );
}
