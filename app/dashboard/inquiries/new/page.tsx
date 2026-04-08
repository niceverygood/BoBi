'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import Link from 'next/link';

const CATEGORIES = ['일반', '결제/구독', '기능 문의', '오류 신고', '기타'];

export default function NewInquiryPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('일반');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            setError('제목과 내용을 모두 입력해주세요.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await apiFetch('/api/inquiries', {
                method: 'POST',
                body: { title, content, category },
            });
            router.push('/dashboard/inquiries');
        } catch (err) {
            setError((err as Error).message || '문의 등록에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <Link href="/dashboard/inquiries" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm">
                <ArrowLeft className="w-4 h-4" />
                문의 목록으로
            </Link>

            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">1:1 문의하기</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label>카테고리</Label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(cat => (
                                    <Button
                                        key={cat}
                                        type="button"
                                        size="sm"
                                        variant={category === cat ? 'default' : 'outline'}
                                        onClick={() => setCategory(cat)}
                                        className="text-xs"
                                    >
                                        {cat}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">제목</Label>
                            <Input
                                id="title"
                                placeholder="문의 제목을 입력해주세요"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                maxLength={100}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">내용</Label>
                            <textarea
                                id="content"
                                placeholder="문의 내용을 상세히 적어주세요."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                rows={8}
                                maxLength={3000}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                            />
                            <p className="text-[11px] text-muted-foreground text-right">{content.length}/3000</p>
                        </div>

                        {error && (
                            <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>
                        )}

                        <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-90 gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {loading ? '등록 중...' : '문의 등록'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
