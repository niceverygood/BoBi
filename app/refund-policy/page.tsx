import Link from 'next/link';
import { ArrowLeft, Shield, CheckCircle2, XCircle, Mail } from 'lucide-react';

export const metadata = {
    title: '환불 정책 | 보비 BoBi',
    description: '보비 BoBi 결제·환불 정책. 전자상거래법 + App Store / Google Play 정책 부합.',
};

export default function RefundPolicyPage() {
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
                <h1 className="text-3xl font-bold mb-2">환불 정책</h1>
                <p className="text-muted-foreground mb-8">최종 수정일: 2026년 5월 8일 · v1.0</p>

                <div className="prose prose-sm max-w-none space-y-8 text-foreground">
                    {/* 서두 */}
                    <section className="bg-muted/30 rounded-lg p-5 border border-border">
                        <p className="text-muted-foreground leading-relaxed text-sm">
                            본 정책은 「전자상거래법」 제17조(청약철회), 「콘텐츠산업진흥법」, Apple App Store Review Guidelines 3.1.2,
                            Google Play Payments Policy를 기준으로 작성되었습니다. 이용자는 본 정책에 동의한 것으로 간주되며,
                            이용약관 제7조와 함께 효력이 발생합니다.
                        </p>
                    </section>

                    {/* 1. 환불 가능 */}
                    <section>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            제1조 (환불 가능 케이스)
                        </h2>
                        <div className="bg-muted/30 rounded-lg p-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2 font-semibold">케이스</th>
                                        <th className="text-left p-2 font-semibold">조건</th>
                                        <th className="text-left p-2 font-semibold">환불액</th>
                                    </tr>
                                </thead>
                                <tbody className="text-muted-foreground">
                                    <tr className="border-b">
                                        <td className="p-2 font-medium">결제 직후 미사용</td>
                                        <td className="p-2">결제일로부터 7일 이내 + AI 분석 1회도 실행 안 함</td>
                                        <td className="p-2 font-bold text-green-600">100%</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2 font-medium">자동 갱신 직후 미사용</td>
                                        <td className="p-2">자동 갱신일로부터 3일 이내 + 갱신 후 분석 미실행</td>
                                        <td className="p-2 font-bold text-green-600">100%</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2 font-medium">회사 귀책 장애</td>
                                        <td className="p-2">시스템·외부 API 장애로 24시간 이상 이용 불가</td>
                                        <td className="p-2 font-bold text-green-600">잔여 기간 일할 + 보상</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 font-medium">사용 후 부분 환불</td>
                                        <td className="p-2">결제일 7일 이내 + 일부 분석 사용</td>
                                        <td className="p-2 font-bold">사용 건수 차감 후</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* 2. 환불 불가 */}
                    <section>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-600" />
                            제2조 (환불 불가 케이스)
                        </h2>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                            <li>결제일로부터 7일 경과 후 (단, 회사 귀책 장애는 예외)</li>
                            <li>분석 결과를 다운로드하거나 고객에게 발송 완료한 건 (이미 가치 제공 완료)</li>
                            <li>약관 위반·부정 사용 (다중 계정 환불 악용, 결제 정보 위조 등)</li>
                            <li>무료체험 종료 후 정상 결제 7일 경과 (체험 사용 자체로 청약철회 의사 철회로 간주)</li>
                        </ul>
                    </section>

                    {/* 3. 결제 수단별 */}
                    <section>
                        <h2 className="text-xl font-bold mb-4">제3조 (결제 수단별 환불 처리)</h2>

                        <div className="space-y-4">
                            <div className="bg-muted/30 rounded-lg p-4">
                                <h3 className="font-semibold mb-2">3-1. 카카오페이 / 토스페이먼츠 / KG이니시스 (웹·신용카드)</h3>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                    <li>회사가 직접 환불 처리 (1:1 문의 또는 마이페이지 구독 해지)</li>
                                    <li>처리 기간: <strong>영업일 3~5일 이내</strong> 원 결제 수단으로 환급</li>
                                    <li>카드 결제: 다음 카드 청구일 또는 해당월 청구서에 환불 반영</li>
                                </ul>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-4">
                                <h3 className="font-semibold mb-2">3-2. Apple App Store (iOS 인앱결제)</h3>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                    <li>Apple이 환불 처리 권한 보유 — 보비가 직접 환불 불가</li>
                                    <li>사용자 직접 신청: <a href="https://reportaproblem.apple.com" target="_blank" rel="noreferrer" className="text-primary underline">reportaproblem.apple.com</a> 또는 App Store {'>'} 구매 내역 {'>'} 환불 요청</li>
                                    <li>보비가 보조: 환불 사유 작성 도움 + Apple 신청 가이드 제공</li>
                                    <li>Apple 처리 기간: 24~48시간 검토 + 환불 승인 시 영업일 5~10일</li>
                                </ul>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-4">
                                <h3 className="font-semibold mb-2">3-3. Google Play (Android 인앱결제)</h3>
                                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                    <li>구매 후 48시간 이내: Google Play 앱 내 구매 내역에서 자동 환불 신청 가능</li>
                                    <li>48시간 경과: 보비가 Play Console에서 환불 처리 — 1:1 문의로 신청</li>
                                    <li>처리 기간: 영업일 1~3일 이내 결제 수단으로 환급</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* 4. 신청 방법 */}
                    <section>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Mail className="w-5 h-5 text-primary" />
                            제4조 (환불 신청 방법)
                        </h2>
                        <ol className="list-decimal pl-5 space-y-3 text-muted-foreground">
                            <li>
                                <strong className="text-foreground">마이페이지 자체 해지 (자동 갱신 중지)</strong>
                                <br />
                                대시보드 {'>'} 설정 {'>'} 구독 관리 {'>'} &quot;구독 해지&quot; 클릭. 즉시 자동 갱신 중지되며 잔여 기간은 계속 이용 가능.
                                <br />
                                <span className="text-xs">※ 자동 갱신 중지 ≠ 즉시 환불. 즉시 환불 원할 경우 아래 1:1 문의 또는 이메일.</span>
                            </li>
                            <li>
                                <strong className="text-foreground">1:1 문의</strong>
                                <br />
                                대시보드 {'>'} 1:1 문의에서 사유 작성 + 결제 정보 첨부.
                                <br />
                                회신: <strong>영업일 1일 이내</strong> 검토 후 승인 여부 안내.
                            </li>
                            <li>
                                <strong className="text-foreground">이메일</strong>
                                <br />
                                <a href="mailto:dev@bottlecorp.kr" className="text-primary underline">dev@bottlecorp.kr</a> 으로 결제 일자·결제 수단·환불 사유 회신.
                            </li>
                            <li>
                                <strong className="text-foreground">카카오톡 채팅 상담</strong>
                                <br />
                                평일 10:00~18:00 채팅 봇 {'>'} 환불 문의 {'>'} 상담사 연결.
                            </li>
                        </ol>
                    </section>

                    {/* 5. 무료체험 */}
                    <section>
                        <h2 className="text-xl font-bold mb-4">제5조 (무료체험 환불 정책)</h2>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                            <li><strong>체험 기간 (3일) 중 해지</strong>: 청구 0원, 환불 사유 없음</li>
                            <li><strong>체험 종료 후 자동 결제 직후 24시간 이내</strong> + <strong>분석 미사용</strong>: 100% 환불</li>
                            <li><strong>체험 종료 후 정상 사용 시작</strong>: 제1조 일반 환불 정책 적용</li>
                        </ul>
                    </section>

                    {/* 6. 부분 환불 계산 */}
                    <section>
                        <h2 className="text-xl font-bold mb-4">제6조 (부분 환불 계산 공식)</h2>

                        <div className="space-y-4">
                            <div className="bg-muted/30 rounded-lg p-4">
                                <h3 className="font-semibold mb-2">6-1. 일할 계산 (회사 귀책 · 잔여 기간 환불)</h3>
                                <pre className="bg-background p-3 rounded border text-xs overflow-x-auto">
