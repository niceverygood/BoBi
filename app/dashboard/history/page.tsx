import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSearch, ArrowRight } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import Link from 'next/link';

export default function HistoryPage() {
    // In a real app, this would fetch from Supabase
    const analyses: Array<{
        id: string;
        customerName: string;
        status: string;
        createdAt: string;
        hasProducts: boolean;
        hasClaims: boolean;
    }> = [];

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">분석 이력</h1>
                    <p className="text-muted-foreground mt-1">이전 분석 결과를 확인하세요</p>
                </div>
                <Link href="/dashboard/analyze">
                    <Button className="bg-gradient-primary hover:opacity-90">
                        <FileSearch className="w-4 h-4 mr-2" />
                        새 분석
                    </Button>
                </Link>
            </div>

            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    {analyses.length === 0 ? (
                        <EmptyState
                            title="분석 이력이 없습니다"
                            description="PDF를 업로드하고 첫 번째 보험 분석을 시작해보세요."
                            action={
                                <Link href="/dashboard/analyze">
                                    <Button variant="outline" size="sm">
                                        새 분석 시작
                                    </Button>
                                </Link>
                            }
                        />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>고객명</TableHead>
                                    <TableHead>상태</TableHead>
                                    <TableHead>분석일</TableHead>
                                    <TableHead>진행단계</TableHead>
                                    <TableHead className="text-right">상세</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {analyses.map((analysis) => (
                                    <TableRow key={analysis.id}>
                                        <TableCell className="font-medium">{analysis.customerName}</TableCell>
                                        <TableCell>
                                            <Badge variant={analysis.status === 'completed' ? 'default' : 'secondary'}>
                                                {analysis.status === 'completed' ? '완료' : analysis.status === 'processing' ? '처리중' : '대기'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{analysis.createdAt}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Badge variant="default" className="text-xs bg-blue-500">STEP1</Badge>
                                                {analysis.hasProducts && <Badge variant="default" className="text-xs bg-green-500">STEP2</Badge>}
                                                {analysis.hasClaims && <Badge variant="default" className="text-xs bg-violet-500">STEP3</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
