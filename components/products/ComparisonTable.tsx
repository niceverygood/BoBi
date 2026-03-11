'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ProductEligibility } from '@/types/analysis';
import { cn } from '@/lib/utils';

interface ComparisonTableProps {
    products: ProductEligibility[];
}

export default function ComparisonTable({ products }: ComparisonTableProps) {
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-xs">상품 유형</TableHead>
                        <TableHead className="text-xs text-center">가입 가능</TableHead>
                        <TableHead className="text-xs">주요 사유</TableHead>
                        <TableHead className="text-xs">추천</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium text-sm">{product.productName}</TableCell>
                            <TableCell className="text-center">
                                <Badge
                                    className={cn(
                                        'text-xs',
                                        product.eligible === 'O' && 'bg-green-500',
                                        product.eligible === 'X' && 'bg-red-500',
                                        product.eligible === '△' && 'bg-amber-500'
                                    )}
                                >
                                    {product.eligibleText}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                {product.reasons.filter((r) => r.answer === '예').map((r) => r.question).join(', ') || '해당사항 없음'}
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px]">
                                {product.recommendation}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
