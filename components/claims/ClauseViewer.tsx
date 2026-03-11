'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface ClauseViewerProps {
    clauseType: string;
    clauseText: string;
}

export default function ClauseViewer({ clauseType, clauseText }: ClauseViewerProps) {
    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    {clauseType} 약관
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="max-h-[300px] overflow-y-auto">
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {clauseText}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
