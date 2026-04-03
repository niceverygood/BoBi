'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { KakaoIcon } from '@/components/icons/KakaoIcon';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [kakaoLoading, setKakaoLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            // refresh 먼저 해서 서버 세션 갱신 후 이동
            router.refresh();
            // 약간의 딜레이를 줘서 세션이 미들웨어에 반영되도록
            await new Promise(r => setTimeout(r, 300));
            router.push('/dashboard');
        }
    };

    const handleKakaoLogin = async () => {
        setKakaoLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'kakao',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
            setKakaoLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
            <div className="w-full max-w-md animate-fade-in">
                <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    홈으로 돌아가기
                </Link>

                <Card className="border-0 shadow-xl">
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                            <Shield className="w-7 h-7 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold">로그인</CardTitle>
                        <CardDescription>보비에 로그인하여 AI 보험 분석을 시작하세요</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* 카카오 로그인 */}
                        <Button
                            type="button"
                            onClick={handleKakaoLogin}
                            disabled={kakaoLoading}
                            className="w-full h-12 text-[15px] font-semibold rounded-xl transition-all duration-200 hover:brightness-95 active:scale-[0.98]"
                            style={{ backgroundColor: '#FEE500', color: '#181600' }}
                        >
                            {kakaoLoading ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <KakaoIcon className="w-5 h-5 mr-2" />
                            )}
                            카카오로 시작하기
                        </Button>

                        {/* 구분선 */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-muted" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-card px-3 text-muted-foreground">또는 이메일로 로그인</span>
                            </div>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">이메일</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">비밀번호</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-11"
                                />
                            </div>

                            {error && (
                                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        로그인 중...
                                    </>
                                ) : (
                                    '로그인'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            계정이 없으신가요?{' '}
                            <Link href="/auth/signup" className="text-primary font-medium hover:underline">
                                회원가입
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