환불액 = 결제 금액 × (잔여 일수 / 30일)

예시: 베이직 19,900원 결제 후 10일 사용 (잔여 20일)
     19,900 × (20/30) = 13,266원 환불
                                </pre>
                            </div>

                            <div className="bg-muted/30 rounded-lg p-4">
                                <h3 className="font-semibold mb-2">6-2. 분석 건수 차감 (사용 후 7일 이내 환불)</h3>
                                <pre className="bg-background p-3 rounded border text-xs overflow-x-auto">
환불액 = 결제 금액 − (사용 건수 × 건당 단가)

베이직 건당 단가: 19,900원 ÷ 30회 ≈ 663원
프로 건당 단가:   39,900원 ÷ 무제한 → 일할 계산만 적용

예시: 베이직 결제 후 5건 분석 사용
     19,900 − (5 × 663) = 16,585원 환불
                                </pre>
                            </div>
                        </div>
                    </section>

                    {/* 7. 자동 갱신 */}
                    <section>
                        <h2 className="text-xl font-bold mb-4">제7조 (자동 갱신 · 구독 해지 정책)</h2>

                        <h3 className="font-semibold mb-2">자동 갱신</h3>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground mb-4">
                            <li>매월 결제일에 동일 금액 자동 청구</li>
                            <li>결제 24시간 전 카카오톡 알림 발송 (선택)</li>
                            <li>자동 갱신 해지 시 즉시 갱신 중지. 잔여 기간은 계속 이용 가능</li>
                        </ul>

                        <h3 className="font-semibold mb-2">청구 변경 정책</h3>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>가격 인상 시: 시행일 30일 전 이메일·앱 내 공지 + 자동 갱신 동의 재확인</li>
                            <li>가격 인하 시: 즉시 적용</li>
                        </ul>
                    </section>

                    {/* 8. 분쟁 해결 */}
                    <section>
                        <h2 className="text-xl font-bold mb-4">제8조 (분쟁 해결)</h2>
                        <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>1차: 보비 고객센터 (<a href="mailto:dev@bottlecorp.kr" className="text-primary underline">dev@bottlecorp.kr</a>)</li>
                            <li>2차: 한국소비자원 (1372) 또는 전자상거래분쟁조정위원회</li>
                            <li>관할법원: 회사 본점 소재지 관할 법원 (서울중앙지방법원)</li>
                        </ol>
                    </section>

                    {/* 9. 관련 페이지 */}
                    <section className="bg-muted/30 rounded-lg p-5 border border-border">
                        <h3 className="font-semibold mb-3">관련 정책</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/terms" className="text-primary underline">이용약관 제7조 (취소 및 환불 규정)</Link>
                                {' '}— 본 정책의 법적 근거
                            </li>
                            <li>
                                <Link href="/privacy" className="text-primary underline">개인정보처리방침</Link>
                                {' '}— 환불 처리 시 개인정보 보유 기간
                            </li>
                            <li>
                                <Link href="/dashboard/billing" className="text-primary underline">결제·구독 관리</Link>
                                {' '}— 결제 내역·자동 갱신 해지·영수증
                            </li>
                        </ul>
                    </section>

                    {/* 회사 정보 */}
                    <section className="text-xs text-muted-foreground border-t pt-6">
                        <p><strong>주식회사 바틀</strong></p>
                        <p>대표이사: 한승수</p>
                        <p>이메일: dev@bottlecorp.kr</p>
                        <p>웹: <a href="https://www.bobi.co.kr" className="underline">www.bobi.co.kr</a></p>
                    </section>
                </div>
            </main>
        </div>
    );
}
