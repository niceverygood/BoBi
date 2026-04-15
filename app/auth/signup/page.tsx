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

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [loading, setLoading] = useState(false);
    const [kakaoLoading, setKakaoLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name,
                    company,
                },
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
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

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
                <Card className="w-full max-w-md border-0 shadow-xl animate-fade-in">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mb-4">
                            <Shield className="w-7 h-7 text-white" />
                        </div>
                        <CardTitle className="text-2xl font-bold">회원가입 완료!</CardTitle>
                        <CardDescription>
                            이메일로 인증 링크를 보내드렸습니다.<br />
                            이메일을 확인하고 인증을 완료해주세요.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push('/auth/login')} className="w-full h-11 bg-gradient-primary">
                            로그인 페이지로 이동
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

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
                        <CardTitle className="text-2xl font-bold">회원가입</CardTitle>
                        <CardDescription>보비와 함께 스마트한 보험 분석을 시작하세요</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* 약관 동의 안내 */}
                        <p className="text-xs text-center text-muted-foreground">
                            카카오로 시작하면{' '}
                            <Link href="/terms" className="text-primary underline">이용약관</Link>
                            {' '}및{' '}
                            <Link href="/privacy" className="text-primary underline">개인정보처리방침</Link>
                            에 동의하게 됩니다.
                        </p>

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
                                <span className="bg-card px-3 text-muted-foreground">또는 이메일로 가입</span>
                            </div>
                        </div>

                        <form onSubmit={handleSignup} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">이름</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="홍길동"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company">소속 (GA/보험사)</Label>
                                <Input
                                    id="company"
                                    type="text"
                                    placeholder="예: OO보험, △△GA"
                                    value={company}
                                    onChange={(e) => setCompany(e.target.value)}
                                    className="h-11"
                                />
                            </div>
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
                                    placeholder="6자 이상 입력하세요"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="h-11"
                                />
                            </div>

                            {/* 약관 동의 */}
                            <div className="flex items-start gap-2">
                                <input
                                    type="checkbox"
                                    id="agree"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="agree" className="text-xs text-muted-foreground leading-relaxed">
                                    <Link href="/terms" className="text-primary underline">이용약관</Link>
                                    {' '}및{' '}
                                    <Link href="/privacy" className="text-primary underline">개인정보처리방침</Link>
                                    에 동의합니다. (필수)
                                </label>
                            </div>

                            {error && (
                                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <Button type="submit" className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-opacity" disabled={loading || !agreed}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        가입 처리 중...
                                    </>
                                ) : (
                                    '회원가입'
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-muted-foreground">
                            이미 계정이 있으신가요?{' '}
                            <Link href="/auth/login" className="text-primary font-medium hover:underline">
                                로그인
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

