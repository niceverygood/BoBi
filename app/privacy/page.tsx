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
                <p className="text-muted-foreground mb-8">최종 수정일: 2026년 4월 19일</p>

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
                            ※ 서비스 이용 과정에서 IP 주소, 접속 로그, 브라우저 정보, 기기 식별자, 이용 기록, 페이지 방문 이력, 오류(Error) 로그 및 성능 지표가 자동으로 수집될 수 있습니다.
                        </p>
                    </section>

                    {/* 1조의2 — 자동 수집 도구 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제1조의2 (자동 수집 정보 및 쿠키·분석 도구)</h2>
                        <p className="text-muted-foreground mb-2">회사는 서비스 품질 개선·오류 대응·통계 분석을 위해 다음의 자동 수집 도구를 사용합니다.</p>
                        <div className="bg-muted/30 rounded-lg p-4">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2 font-semibold">도구</th>
                                        <th className="text-left p-2 font-semibold">수집 목적</th>
                                        <th className="text-left p-2 font-semibold">수집 항목</th>
                                    </tr>
                                </thead>
                                <tbody className="text-muted-foreground">
                                    <tr className="border-b">
                                        <td className="p-2">PostHog</td>
                                        <td className="p-2">제품 이용 통계·A/B 테스트</td>
                                        <td className="p-2">페이지 이동, 클릭 이벤트, 세션 식별자, 이용 빈도</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">Sentry</td>
                                        <td className="p-2">오류 트래킹 및 성능 모니터링</td>
                                        <td className="p-2">오류 스택트레이스, 기기·브라우저 정보, IP, 오류 발생 시각</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">Meta Pixel (Facebook Pixel)</td>
                                        <td className="p-2">인스타그램·페이스북 광고 전환 측정 (회원가입·체험 시작·결제 완료)</td>
                                        <td className="p-2">페이지 이동, 회원가입·결제 이벤트, 결제 금액(개인 식별 정보 미포함), 기기·브라우저 정보, IP. 이메일·이름 등 개인정보는 전송하지 않습니다.</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2">쿠키 및 로컬 저장소</td>
                                        <td className="p-2">로그인 세션 유지, 설정값 저장</td>
                                        <td className="p-2">세션 토큰, 사용자 환경 설정</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">
                            이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 로그인 유지 등 서비스 일부 기능이 제한될 수 있습니다. 분석 도구 사용을 원치 않는 경우 고객센터로 요청하시면 해당 이용자에 한하여 수집이 중지될 수 있습니다.
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
                            <li><strong>설계사 공유 PDF/분석 결과:</strong> 설계사 계정 유지 기간 동안 보관하며, 설계사 탈퇴 또는 고객의 삭제 요청 시 즉시 파기합니다.</li>
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
                        <div className="bg-muted/30 rounded-lg p-4 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2 font-semibold">수탁 업체</th>
                                        <th className="text-left p-2 font-semibold">위탁 업무</th>
                                    </tr>
                                </thead>
                                <tbody className="text-muted-foreground">
                                    <tr className="border-b">
                                        <td className="p-2">Supabase Inc. (미국)</td>
                                        <td className="p-2">데이터베이스 저장, 인증(Auth), 파일 스토리지</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">Anthropic, PBC / OpenRouter (미국)</td>
                                        <td className="p-2">AI 분석 처리 (고지사항 분석, 상품 판단, 청구 안내, 질병 위험도 리포트, Future-Me 시뮬레이션). 진료일, 진단코드(KCD), 진단명, 처방약품명, 건강검진 수치 등 건강 관련 데이터가 API를 통해 전송됩니다. <strong>전송된 데이터는 해당 업체의 AI 모델 학습·튜닝에 사용되지 않으며</strong>, 해당 업체의 데이터 보존 정책(통상 30일 이내)에 따라 삭제됩니다.</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">CODEF / 헥토데이터 (한국)</td>
                                        <td className="p-2">건강보험심사평가원, 국민건강보험공단, 내보험다보여 데이터 연동 (진료정보, 건강검진결과, 보험계약정보 조회). 본인인증 시 이름, 주민등록번호, 전화번호가 전송됩니다.</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">PortOne (한국)</td>
                                        <td className="p-2">결제 모듈 중계 및 빌링키 관리</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">KG이니시스 (한국)</td>
                                        <td className="p-2">신용카드·간편결제 PG 결제 승인 및 정산</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">토스페이먼츠 (한국)</td>
                                        <td className="p-2">정기결제(빌링키) 발급 및 월정액 청구</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">PostHog Inc. (미국/EU)</td>
                                        <td className="p-2">제품 이용 통계·A/B 테스트 분석</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">Functional Software, Inc. (Sentry, 미국)</td>
                                        <td className="p-2">오류 트래킹 및 성능 모니터링</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">Meta Platforms, Inc. (미국/아일랜드)</td>
                                        <td className="p-2">Meta Pixel을 통한 인스타그램·페이스북 광고 전환 측정 및 효율 분석. 페이지 방문·회원가입·결제 이벤트와 결제 금액 정보가 전송됩니다. 이메일·이름 등 개인 식별 정보는 전송되지 않습니다.</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">Kakao Corp. (한국)</td>
                                        <td className="p-2">카카오 계정을 통한 소셜 로그인, 카카오톡 알림 발송</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2">Vercel Inc. (미국)</td>
                                        <td className="p-2">웹 서비스 호스팅 및 CDN</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">
                            회사는 위탁계약 체결 시 「개인정보 보호법」 제26조에 따라 개인정보가 안전하게 관리될 수 있도록 필요한 사항을 계약에 반영하고, 수탁자에 대한 관리·감독을 수행합니다. 수탁업체가 변경되는 경우 본 방침의 개정을 통해 공지합니다.
                        </p>
                    </section>

                    {/* 제5조의0 — 국외 이전 */}
                    <section className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-3">제5조의0 (개인정보의 국외 이전)</h2>
                        <p className="text-muted-foreground mb-3">회사는 「개인정보 보호법」 제28조의8에 따라 다음과 같이 개인정보를 국외로 이전하고 있습니다.</p>
                        <div className="bg-background rounded-lg p-4 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left p-2 font-semibold">이전 국가</th>
                                        <th className="text-left p-2 font-semibold">이전받는 자</th>
                                        <th className="text-left p-2 font-semibold">이전 항목</th>
                                        <th className="text-left p-2 font-semibold">이전 일시·방법</th>
                                        <th className="text-left p-2 font-semibold">이용 목적 및 보유·이용 기간</th>
                                    </tr>
                                </thead>
                                <tbody className="text-muted-foreground">
                                    <tr className="border-b">
                                        <td className="p-2">미국</td>
                                        <td className="p-2">Supabase Inc.<br/>(privacy@supabase.com)</td>
                                        <td className="p-2">이메일, 이름, 소속, 분석 결과, 업로드 파일 메타데이터</td>
                                        <td className="p-2">서비스 이용 시점, TLS 암호화 네트워크 전송</td>
                                        <td className="p-2">서비스 제공 및 회원 관리 / 회원 탈퇴 시까지</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">미국</td>
                                        <td className="p-2">Anthropic, PBC / OpenRouter<br/>(privacy@anthropic.com)</td>
                                        <td className="p-2">진료일, 진단코드(KCD), 진단명, 처방약품 성분명, 건강검진 수치 (이름·주민등록번호 등 직접 식별자 제외)</td>
                                        <td className="p-2">분석 요청 시점마다, HTTPS API 전송</td>
                                        <td className="p-2">AI 분석 처리 / 처리 완료 후 해당 업체 보존 정책에 따라 삭제(통상 30일 이내)</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">미국</td>
                                        <td className="p-2">Vercel Inc.<br/>(privacy@vercel.com)</td>
                                        <td className="p-2">IP, 접속 로그, 요청 헤더</td>
                                        <td className="p-2">서비스 이용 시점, HTTPS</td>
                                        <td className="p-2">호스팅·CDN 운영 / 운영 필요 기간</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">미국</td>
                                        <td className="p-2">Functional Software, Inc. (Sentry)</td>
                                        <td className="p-2">오류 스택트레이스, 브라우저·기기 정보, IP</td>
                                        <td className="p-2">오류 발생 시점, HTTPS</td>
                                        <td className="p-2">오류 트래킹 / 최대 90일</td>
                                    </tr>
                                    <tr className="border-b">
                                        <td className="p-2">미국/EU</td>
                                        <td className="p-2">PostHog Inc.</td>
                                        <td className="p-2">세션 식별자, 이벤트 로그, 페이지 경로</td>
                                        <td className="p-2">서비스 이용 시점, HTTPS</td>
                                        <td className="p-2">이용 통계 분석 / 최대 1년</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2">미국/아일랜드</td>
                                        <td className="p-2">Meta Platforms, Inc.<br/>(privacy@meta.com)</td>
                                        <td className="p-2">페이지 방문·회원가입·결제 이벤트, 결제 금액, 브라우저·기기 정보, IP</td>
                                        <td className="p-2">서비스 이용 시점, HTTPS</td>
                                        <td className="p-2">광고 전환 측정 / Meta 정책에 따름</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-muted-foreground mt-3 text-sm">
                            이용자는 개인정보의 국외 이전에 거부할 권리가 있으며, 거부 시 서비스 이용이 제한될 수 있습니다. 거부 의사 표시는 고객센터(010-2309-7443)를 통해 가능합니다.
                        </p>
                    </section>

                    {/* 6조 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제5조의2 (민감정보 및 건강정보 처리)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>회사는 정보주체(이용자 또는 고객)의 건강 관련 정보(진료이력, 진단명, 처방내역, 건강검진 결과 등)를 「개인정보 보호법」 제23조에 따라 <strong>정보주체의 별도 동의</strong>를 받아 수집·처리합니다.</li>
                            <li>수집된 건강정보는 AI 보험 분석(고지사항 분석, 가입가능 상품 판단, 질병 위험도 리포트, 예상 의료비 시뮬레이션, 보험금 청구 안내) 목적으로만 사용되며, 해당 목적 외로는 이용되지 않습니다.</li>
                            <li>AI 분석을 위해 건강정보는 AI 서비스 제공업체(Anthropic, OpenRouter 등 미국 소재)에 API 방식으로 전송됩니다. 전송 시 이용자 또는 고객의 이름, 주민등록번호, 연락처, 정확한 주소 등 <strong>직접 식별자는 포함되지 않으며</strong>, 진단명·진료내역·검진수치·연령대 등 분석에 필요한 최소한의 정보만 전송됩니다.</li>
                            <li>AI 서비스 제공업체에 전송된 데이터는 해당 업체의 기업 API 이용 정책에 따라 <strong>AI 모델의 학습·튜닝에 사용되지 않으며</strong>, 해당 업체의 데이터 보존 기간(통상 30일 이내) 경과 후 삭제됩니다.</li>
                            <li>주민등록번호는 건강보험심사평가원·국민건강보험공단·내보험다보여 본인인증 목적으로만 CODEF/헥토데이터 API에 전송되며, <strong>회사 서버에 저장되지 않습니다</strong>.</li>
                            <li>정보주체는 건강정보 수집·이용 동의를 언제든 철회할 수 있으며, 철회 시 관련 데이터는 지체 없이 삭제됩니다. 단, 회사에 법령상 보관 의무가 있는 경우에는 해당 법령이 정한 기간 동안 분리 보관 후 파기합니다.</li>
                        </ul>
                    </section>

                    {/* 제5조의2-1 — 설계사가 입력한 고객정보 */}
                    <section className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
                        <h2 className="text-xl font-bold mb-3">제5조의2의2 (설계사(이용자)가 입력한 고객 개인정보의 처리)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>본 서비스는 보험설계사 등 전문 이용자가 자신이 상담하는 고객의 개인정보·건강정보를 입력·업로드하여 활용할 수 있는 업무보조 도구입니다.</li>
                            <li>이 경우 해당 고객 정보에 대한 <strong>개인정보처리자는 이용자(설계사 또는 그 소속 보험회사·보험대리점)</strong>이며, 회사는 이용약관 및 개인정보처리위탁계약에 따라 이용자의 처리 활동을 위탁받아 수행하는 <strong>수탁자</strong>의 지위에 있습니다.</li>
                            <li>따라서 고객 개인정보의 수집·이용·제공에 관한 「개인정보 보호법」상 <strong>정보주체(고객)의 동의 확보 의무, 고지 의무, 삭제·처리정지 요구에 대한 응답 의무는 이용자에게 있으며</strong>, 회사는 이용자의 위탁 범위 내에서 보조적 업무를 수행합니다.</li>
                            <li>고객 본인이 회사에 대하여 직접 열람·정정·삭제·처리정지를 요구하는 경우, 회사는 해당 요구를 지체 없이 이용자에게 통지하고 이용자의 지시에 따라 처리하거나, 이용자와의 협의를 통해 법령이 요구하는 조치를 취합니다.</li>
                            <li>이용자가 정보주체의 동의를 받지 않은 채 고객 정보를 입력·업로드하여 발생하는 민·형사상 책임, 과징금, 손해배상 등은 전적으로 이용자가 부담하며, 회사가 제3자로부터 책임 추궁을 받은 경우 이용자는 회사에 그에 상당하는 금액을 구상할 의무를 부담합니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">제5조의3 (분석 결과의 설계사 공유)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>고객의 진료정보를 기반으로 생성된 분석 결과(고지사항 분석, 상품 판단, 질병 위험도 리포트, 가상 사고 영수증 등) 및 PDF 리포트는 해당 고객을 담당하는 보험설계사와 공유될 수 있습니다.</li>
                            <li>보험설계사는 공유받은 분석 결과를 <strong>보험 상담 목적으로만</strong> 활용하여야 하며, 이를 제3자에게 제공하거나 상담 외 목적으로 사용할 수 없습니다.</li>
                            <li>설계사가 공유받은 분석 결과를 목적 외로 사용하거나 제3자에게 제공하여 발생하는 분쟁 및 법적 책임은 해당 설계사에게 귀속됩니다.</li>
                            <li>고객은 분석 결과의 설계사 공유를 거부할 수 있으며, 거부 시 해당 데이터는 설계사에게 제공되지 않습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold mb-3">제5조의4 (가명·익명 처리 정보의 통계·연구 활용)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>
                                회사는 「개인정보 보호법」 제28조의2(가명정보의 처리) 및 제58조의2(적용제외)에 따라,
                                수집된 개인정보 중 <strong>개인을 식별할 수 없도록 가명처리 또는 익명처리된 정보</strong>를
                                다음 각 목의 목적으로 활용할 수 있습니다.
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>통계 작성 및 학술 연구</li>
                                    <li>공익적 기록 보존</li>
                                    <li>AI 모델 학습 및 서비스 품질 개선</li>
                                    <li>질병 예측 알고리즘 고도화</li>
                                    <li>보험 상품 개발 및 보장 공백 분석을 위한 통계 자료 제공</li>
                                    <li>헬스케어·의료 연구기관과의 공동 연구</li>
                                </ul>
                            </li>
                            <li>
                                가명·익명 처리 대상 정보는 다음과 같습니다:
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>연령대(10세 단위), 성별, 지역(시·도 단위)</li>
                                    <li>질병 분류 코드(KCD) 및 진료 패턴</li>
                                    <li>복용 약물 성분명</li>
                                    <li>건강검진 수치(BMI, 혈압, 혈당, 콜레스테롤 등)</li>
                                    <li>AI 분석 결과 및 위험도 점수</li>
                                </ul>
                                <p className="mt-2 text-xs">
                                    ※ 이름, 주민등록번호, 연락처, 이메일, 정확한 주소 등 <strong>개인을 직접 식별할 수 있는 정보는 제외</strong>됩니다.
                                </p>
                            </li>
                            <li>
                                가명·익명 처리된 정보는 제3자(보험회사, 헬스케어 기업, 연구기관 등)에게 제공될 수 있으며,
                                이 경우 <strong>재식별이 불가능하도록 기술적·관리적 조치</strong>를 적용합니다.
                            </li>
                            <li>
                                가명정보의 처리 및 제공 시 회사는 다음 조치를 준수합니다:
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>식별자(이름, 주민번호 등) 완전 삭제 또는 일방향 암호화(SHA-256 해시)</li>
                                    <li>식별 가능성 축소를 위한 일반화 처리 (예: 생년월일 → 연령대)</li>
                                    <li>가명정보 처리 대장 관리 및 접근 권한 제한</li>
                                    <li>재식별 시도 금지 및 결합·분석 결과 공개 금지</li>
                                    <li>안전성 확보 조치(암호화, 접근통제) 적용</li>
                                </ul>
                            </li>
                            <li>
                                이용자는 자신의 정보가 가명·익명 처리되어 활용되는 것에 대해 거부할 권리가 있으며,
                                거부 의사를 표시한 경우 해당 이용자의 정보는 통계·연구 목적 활용에서 제외됩니다.
                                거부는 서비스 내 설정 페이지 또는 고객센터(010-2309-7443)를 통해 가능합니다.
                            </li>
                            <li>
                                본 조에 따른 가명·익명 처리 정보 활용은 관련 법령이 정하는 범위 내에서 이루어지며,
                                「개인정보 보호법」, 「가명정보 처리 가이드라인」, 「신용정보의 이용 및 보호에 관한 법률」 등을 준수합니다.
                            </li>
                        </ul>
                    </section>

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
                        <p className="text-muted-foreground mb-2">회사는 개인정보의 안전성 확보를 위해 다음과 같은 기술적·관리적·물리적 조치를 취하고 있습니다.</p>
                        <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                            <li>비밀번호의 단방향 해시 저장(bcrypt 등)</li>
                            <li>SSL/TLS를 통한 데이터 전송 암호화 및 전 구간 HTTPS</li>
                            <li>역할 기반 접근 권한 관리 및 최소 권한 원칙</li>
                            <li>Row-Level Security(RLS)를 통한 DB 레벨 접근 통제</li>
                            <li>개인정보 접근·처리 로그 기록 및 정기 감사</li>
                            <li>주민등록번호 비저장 원칙 (본인인증 중계 즉시 폐기)</li>
                            <li>침입탐지·차단 시스템 운영 및 보안 취약점 주기적 점검</li>
                        </ul>
                    </section>

                    {/* 제10조 — 만 14세 미만 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제10조 (만 14세 미만 아동의 개인정보 보호)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>본 서비스는 보험설계사 등 전문 이용자를 대상으로 하는 B2B 서비스로서, 만 14세 미만 아동의 회원가입을 허용하지 않습니다.</li>
                            <li>이용자(설계사)가 고객 상담을 위해 만 14세 미만 아동의 건강정보를 입력·업로드하는 경우, 이용자는 <strong>「개인정보 보호법」 제22조의2에 따라 해당 아동의 법정대리인(부모 등)의 동의를 사전에 확보할 의무</strong>가 있으며, 회사는 이용자가 법정대리인 동의를 확보하였음을 전제로 해당 자료를 위탁 처리합니다.</li>
                            <li>법정대리인은 언제든지 해당 아동의 개인정보에 대한 열람, 정정, 삭제, 처리정지를 이용자 또는 회사에 요구할 수 있습니다.</li>
                        </ul>
                    </section>

                    {/* 제11조 — AI 처리 고지 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제11조 (AI 자동화 처리에 대한 고지)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>회사는 이용자가 업로드한 건강정보를 인공지능(AI) 모델을 통해 자동으로 분석·분류·예측합니다. 이에는 고지사항 분류, 보험 가입 가능 여부 판정, 보험금 청구 가능 여부 판정, 질병 위험도 점수 산출 등이 포함됩니다.</li>
                            <li>AI 자동화 처리는 확률적·통계적 모델에 기반하므로 오분류·오예측의 가능성이 존재하며, 그 결과는 확정적 판단이 아닌 <strong>참고 자료</strong>로 제공됩니다.</li>
                            <li>정보주체는 자동화된 의사결정에 대하여 설명을 요구하거나 거부할 수 있으며, 이 경우 회사는 가능한 범위에서 사람(담당자)에 의한 추가 검토 또는 대안적 안내를 제공합니다. 단, 서비스의 본질상 AI 분석을 거부하는 경우 핵심 기능의 이용이 제한될 수 있습니다.</li>
                        </ul>
                    </section>

                    {/* 제12조 — 방침 변경 */}
                    <section>
                        <h2 className="text-xl font-bold mb-3">제12조 (개인정보처리방침의 변경)</h2>
                        <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                            <li>본 개인정보처리방침의 내용이 추가·삭제·수정되는 경우, 시행일 7일 전부터 서비스 내 공지사항 또는 본 페이지를 통해 공지합니다.</li>
                            <li>이용자의 권리에 중요한 영향을 미치는 변경(수집 항목 확대, 이용 목적 추가, 제3자 제공·국외 이전 추가 등)이 있는 경우 30일 전부터 공지하고, 필요한 경우 별도 동의를 받습니다.</li>
                        </ul>
                    </section>

                    {/* 부칙 */}
                    <section className="border-t pt-6">
                        <h2 className="text-xl font-bold mb-3">부칙</h2>
                        <p className="text-muted-foreground">본 개인정보처리방침은 2026년 4월 19일부터 시행합니다. 종전 방침은 본 방침의 시행일부터 효력을 상실합니다.</p>
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
