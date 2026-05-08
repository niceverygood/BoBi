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
                <p className="text-muted-foreground mb-8">최종 수정일: 2026년 4월 19일</p>

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
                            <li>&quot;서비스&quot;란 회사가 제공하는 AI 보험 분석 서비스(고지사항 분석, 상품 매칭, 보험금 청구 안내, 질병 위험도 리포트, 예상 의료비 시뮬레이션 등)를 말합니다.</li>
                            <li>&quot;이용자&quot;란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 말하며, 주로 보험설계사·보험대리점 소속 임직원 등 <strong>B2B 전문 이용자</strong>를 대상으로 합니다.</li>
                            <li>&quot;고객&quot;이란 이용자(설계사)가 상담하는 상대방으로서, 이용자가 서비스에 업로드·입력하는 진료이력·건강정보의 정보주체인 자연인을 말합니다.</li>
                            <li>&quot;AI 분석 결과&quot;란 회사가 제공하는 인공지능 기술에 기반한 참고 자료로서, 이용자가 업로드한 자료를 바탕으로 생성된 예측·요약·판단 텍스트를 말합니다.</li>
                            <li>&quot;공유 링크&quot;란 이용자가 고객 등 제3자에게 분석 결과를 열람할 수 있도록 생성하는 만료 기한부 URL을 말합니다.</li>
                            <li>&quot;유료 서비스&quot;란 무료 플랜 이외의 베이직, 프로, 팀 플랜 등 이용료를 지불하고 이용하는 서비스를 말합니다.</li>
                            <li>&quot;크레딧&quot;이란 월간 분석 한도 초과 시 추가 분석을 위해 별도로 구매하는 일회성 사용권을 말합니다.</li>
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
                                    <li>건강보험심사평가원 진료이력 PDF 기반 AI 고지사항 분석</li>
                                    <li>보험 상품 가입 가능 여부 판단 (참고용)</li>
                                    <li>보험금 청구 가능 항목 안내 (참고용)</li>
                                    <li>질병 위험도 예측 리포트</li>
                                    <li>예상 의료비 시뮬레이션(Future-Me) 및 모의 영수증 생성</li>
                                    <li>분석 결과 PDF 다운로드 및 설계사-고객 간 공유 링크</li>
                                </ul>
                            </li>
                            <li>회사는 서비스의 내용을 변경할 수 있으며, 변경 시 이용자에게 사전 공지합니다.</li>
                            <li>AI 모델의 버전 업그레이드, 학습 데이터의 업데이트, 보험사 상품·약관·심사기준의 변경 등에 따라 분석 결과의 정확도·일관성이 달라질 수 있으며, 이는 서비스의 본질적 특성입니다.</li>
                        </ul>
                    </section>

                    {/* 제5조의2 — 서비스의 법적 성격 */}
                    <section className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-3">제5조의2 (서비스의 법적 성격 및 회사의 지위)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>회사는 <strong>「보험업법」상의 보험회사, 보험대리점, 보험중개사, 보험설계사 또는 모집종사자가 아니며</strong>, 보험계약의 체결·권유·중개·모집 행위를 수행하지 않습니다.</li>
                            <li>회사는 <strong>「금융소비자 보호에 관한 법률」상의 금융상품판매업자 또는 금융상품자문업자가 아니며</strong>, 특정 금융상품(보험 포함)의 판매·권유·자문을 제공하지 않습니다.</li>
                            <li>회사는 「의료법」상 의료기관이 아니며, 의료행위·의학적 진단·소견을 제공하지 않습니다. AI 분석 결과에 포함된 질병 관련 정보는 의료상담을 대체하지 않습니다.</li>
                            <li>본 서비스는 보험설계사 및 전문 이용자가 업무 참고용으로 활용하기 위한 <strong>정보제공 및 업무보조 도구</strong>이며, 보험계약의 체결·청약·모집 또는 금융상품 권유·자문을 대체하지 않습니다.</li>
                            <li>이용자(설계사)가 AI 분석 결과에 근거하여 고객에게 행한 모집·상담·권유·설명 행위에 대한 책임은 「보험업법」 제102조 및 관련 법령에 따라 해당 이용자와 그가 소속된 보험회사·보험대리점에게 귀속됩니다.</li>
                        </ul>
                    </section>

                    {/* 제6조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제6조 (유료 서비스 및 결제)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>유료 서비스의 이용 요금 및 결제 방법은 서비스 내 요금제 페이지에 안내된 바에 따릅니다.</li>
                            <li>유료 서비스는 월간 또는 연간 구독 형태로 제공되며, 구독 기간이 종료되면 자동으로 갱신됩니다. 자동 갱신에는 등록된 결제수단(빌링키)이 사용됩니다.</li>
                            <li>이용자가 자동 갱신을 원하지 않는 경우, 구독 기간 만료 전에 해지 신청을 하여야 합니다.</li>
                            <li>결제는 회사가 지정한 전자금융업자(PortOne, KG이니시스, 토스페이먼츠 등)를 통해 처리되며, 해당 전자금융업자의 서비스 장애·중단·정책 변경으로 인한 결제 지연 또는 실패에 대하여 회사는 직접적인 귀책이 없는 범위에서 책임을 지지 않습니다.</li>
                            <li>이용자가 허위 정보로 결제하거나 타인의 결제수단을 도용한 경우, 회사는 서비스를 즉시 정지할 수 있으며, 이로 인한 손해는 이용자가 부담합니다.</li>
                        </ul>
                    </section>

                    {/* 제6조의2 — 크레딧 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제6조의2 (크레딧의 구매·사용·유효기간)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>크레딧은 월간 분석 한도를 초과하였을 때 추가 분석을 위해 구매하는 일회성 사용권으로, 유료 플랜과 별도로 판매됩니다.</li>
                            <li>크레딧은 회사가 별도로 유효기간을 정하지 않는 한 구매일로부터 <strong>12개월</strong>까지 유효하며, 유효기간이 경과한 크레딧은 자동 소멸됩니다.</li>
                            <li>크레딧을 사용하여 AI 분석을 실행한 시점에 크레딧은 차감되며, 분석 결과의 만족 여부, AI의 판단 내용, 외부 API의 응답 품질 등과 무관하게 차감된 크레딧은 환불되지 않습니다. 단, 회사의 시스템 장애로 분석이 완료되지 못한 경우에는 재충전 또는 환불됩니다.</li>
                            <li>크레딧은 이용자 본인 계정에서만 사용 가능하며, 타 계정으로의 양도·매매·현금화가 금지됩니다.</li>
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
                            <li><strong>상세 정책:</strong> 결제 수단별 처리 기준(카카오페이·토스·이니시스·App Store·Google Play), 부분 환불 계산 공식, 무료체험 환불 등 세부 사항은 <Link href="/refund-policy" className="text-primary underline font-medium">환불 정책</Link> 페이지를 참조하세요.</li>
                        </ul>
                    </section>

                    {/* 제8조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제8조 (이용자의 의무)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>이용자는 서비스 이용 시 관련 법령, 본 약관, 이용안내 등을 준수하여야 합니다.</li>
                            <li><strong>업로드 자료에 대한 책임:</strong> 이용자는 서비스에 업로드하거나 입력하는 모든 자료(진료이력 PDF, 건강검진 결과, 고객 인적사항, 보유 보험 정보 등)에 대하여 그 적법한 수집 권한 및 「개인정보 보호법」 제15조·제17조·제23조에 따른 <strong>정보주체의 별도 동의를 사전에 확보할 의무</strong>가 있으며, 해당 자료의 정확성·적법성·최신성에 대한 전적인 책임을 부담합니다.</li>
                            <li>이용자가 타인(고객)의 민감정보(진료이력·주민등록번호 등)에 대한 동의 없이 서비스를 이용한 경우 또는 부정확한 자료를 업로드한 경우, 그로부터 발생하는 모든 민·형사상 책임은 이용자가 부담하며, 회사가 제3자로부터 손해배상·행정제재·형사고소를 받은 경우 이용자는 회사에 전액 배상할 의무가 있습니다.</li>
                            <li>이용자(설계사)는 AI 분석 결과를 고객에게 설명·전달할 때, 해당 결과가 <strong>참고용 정보이며 최종 보험 가입·청구 결정이 아님</strong>을 고객에게 명확히 고지하여야 합니다.</li>
                            <li>이용자는 AI 분석 결과를 근거로 고객에게 확정적·보장적 표현(&quot;반드시 가입 가능&quot;, &quot;청구가 확실히 된다&quot; 등)을 사용하여서는 안 되며, 이를 위반하여 발생하는 불완전판매·허위·과장표시 등의 책임은 이용자 본인이 부담합니다.</li>
                            <li>이용자는 자신의 계정 정보를 관리할 책임이 있으며, 이를 제3자에게 양도하거나 대여할 수 없습니다.</li>
                            <li>이용자는 공유 링크를 생성한 경우, 해당 링크가 의도하지 않은 제3자에게 유출되지 않도록 관리할 책임이 있으며, 공유 링크를 통해 접근한 자의 2차 유출·오남용에 대해서는 이용자 본인의 책임으로 합니다.</li>
                            <li>이용자는 다음 각 호의 행위를 하여서는 안 됩니다.
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>서비스의 기술적 구조, AI 분석 로직, 프롬프트, 알고리즘 등 회사의 지적재산을 역공학(reverse engineering), 디컴파일, 크롤링, 스크래핑 등의 방법으로 추출하거나 복제하는 행위</li>
                                    <li>서비스에서 제공하는 데이터, 분석 결과, UI/UX 디자인 등을 무단으로 복제하여 동일하거나 유사한 서비스를 개발하는 행위</li>
                                    <li>API 호출을 자동화하거나 비정상적인 방법으로 대량의 데이터를 수집하는 행위</li>
                                    <li>서비스의 보안 체계를 우회하거나 취약점을 악용하는 행위</li>
                                    <li>AI 분석 결과를 조작·왜곡하여 타인에게 제공하거나, 회사의 분석 결과인 것처럼 오인하게 할 수 있는 형태로 가공·유포하는 행위</li>
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

                    {/* 제10조 — 면책조항 (대폭 강화) */}
                    <section className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-3">제10조 (AI 분석 결과에 관한 면책)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>본 서비스가 제공하는 <strong>AI 분석 결과는 참고 자료일 뿐이며</strong>, 의학적 진단·소견·처방, 법률자문, 금융상품 권유·자문, 보험가입 확약 또는 보험금 지급 결정을 의미하지 않습니다.</li>
                            <li>보험 가입 가능 여부의 최종 판단은 각 보험회사의 인수(언더라이팅) 기준에 따라 결정되며, 보험금 청구 가능 여부의 최종 판단은 해당 보험약관 및 보험사의 심사에 따라 결정됩니다. 회사는 AI 분석 결과와 실제 보험사 심사 결과 간 차이에 대해 책임을 지지 않습니다.</li>
                            <li><strong>AI 기술의 본질적 한계:</strong> 인공지능은 학습 데이터의 한계, 확률적 추론의 특성, 생성형 모델의 이른바 &quot;환각(hallucination)&quot; 현상 등으로 인해 사실과 다른 내용을 생성할 수 있습니다. 이용자는 이 특성을 충분히 인지한 상태에서 서비스를 이용하며, AI가 생성한 문장·수치·판정의 오류에 대해 회사는 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.</li>
                            <li><strong>입력 자료의 오류:</strong> 이용자가 업로드한 PDF·입력값이 부정확하거나 판독 불능·훼손·누락된 경우, 이로부터 발생한 AI 분석 결과의 오류에 대해 회사는 책임을 지지 않습니다.</li>
                            <li><strong>질병 위험도 리포트, 예상 의료비 시뮬레이션(Future-Me), 모의 영수증 기능</strong>은 통계·평균치·확률적 모델에 기반한 <strong>교육·설명·상담 보조 목적의 예시</strong>이며, 실제 의료비·질병 발생·보장금액을 보장하지 않습니다. 해당 결과를 고객에게 제공·설명할 때 이용자는 이러한 참고적 성격을 함께 안내하여야 합니다.</li>
                            <li>AI 분석 결과는 작성 시점의 보험사 상품·약관·심사기준을 반영하며, 이후의 상품·약관·법령 개정으로 결과가 달라질 수 있습니다. 회사는 과거 분석 결과의 지속적 유효성을 보장하지 않습니다.</li>
                        </ul>
                    </section>

                    {/* 제10조의2 — 외부 서비스 의존에 따른 면책 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제10조의2 (외부 서비스 의존에 따른 면책)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>본 서비스는 AI 분석(Anthropic, OpenRouter 등), 의료·보험 데이터 연동(CODEF, 건강보험심사평가원, 국민건강보험공단, 내보험다보여 등), 결제(PortOne, KG이니시스, 토스페이먼츠), 호스팅(Vercel, Supabase) 등 제3자 서비스에 의존합니다.</li>
                            <li>위 제3자 서비스의 장애·중단·정책 변경·요금 변경·응답 지연·데이터 오류로 인해 서비스 제공이 일시 중단되거나 결과가 달라지는 경우, 회사는 가능한 범위 내에서 신속히 대응할 의무를 부담하되, 그 외 직접적 귀책 없는 손해에 대하여는 책임을 지지 않습니다.</li>
                            <li>천재지변, 전쟁, 테러, 화재, 정전, 정부의 규제, 해킹, DDoS 공격 등 불가항력적 사유로 인한 서비스 중단·장애에 대해 회사는 책임을 지지 않습니다.</li>
                        </ul>
                    </section>

                    {/* 제10조의3 — 책임 제한 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제10조의3 (손해배상의 범위 및 한도)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>회사는 고의 또는 중대한 과실이 없는 한, 이용자에게 발생한 <strong>간접손해, 특별손해, 결과적 손해, 일실이익, 영업기회 상실, 제3자에 대한 배상금, 명예·신용 훼손 등</strong>에 대하여 책임을 지지 않습니다.</li>
                            <li>회사의 이용자에 대한 총 손해배상액은, 관련 법령에서 달리 정하지 않는 한, 손해 발생일 직전 <strong>6개월간 해당 이용자가 회사에 지급한 이용료의 총액</strong>을 한도로 합니다. 무료 이용자의 경우 배상 한도는 실제 지급한 금액이 없으므로 법령상 허용되는 최소 범위로 한정됩니다.</li>
                            <li>이용자가 본 약관 제8조의 의무를 위반하여 회사 또는 제3자에게 손해를 끼친 경우, 이용자는 회사가 입은 모든 손해(소송비용·변호사비·행정제재금 포함)를 배상할 의무를 부담합니다.</li>
                        </ul>
                    </section>

                    {/* 제10조의4 — 정보주체(고객)와의 관계 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제10조의4 (고객·정보주체와의 관계)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>이용자(설계사)가 서비스에 입력·업로드한 고객의 개인정보·건강정보에 대하여, 회사는 이용자로부터 위탁받아 처리하는 개인정보처리자 또는 수탁자의 지위에 있으며, <strong>정보주체(고객)에 대한 수집·이용 동의의 확보 의무는 이용자에게 있습니다</strong>.</li>
                            <li>정보주체인 고객이 회사에 대하여 열람·정정·삭제·처리정지 등을 요구하는 경우, 회사는 이용자에게 해당 사실을 고지하고 협력을 요청할 수 있으며, 이용자는 관련 요청에 지체 없이 협조하여야 합니다.</li>
                            <li>정보주체의 동의 없는 수집·이용·제공으로 인하여 제기되는 손해배상, 과징금, 행정제재에 대하여는 해당 이용자가 전적으로 책임을 부담하며, 회사에 책임이 귀속된 경우 이용자는 회사에 구상할 의무가 있습니다.</li>
                        </ul>
                    </section>

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
                        <p className="text-muted-foreground">본 약관은 2026년 4월 19일부터 시행합니다. 종전 약관은 본 약관의 시행일부터 효력을 상실합니다.</p>
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
