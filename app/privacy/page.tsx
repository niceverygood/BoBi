import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata = {
    title: '개인정보처리방침 | 보비 BoBi',
    description: '보비 BoBi 개인정보처리방침',
};

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background">
            <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        홈으로
                    </Link>
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        <span className="font-semibold">보비 BoBi</span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-3xl font-bold mb-2">개인정보처리방침</h1>
                <p className="text-muted-foreground mb-8">최종 수정일: 2026년 3월 13일</p>

                <div className="prose prose-sm max-w-none space-y-8 text-foreground">
                    <section>
                        <p className="text-muted-foreground leading-relaxed">
                            주식회사 바틀(이하 &quot;회사&quot;)은 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
                        </p>
                    </section>

                    {/* 1조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제1조 (수집하는 개인정보 항목)</h2>
                        <p className="text-muted-foreground mb-2">회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
                        <div className="bg-muted/30 rounded-lg p-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2 font-semibold">수집 시점</th>
                                        <th className="text-left p-2 font-semibold">필수 항목</th>
                                        <th className="text-left p-2 font-semibold">선택 항목</th>
                                    </tr>
                                </thead>
                                <tbody className="text-muted-foreground">
                                    <tr className="border-b">
                                        <td className="p-2">회원가입</td>
                                        <td className="p-2">이메일, 비밀번호, 이름</td>
                                        <td className="p-2">소속(GA/보험사)</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">카카오 로그인</td>
                                        <td className="p-2">카카오 계정 이메일, 프로필 정보</td>
                                        <td className="p-2">-</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">서비스 이용</td>
                                        <td className="p-2">업로드한 PDF 파일, 분석 결과</td>
                                        <td className="p-2">-</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2">결제</td>
                                        <td className="p-2">결제 수단 정보, 결제 이력</td>
                                        <td className="p-2">-</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">
                            ※ 서비스 이용 과정에서 IP 주소, 접속 로그, 브라우저 정보, 이용 기록이 자동으로 수집될 수 있습니다.
                        </p>
                    </section>

                    {/* 2조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제2조 (개인정보의 수집 및 이용 목적)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li><strong>서비스 제공:</strong> 회원 인증, AI 보험 분석 서비스 제공, 분석 결과 보관</li>
                            <li><strong>회원 관리:</strong> 회원 식별, 불량 회원 방지, 고지사항 전달</li>
                            <li><strong>결제 처리:</strong> 유료 서비스 요금 결제 및 정산</li>
                            <li><strong>서비스 개선:</strong> 이용 통계 분석, 서비스 품질 개선</li>
                        </ul>
                    </section>

                    {/* 3조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제3조 (개인정보의 보유 및 이용 기간)</h2>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                            <li><strong>회원 정보:</strong> 회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</li>
                            <li><strong>분석 데이터(PDF, 분석 결과):</strong> 플랜별 보관 기간에 따름 (무료 7일, 베이직 30일, 프로 이상 무제한)</li>
                            <li><strong>결제 기록:</strong> 「전자상거래 등에서의 소비자 보호에 관한 법률」에 따라 5년 보관</li>
                            <li><strong>접속 로그:</strong> 「통신비밀보호법」에 따라 3개월 보관</li>
                        </ul>
                    </section>

                    {/* 4조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제4조 (개인정보의 제3자 제공)</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.
                        </p>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground mt-2">
                            <li>이용자가 사전에 동의한 경우</li>
                            <li>법령에 의해 요구되는 경우</li>
                        </ul>
                    </section>

                    {/* 5조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제5조 (개인정보 처리의 위탁)</h2>
                        <p className="text-muted-foreground mb-2">회사는 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.</p>
                        <div className="bg-muted/30 rounded-lg p-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2 font-semibold">수탁 업체</th>
                                        <th className="text-left p-2 font-semibold">위탁 업무</th>
                                    </tr>
                                </thead>
                                <tbody className="text-muted-foreground">
                                    <tr className="border-b">
                                        <td className="p-2">Supabase (미국)</td>
                                        <td className="p-2">데이터 저장 및 인증 서비스</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">OpenAI (미국)</td>
                                        <td className="p-2">AI 분석 처리</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2">Vercel (미국)</td>
                                        <td className="p-2">웹 서비스 호스팅</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 6조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제6조 (개인정보의 파기)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>회사는 개인정보 보유 기간이 종료되었거나, 처리 목적이 달성된 경우 해당 개인정보를 즉시 파기합니다.</li>
                            <li>전자적 파일: 복구할 수 없는 방법으로 영구 삭제합니다.</li>
                            <li>종이 문서: 분쇄 또는 소각하여 파기합니다.</li>
                        </ul>
                    </section>

                    {/* 7조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제7조 (이용자의 권리)</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            이용자는 언제든지 자신의 개인정보에 대해 다음과 같은 권리를 행사할 수 있습니다.
                        </p>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground mt-2">
                            <li>개인정보 열람 요구</li>
                            <li>오류 등이 있을 경우 정정 요구</li>
                            <li>삭제 요구</li>
                            <li>처리 정지 요구</li>
                        </ul>
                        <p className="text-muted-foreground mt-2">
                            위 권리 행사는 서비스 내 설정 페이지 또는 고객센터(010-2309-7443)를 통해 가능합니다.
                        </p>
                    </section>

                    {/* 8조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제8조 (개인정보 보호 책임자)</h2>
                        <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground space-y-1">
                            <p>성명: 한승수</p>
                            <p>직책: 대표이사</p>
                            <p>연락처: 010-2309-7443</p>
                        </div>
                    </section>

                    {/* 9조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제9조 (개인정보의 안전성 확보 조치)</h2>
                        <p className="text-muted-foreground mb-2">회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                            <li>비밀번호 암호화 저장</li>
                            <li>SSL/TLS를 통한 데이터 전송 암호화</li>
                            <li>접근 권한 관리 및 제한</li>
                            <li>개인정보 접근 로그 기록 관리</li>
                        </ul>
                    </section>

                    {/* 부칙 */}
                    <section className="border-t pt-6">
                        <h2 className="text-xl font-bold mb-3">부칙</h2>
                        <p className="text-muted-foreground">본 개인정보처리방침은 2026년 3월 13일부터 시행합니다.</p>
                    </section>
                </div>

                <div className="mt-12 text-center">
                    <Link href="/">
                        <Button variant="outline">홈으로 돌아가기</Button>
                    </Link>
                </div>
            </main>
        </div>
    );
}
