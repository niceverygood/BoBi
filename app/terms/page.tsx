import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata = {
    title: '이용약관 | 보비 BoBi',
    description: '보비 BoBi 서비스 이용약관',
};

export default function TermsPage() {
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
                <h1 className="text-3xl font-bold mb-2">이용약관</h1>
                <p className="text-muted-foreground mb-8">최종 수정일: 2026년 4월 3일</p>

                <div className="prose prose-sm max-w-none space-y-8 text-foreground">
                    {/* 제1조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제1조 (목적)</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            본 약관은 주식회사 바틀(이하 &quot;회사&quot;)이 운영하는 보비 BoBi 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                        </p>
                    </section>

                    {/* 제2조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제2조 (정의)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>&quot;서비스&quot;란 회사가 제공하는 AI 보험 분석 서비스(고지사항 분석, 상품 매칭, 보험금 청구 안내 등)를 말합니다.</li>
                            <li>&quot;이용자&quot;란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
                            <li>&quot;유료 서비스&quot;란 무료 플랜 이외의 베이직, 프로, 팀 플랜 등 이용료를 지불하고 이용하는 서비스를 말합니다.</li>
                        </ul>
                    </section>

                    {/* 제3조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제3조 (약관의 효력 및 변경)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
                            <li>회사는 필요한 경우 관련 법령에 위배되지 않는 범위에서 약관을 변경할 수 있으며, 변경된 약관은 적용일자 7일 전부터 공지합니다.</li>
                            <li>이용자가 변경된 약관에 동의하지 않는 경우, 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
                        </ul>
                    </section>

                    {/* 제4조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제4조 (회원가입 및 이용계약)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>이용자는 회사가 정한 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</li>
                            <li>카카오 계정을 통한 소셜 로그인으로도 회원가입이 가능합니다.</li>
                            <li>회사는 다음 각 호에 해당하는 경우 회원가입을 거절하거나 사후에 이용계약을 해지할 수 있습니다.
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>타인의 정보를 도용한 경우</li>
                                    <li>허위 정보를 기재한 경우</li>
                                    <li>서비스 운영을 방해한 경우</li>
                                </ul>
                            </li>
                        </ul>
                    </section>

                    {/* 제5조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제5조 (서비스의 내용 및 변경)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>회사는 다음과 같은 서비스를 제공합니다.
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>건강보험심평원 진료이력 PDF 기반 AI 고지사항 분석</li>
                                    <li>보험 상품 가입 가능 여부 판단</li>
                                    <li>보험금 청구 가능 항목 안내</li>
                                    <li>분석 결과 PDF 다운로드</li>
                                </ul>
                            </li>
                            <li>회사는 서비스의 내용을 변경할 수 있으며, 변경 시 이용자에게 사전 공지합니다.</li>
                        </ul>
                    </section>

                    {/* 제6조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제6조 (유료 서비스 및 결제)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>유료 서비스의 이용 요금 및 결제 방법은 서비스 내 요금제 페이지에 안내된 바에 따릅니다.</li>
                            <li>유료 서비스는 월간 또는 연간 구독 형태로 제공되며, 구독 기간이 종료되면 자동으로 갱신됩니다.</li>
                            <li>이용자가 자동 갱신을 원하지 않는 경우, 구독 기간 만료 전에 해지 신청을 하여야 합니다.</li>
                        </ul>
                    </section>

                    {/* 제7조 - 환불 규정 */}
                    <section className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-3">제7조 (취소 및 환불 규정)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li><strong>구독 해지:</strong> 이용자는 언제든지 유료 서비스의 구독을 해지할 수 있습니다. 해지 시 이미 결제된 기간의 남은 기간 동안 서비스 이용이 가능합니다.</li>
                            <li><strong>환불 기준:</strong>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>결제일로부터 7일 이내이고, 서비스를 이용(분석 실행)하지 않은 경우: 전액 환불</li>
                                    <li>결제일로부터 7일 이내이나 서비스를 이용한 경우: 이용 건수에 해당하는 금액을 차감 후 환불</li>
                                    <li>결제일로부터 7일 경과 후: 환불 불가 (단, 서비스 장애 등 회사 귀책 사유인 경우 예외)</li>
                                </ul>
                            </li>
                            <li><strong>환불 절차:</strong> 환불 요청은 서비스 내 설정 페이지 또는 고객센터(010-2309-7443)를 통해 신청할 수 있습니다.</li>
                            <li><strong>환불 처리:</strong> 환불은 신청일로부터 영업일 기준 3~5일 이내에 원래 결제 수단으로 처리됩니다.</li>
                        </ul>
                    </section>

                    {/* 제8조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제8조 (이용자의 의무)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>이용자는 서비스 이용 시 관련 법령, 본 약관, 이용안내 등을 준수하여야 합니다.</li>
                            <li>이용자는 타인의 개인정보(진료이력 등)를 해당 개인의 동의 없이 서비스에 업로드하여서는 안 됩니다.</li>
                            <li>이용자는 자신의 계정 정보를 관리할 책임이 있으며, 이를 제3자에게 양도하거나 대여할 수 없습니다.</li>
                            <li>이용자는 다음 각 호의 행위를 하여서는 안 됩니다.
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>서비스의 기술적 구조, AI 분석 로직, 프롬프트, 알고리즘 등 회사의 지적재산을 역공학(reverse engineering), 디컴파일, 크롤링, 스크래핑 등의 방법으로 추출하거나 복제하는 행위</li>
                                    <li>서비스에서 제공하는 데이터, 분석 결과, UI/UX 디자인 등을 무단으로 복제하여 동일하거나 유사한 서비스를 개발하는 행위</li>
                                    <li>API 호출을 자동화하거나 비정상적인 방법으로 대량의 데이터를 수집하는 행위</li>
                                    <li>서비스의 보안 체계를 우회하거나 취약점을 악용하는 행위</li>
                                </ul>
                            </li>
                        </ul>
                    </section>

                    {/* 제9조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제9조 (서비스 이용제한 및 계정 정지)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>회사는 이용자가 제8조의 의무를 위반한 경우, 사전 통지 없이 서비스 이용을 제한하거나 이용계약을 해지할 수 있습니다.</li>
                            <li>특히 <strong>회사의 기술, 알고리즘, 영업비밀을 탈취하거나 이를 이용하여 경쟁 서비스를 개발할 목적으로 서비스를 이용하는 것이 확인된 경우</strong>, 해당 이용자는 <strong>영구적으로 서비스 이용이 정지</strong>되며, 회사는 이로 인한 손해에 대해 민·형사상 법적 조치를 취할 수 있습니다.</li>
                            <li>이용제한 조치에 대해 이용자가 이의를 제기하고자 하는 경우, 회사에 서면으로 소명할 수 있으며, 회사는 이를 검토하여 이용제한의 해제 여부를 결정합니다.</li>
                        </ul>
                    </section>

                    {/* 제10조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제10조 (지적재산권 및 면책조항)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>본 서비스의 AI 분석 결과는 <strong>참고 자료</strong>이며, 최종적인 보험 가입 심사, 보험금 청구 결정은 해당 보험사의 심사 기준에 따릅니다.</li>
                            <li>회사는 AI 분석 결과의 정확성을 보장하지 않으며, 분석 결과에 기반한 의사결정으로 인한 손해에 대해 책임지지 않습니다.</li>
                            <li>천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 회사는 책임을 지지 않습니다.</li>
                        </ul>
                    </section>

                    {/* 제10조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제11조 (분쟁 해결)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>본 약관에 의한 분쟁은 대한민국 법률에 따라 해결합니다.</li>
                            <li>서비스 이용과 관련하여 발생한 분쟁에 대해서는 회사의 본점 소재지를 관할하는 법원을 전속 관할 법원으로 합니다.</li>
                        </ul>
                    </section>

                    {/* 부칙 */}
                    <section className="border-t pt-6">
                        <h2 className="text-xl font-bold mb-3">부칙</h2>
                        <p className="text-muted-foreground">본 약관은 2026년 4월 3일부터 시행합니다.</p>
                    </section>

                    {/* 사업자정보 */}
                    <section className="bg-muted/30 rounded-xl p-6">
                        <h3 className="font-bold mb-3">사업자 정보</h3>
                        <div className="text-sm text-muted-foreground space-y-1">
                            <p>상호: 주식회사 바틀</p>
                            <p>대표자: 한승수</p>
                            <p>사업자등록번호: 376-87-01076</p>
                            <p>주소: 경기도 성남시 분당구 판교로289번길 20, 2동 8층 (삼평동, 판교테크노밸리 스타트업 캠퍼스)</p>
                            <p>연락처: 010-2309-7443</p>
                        </div>
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
