'use client';

import type { MedicalDetail } from '@/types/analysis';
import { cn } from '@/lib/utils';

interface MedicalTimelineProps {
    details: MedicalDetail[];
}

export default function MedicalTimeline({ details }: MedicalTimelineProps) {
    if (details.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-8">
                표시할 진료 이력이 없습니다.
            </p>
        );
    }

    // Sort by date descending
    const sorted = [...details].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const typeColors: Record<string, string> = {
        '외래': 'bg-blue-500',
        '입원': 'bg-red-500',
        '수술': 'bg-purple-500',
        '투약': 'bg-amber-500',
    };

    return (
        <div className="relative pl-6 space-y-6">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

            {sorted.map((detail, index) => (
                <div key={index} className="relative animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                    {/* Dot */}
                    <div className={cn(
                        'absolute left-[-17px] top-1.5 w-3 h-3 rounded-full border-2 border-background',
                        typeColors[detail.type] || 'bg-gray-400'
                    )} />

                    <div className="bg-card border rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono text-muted-foreground">{detail.date}</span>
                            <span className={cn(
                                'text-xs px-2 py-0.5 rounded-full text-white',
                                typeColors[detail.type] || 'bg-gray-400'
                            )}>
                                {detail.type}
                            </span>
                        </div>
                        <h4 className="font-medium text-sm">{detail.diagnosisName || '진단명 없음'}</h4>
                        <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                            {detail.hospital && <p>🏥 {detail.hospital}</p>}
                            {detail.diagnosisCode && <p>📋 {detail.diagnosisCode}</p>}
                            {detail.duration && <p>📅 {detail.duration}</p>}
                            {detail.medication && <p>💊 {detail.medication} ({detail.ingredient})</p>}
                            {detail.note && <p>📝 {detail.note}</p>}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
