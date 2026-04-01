// lib/codef/client.ts
// 코드에프(CODEF) API 클라이언트
// 내보험다보여 계약정보 조회 연동

const CODEF_TOKEN_URL = 'https://oauth.codef.io/oauth/token';
const CODEF_API_URL = process.env.CODEF_API_URL || 'https://api.codef.io';

let cachedToken: { token: string; expiresAt: number } | null = null;

// ─── CODEF 응답 파싱 (URL 디코딩 필요) ──────────────
// CODEF API는 응답 body를 form-urlencoded 방식으로 URL 인코딩하여 반환함
// +는 공백을 의미하므로 decodeURIComponent 전에 치환 필요
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function parseCodefResponse<T = any>(res: Response): Promise<T> {
    const text = await res.text();
    try {
        const parsed = JSON.parse(text) as T;
        return decodeCodefStrings(parsed);
    } catch {
        const decoded = decodeURIComponent(text.replace(/\+/g, ' '));
        return JSON.parse(decoded) as T;
    }
}

// CODEF JSON 내부의 URL-인코딩된 문자열 값을 재귀적으로 디코딩
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function decodeCodefStrings<T>(obj: T): T {
    if (typeof obj === 'string') {
        try {
            return decodeURIComponent(obj.replace(/\+/g, ' ')) as unknown as T;
        } catch {
            return obj.replace(/\+/g, ' ') as unknown as T;
        }
    }
    if (Array.isArray(obj)) {
        return obj.map(decodeCodefStrings) as unknown as T;
    }
    if (obj !== null && typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
            result[key] = decodeCodefStrings(value);
        }
        return result as T;
    }
    return obj;
}

// ─── 토큰 발급 ──────────────────────────────────────

export async function getAccessToken(): Promise<string> {
    // 캐시된 토큰이 유효하면 재사용
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
        return cachedToken.token;
    }

    const clientId = process.env.CODEF_CLIENT_ID;
    const clientSecret = process.env.CODEF_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('CODEF_CLIENT_ID 또는 CODEF_CLIENT_SECRET 환경변수가 설정되지 않았습니다.');
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch(CODEF_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${credentials}`,
        },
        body: 'grant_type=client_credentials&scope=read',
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`CODEF 토큰 발급 실패: ${res.status} ${text}`);
    }

    const data = await res.json();
    cachedToken = {
        token: data.access_token,
        // 토큰 만료 5분 전에 갱신 (기본 7일 유효)
        expiresAt: Date.now() + (data.expires_in ? data.expires_in * 1000 - 300000 : 6 * 24 * 60 * 60 * 1000),
    };

    return cachedToken.token;
}

// ─── Connected ID 생성 ─────────────────────────────

interface CreateConnectedIdParams {
    organization: string;   // 기관코드 (내보험다보여 = '0320')
    loginType: string;      // '0': 공동인증서, '1': 간편인증
    loginId?: string;       // 내보험다보여 로그인 ID
    loginPassword?: string; // 내보험다보여 로그인 PW
    identity?: string;      // 주민등록번호
    birthDate?: string;     // 생년월일 (yyMMdd)
}

export async function createConnectedId(params: CreateConnectedIdParams): Promise<string> {
    const token = await getAccessToken();

    const res = await fetch(`${CODEF_API_URL}/v1/account/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            accountList: [{
                countryCode: 'KR',
                businessType: 'IN',
                clientType: 'P',
                organization: params.organization,
                loginType: params.loginType,
                id: params.loginId,
                password: params.loginPassword,
                identity: params.identity,
                birthDate: params.birthDate,
            }],
        }),
    });

    const data = await parseCodefResponse<{ result?: { code: string; message: string }; data?: Record<string, unknown> }>(res);

    if (data.result?.code !== 'CF-00000') {
        // 2-Way 인증 필요
        if (data.result?.code === 'CF-03002') {
            return JSON.stringify({
                requires2Way: true,
                method: data.data?.method,
                jobIndex: data.data?.jobIndex,
                threadIndex: data.data?.threadIndex,
                jti: data.data?.jti,
                twoWayTimestamp: data.data?.twoWayTimestamp,
                extraInfo: data.data?.extraInfo,
            });
        }
        throw new Error(`Connected ID 생성 실패: ${data.result?.code} ${data.result?.message}`);
    }

    return (data.data?.connectedId as string) || '';
}

// ─── 내보험다보여 계약정보 조회 ───────────────────────

interface InsuranceContract {
    resCompanyName: string;        // 보험사명
    resProductName: string;        // 상품명
    resContractDate: string;       // 계약일
    resExpiryDate: string;         // 만기일
    resPremium: string;            // 보험료
    resContractStatus: string;     // 계약상태
    resPaymentPeriod?: string;     // 납입기간
    resInsuredPerson?: string;     // 피보험자
    resCoverageLists?: CoverageItem[];        // 보장내용 리스트
    resSpecialAgreeDetLists?: SpecialAgreeItem[]; // 특약상세 리스트
}

interface CoverageItem {
    resNumber?: string;            // 순번
    resCoverageName: string;       // 보장명칭
    resCoverageAmount: string;     // 보장금액
    resAgreementType?: string;     // 약정구분
    resCoverageStatus?: string;    // 보장상태
    resCoverageCode?: string;      // 보장코드
    resReasonForPayment?: string;  // 지급사유 및 보험료
    resInsuredPerson?: string;     // 주피보험자
}

interface SpecialAgreeItem {
    resType?: string;              // 구분 (1: 주계약, 2: 특약)
    resHostSpecAgreeName: string;  // 주계약 및 특약명
    resJoinAmount?: string;        // 가입금액
    resPremium?: string;           // 보험료
    resPeriodOfInsurance?: string; // 보험기간
    resPaymentPeriod?: string;     // 납입기간
}

export interface CodefInsuranceResponse {
    result: {
        code: string;
        message: string;
    };
    data: InsuranceContract[] | InsuranceContract;
}

export async function fetchInsuranceContracts(connectedId: string): Promise<InsuranceContract[]> {
    const token = await getAccessToken();

    const res = await fetch(`${CODEF_API_URL}/v1/kr/insurance/b/credit-info/contract-info`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            connectedId,
            organization: '0320',  // 신용정보원(내보험다보여)
        }),
    });

    const data: CodefInsuranceResponse = await parseCodefResponse(res);

    if (data.result?.code !== 'CF-00000') {
        // 2-Way 추가 인증 필요
        if (data.result?.code === 'CF-03002') {
            throw new Error(`CODEF_2WAY:${JSON.stringify(data.data)}`);
        }
        throw new Error(`계약정보 조회 실패: ${data.result?.code} ${data.result?.message}`);
    }

    // 단건이면 배열로 변환
    const contracts = Array.isArray(data.data) ? data.data : [data.data];
    return contracts;
}

// ─── 보험사 기관코드 매핑 ─────────────────────────────

export const INSURER_CODES: Record<string, string> = {
    '삼성생명': '0001', '한화생명': '0002', '교보생명': '0003',
    '동양생명': '0005', '메트라이프생명': '0006', '흥국생명': '0007',
    'DB생명': '0010', '푸본현대생명': '0012', 'AIA생명': '0013',
    'ABL생명': '0014', '신한라이프': '0016', 'KB생명': '0019',
    'NH농협생명': '0021', 'iM라이프': '0023',
    '삼성화재': '0101', '현대해상': '0102', 'DB손해보험': '0103',
    'KB손해보험': '0104', '롯데손해보험': '0107',
    'MG손해보험': '0108', '흥국화재': '0109', '한화손해보험': '0111',
    'NH농협손해보험': '0112', '하나손해보험': '0114',
    '메리츠화재': '0117',
};

// ─── 보험사별 계약 상세 조회 ──────────────────────────

export interface InsurerContractDetail {
    resCompanyName: string;
    resProductName: string;
    resContractDate: string;
    resExpiryDate: string;
    resPremium: string;
    resContractStatus: string;
    resPaymentPeriod?: string;
    resPaymentCycle?: string;
    resContractType?: string;       // 계약유형
    resProductType?: string;        // 상품유형
    resInsuredPerson?: string;
    resLoanAmount?: string;         // 대출금액
    resSurrenderValue?: string;     // 해약환급금
    // 보장내역
    resCoverageLists?: CoverageItem[];
    // 특약상세
    resSpecialAgreeDetLists?: SpecialAgreeItem[];
    // 보장분석 통계
    resCoverageAnalysisLists?: CoverageAnalysisItem[];
}

interface CoverageAnalysisItem {
    resCoverageCategory?: string;   // 보장 카테고리
    resCoverageName: string;
    resCoverageAmount: string;
    resRecommendedAmount?: string;  // 권장 보장 금액
    resCoverageStatus?: string;     // 적정/부족/과다
}

export async function fetchInsurerContractDetail(
    connectedId: string,
    organization: string,
): Promise<InsurerContractDetail[]> {
    const token = await getAccessToken();

    const res = await fetch(`${CODEF_API_URL}/v1/kr/insurance/a/insurer-product/contract-info`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            connectedId,
            organization,
        }),
    });

    const data = await parseCodefResponse(res);

    if (data.result?.code !== 'CF-00000') {
        if (data.result?.code === 'CF-03002') {
            throw new Error(`CODEF_2WAY:${JSON.stringify(data.data)}`);
        }
        throw new Error(`보험사 계약 상세 조회 실패: ${data.result?.code} ${data.result?.message}`);
    }

    const contracts = Array.isArray(data.data) ? data.data : [data.data];
    return contracts;
}

// ─── 내보험다보여 보장분석 통계 조회 ─────────────────

export interface CoverageStatResponse {
    // 실손형 보장분석 통계
    resRealLossCoverageAnalysisLists?: {
        resCoverageCategory: string;
        resCoverageName: string;
        resTotalAmount: string;
        resCompanyCounts: string;
    }[];
    // 정액형 보장분석 통계
    resFixedCoverageAnalysisLists?: {
        resCoverageCategory: string;
        resCoverageName: string;
        resTotalAmount: string;
        resCompanyCounts: string;
    }[];
}

// ─── 보험 상품/약관 정보 변환 ────────────────────────

export interface ProductTermsInfo {
    insurer: string;
    product_name: string;
    contract_date: string;
    expiry_date: string;
    monthly_premium: number;
    status: string;
    product_type?: string;
    payment_period?: string;
    surrender_value?: number;
    loan_amount?: number;
    // 주계약
    main_coverage: {
        name: string;
        amount: number;
        premium?: number;
        period?: string;
    }[];
    // 특약 목록
    riders: {
        name: string;
        amount: number;
        premium?: number;
        period?: string;
        payment_period?: string;
    }[];
    // 보장내역 (통합)
    all_coverages: {
        name: string;
        amount: number;
        type?: string;
        status?: string;
        reason_for_payment?: string;
    }[];
}

export function transformContractToTerms(contract: InsurerContractDetail): ProductTermsInfo {
    const mainCoverage: ProductTermsInfo['main_coverage'] = [];
    const riders: ProductTermsInfo['riders'] = [];
    const allCoverages: ProductTermsInfo['all_coverages'] = [];

    // 보장내역(resCoverageLists)
    if (contract.resCoverageLists) {
        for (const cov of contract.resCoverageLists) {
            if (!cov.resCoverageName) continue;
            allCoverages.push({
                name: cov.resCoverageName,
                amount: parseAmount(cov.resCoverageAmount),
                type: cov.resAgreementType,
                status: cov.resCoverageStatus,
                reason_for_payment: cov.resReasonForPayment,
            });
        }
    }

    // 특약상세(resSpecialAgreeDetLists) → 주계약/특약 분리
    if (contract.resSpecialAgreeDetLists) {
        for (const spec of contract.resSpecialAgreeDetLists) {
            if (!spec.resHostSpecAgreeName) continue;
            const item = {
                name: spec.resHostSpecAgreeName,
                amount: parseAmount(spec.resJoinAmount || ''),
                premium: parseAmount(spec.resPremium || ''),
                period: spec.resPeriodOfInsurance,
                payment_period: spec.resPaymentPeriod,
            };

            if (spec.resType === '1') {
                mainCoverage.push(item);
            } else {
                riders.push(item);
            }
        }
    }

    return {
        insurer: contract.resCompanyName || '',
        product_name: contract.resProductName || '',
        contract_date: parseDate(contract.resContractDate),
        expiry_date: parseDate(contract.resExpiryDate),
        monthly_premium: parseAmount(contract.resPremium),
        status: contract.resContractStatus || '',
        product_type: contract.resProductType,
        payment_period: contract.resPaymentPeriod,
        surrender_value: contract.resSurrenderValue ? parseAmount(contract.resSurrenderValue) : undefined,
        loan_amount: contract.resLoanAmount ? parseAmount(contract.resLoanAmount) : undefined,
        main_coverage: mainCoverage,
        riders,
        all_coverages: allCoverages,
    };
}

// ─── 코드에프 응답 → BoBi CoverageInput 변환 ────────

import type { CoverageInput, Policy, Coverage } from '@/types/coverage';

function parseDate(dateStr: string): string {
    if (!dateStr) return '';
    // YYYYMMDD → YYYY-MM-DD
    if (dateStr.length === 8 && !dateStr.includes('-')) {
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
}

function parseAmount(amountStr: string): number {
    if (!amountStr) return 0;
    return parseInt(amountStr.replace(/[^0-9]/g, ''), 10) || 0;
}

function mapContractStatus(status: string): '유지' | '실효' | '해지' | '만기' {
    const s = status?.trim();
    if (s?.includes('유지') || s?.includes('정상')) return '유지';
    if (s?.includes('실효')) return '실효';
    if (s?.includes('해지') || s?.includes('해약')) return '해지';
    if (s?.includes('만기')) return '만기';
    return '유지';
}

function guessCoverageType(name: string): Coverage['coverage_type'] {
    if (/진단|확정/.test(name)) return '진단';
    if (/일당|입원/.test(name)) return '일당';
    if (/수술/.test(name)) return '수술';
    if (/사망|상해사망/.test(name)) return '사망';
    if (/실손|의료비/.test(name)) return '실손';
    if (/배상|운전|자동차/.test(name)) return '배상';
    if (/후유장해|장해/.test(name)) return '후유장해';
    return '기타';
}

function guessCategory(name: string): string {
    if (/암|종양|유사암|소액암|고액암/.test(name)) return '암';
    if (/뇌|뇌혈관|뇌졸중|뇌출혈|뇌경색/.test(name)) return '뇌혈관';
    if (/심장|심근경색|심부전|허혈성|협심증/.test(name)) return '심장';
    if (/사망/.test(name)) return '사망';
    if (/수술/.test(name)) return '수술';
    if (/입원|일당/.test(name)) return '입원';
    if (/통원|처방조제/.test(name)) return '통원';
    if (/실손|의료비/.test(name)) return '실손';
    if (/후유장해|장해/.test(name)) return '후유장해';
    if (/배상|운전/.test(name)) return '배상책임';
    if (/당뇨|고혈압|치매/.test(name)) return '기타 진단비';
    return '기타';
}

export function transformCodefToBobi(
    contracts: InsuranceContract[],
    customerName: string,
    customerBirth: string,
    customerGender: 'M' | 'F',
): CoverageInput {
    const policies: Policy[] = contracts.map(contract => {
        const coverages: Coverage[] = [];

        // 1. resCoverageLists에서 보장 항목 추출
        if (contract.resCoverageLists && contract.resCoverageLists.length > 0) {
            for (const cov of contract.resCoverageLists) {
                if (!cov.resCoverageName) continue;
                // 소멸/해지 상태 보장은 제외
                if (cov.resCoverageStatus && /소멸|해지|만료/.test(cov.resCoverageStatus)) continue;

                coverages.push({
                    coverage_name: cov.resCoverageName,
                    coverage_amount: parseAmount(cov.resCoverageAmount),
                    coverage_type: guessCoverageType(cov.resCoverageName),
                    category: guessCategory(cov.resCoverageName),
                });
            }
        }

        // 2. resSpecialAgreeDetLists에서 특약 정보 추출
        if (contract.resSpecialAgreeDetLists && contract.resSpecialAgreeDetLists.length > 0) {
            for (const spec of contract.resSpecialAgreeDetLists) {
                if (!spec.resHostSpecAgreeName) continue;
                // 이미 resCoverageLists에서 추가된 동일 보장은 스킵
                const alreadyExists = coverages.some(c =>
                    c.coverage_name === spec.resHostSpecAgreeName
                );
                if (alreadyExists) continue;

                coverages.push({
                    coverage_name: spec.resHostSpecAgreeName,
                    coverage_amount: parseAmount(spec.resJoinAmount || ''),
                    coverage_type: guessCoverageType(spec.resHostSpecAgreeName),
                    category: guessCategory(spec.resHostSpecAgreeName),
                });
            }
        }

        return {
            insurer: contract.resCompanyName || '',
            product_name: contract.resProductName || '',
            contract_date: parseDate(contract.resContractDate),
            expiry_date: parseDate(contract.resExpiryDate),
            monthly_premium: parseAmount(contract.resPremium),
            status: mapContractStatus(contract.resContractStatus),
            renewal_type: '비갱신', // 코드에프 응답에 갱신 유형이 없으면 기본값
            coverages,
        };
    });

    return {
        customer: {
            name: customerName,
            birth: customerBirth,
            gender: customerGender,
        },
        policies: policies.filter(p => p.insurer && p.coverages.length > 0), // 보장 있는 것만
    };
}

// ─── HIRA 내진료정보 조회 API ────────────────────────
// 건강보험심사평가원 내진료정보열람
// /v1/kr/public/hw/hira-list/my-medical-information

export interface HiraMedicalRequest {
    userName: string;          // 사용자 이름 (필수)
    identity: string;          // 주민등록번호 13자리 (필수)
    phoneNo: string;           // 전화번호 - loginType="5" 필수
    loginType: string;         // '2': 인증서/휴대폰, '5': 간편인증
    loginTypeLevel?: string;   // loginType="5": '1'카카오 '3'삼성패스 '4'KB모바일 '5'PASS '6'네이버 '7'신한 '8'토스 '10'NH
    telecom?: string;          // loginType="5" + loginTypeLevel="5" 필수. '0':SKT(알뜰폰 포함), '1':KT(알뜰폰 포함), '2':LGU+(알뜰폰 포함)
    id?: string;               // 세션 식별 ID (다건 요청 시 필수, 선택)
    startDate?: string;        // 조회시작일 yyyyMMdd (필수)
    endDate?: string;          // 조회종료일 yyyyMMdd (필수)
    type?: string;             // 민감상병 포함 여부 '0':미포함, '1':포함 (default: '0')
    // 2-Way 추가인증 관련
    twoWayInfo?: {
        jobIndex: number;
        threadIndex: number;
        jti: string;
        twoWayTimestamp: number;
    };
    is2Way?: boolean;
    simpleAuth?: string;       // 간편인증 2-Way: '0'=cancel, '1'=ok
    secureNo?: string;         // 보안문자 (2-Way)
    secureNoRefresh?: string;  // 보안문자 새로고침 (2-Way)
    smsAuthNo?: string;        // SMS 인증번호 (2-Way)
}

// 기본진료내역
export interface HiraBasicTreatRecord {
    resTreatStartDate?: string;    // 진료시작일
    resHospitalName?: string;      // 병/의원&약국
    resDepartment?: string;        // 진단과
    resTreatType?: string;         // 타입 (외래/입원 등)
    resDiseaseCode?: string;       // 주상병코드
    resDiseaseName?: string;       // 주상병명
    resVisitDays?: string;         // 내원일수
    resTotalAmount?: string;       // 총 진료비
    resPublicCharge?: string;      // 혜택받은 금액
    resDeductibleAmt?: string;     // 내가 낸 의료비
    resHospitalCode?: string;      // 병원코드
}

// 세부진료정보
export interface HiraDetailTreatRecord {
    resTreatStartDate?: string;    // 진료시작일
    resHospitalName?: string;      // 병/의원&약국
    resTreatType?: string;         // 진료형태
    resCodeName?: string;          // 코드명
    resOneDose?: string;           // 1회 투약량
    resDailyDosesNumber?: string;  // 1일 투여횟수
    resTotalDosingdays?: string;   // 총 투약일수
}

// 처방조제정보
export interface HiraPrescribeDrugRecord {
    resTreatStartDate?: string;    // 진료시작일
    resHospitalName?: string;      // 병/의원&약국
    resTreatType?: string;         // 진료형태
    resDrugName?: string;          // 약품명
    resIngredients?: string;       // 성분명
    resOneDose?: string;           // 1회 투약량
    resDailyDosesNumber?: string;  // 1일 투여횟수
    resTotalDosingdays?: string;   // 총 투약일수
}

// 내진료정보열람 통합 레코드 (프론트엔드 호환용)
export interface HiraMedicalRecord {
    commName?: string;
    commStartDate?: string;
    commEndDate?: string;
    resBasicTreatList?: HiraBasicTreatRecord[];
    resDetailTreatList?: HiraDetailTreatRecord[];
    resPrescribeDrugList?: HiraPrescribeDrugRecord[];
}

export interface HiraMedicalResponse {
    result: { code: string; message: string };
    data: HiraMedicalRecord | HiraMedicalRecord[] | {
        continue2Way?: boolean;
        method?: string;
        jobIndex?: number;
        threadIndex?: number;
        jti?: string;
        twoWayTimestamp?: number;
        extraInfo?: Record<string, string>;
    };
}

export async function fetchMyMedicalInfo(params: HiraMedicalRequest): Promise<{
    records: HiraMedicalRecord[];
    requires2Way?: boolean;
    twoWayData?: Record<string, unknown>;
}> {
    const token = await getAccessToken();

    const now = new Date();
    const endDate = params.endDate || now.toISOString().slice(0, 10).replace(/-/g, '');
    const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    const startDate = params.startDate || fiveYearsAgo.toISOString().slice(0, 10).replace(/-/g, '');

    const body: Record<string, unknown> = {
        organization: '0020',
        loginType: params.loginType,
        loginTypeLevel: params.loginTypeLevel || '',
        userName: params.userName,
        identity: params.identity,
        phoneNo: params.phoneNo,
        telecom: params.telecom || '',
        id: params.id || '',
        startDate,
        endDate,
        type: params.type || '0',
    };

    // 2-Way 추가인증
    if (params.is2Way && params.twoWayInfo) {
        body.is2Way = true;
        body.twoWayInfo = params.twoWayInfo;
        body.simpleAuth = params.simpleAuth || '1';
        body.secureNo = params.secureNo || '';
        body.secureNoRefresh = params.secureNoRefresh || '0';
        if (params.smsAuthNo) body.smsAuthNo = params.smsAuthNo;
    }

    console.log('[CODEF] fetchMyMedicalInfo request:', JSON.stringify({
        ...body,
        identity: `${String(body.identity).slice(0, 4)}*****`,
        phoneNo: `***${String(body.phoneNo).slice(-4)}`,
    }, null, 2));

    const res = await fetch(`${CODEF_API_URL}/v1/kr/public/hw/hira-list/my-medical-information`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    const data: HiraMedicalResponse = await parseCodefResponse(res);
    console.log('[CODEF] fetchMyMedicalInfo response:', data.result?.code, data.result?.message);

    if (data.result?.code === 'CF-03002') {
        return {
            records: [],
            requires2Way: true,
            twoWayData: data.data as Record<string, unknown>,
        };
    }

    if (data.result?.code !== 'CF-00000') {
        throw new Error(`내진료정보 조회 실패: ${data.result?.code} ${data.result?.message}`);
    }

    const responseData = data.data;
    let records: HiraMedicalRecord[] = [];
    if (Array.isArray(responseData)) {
        records = responseData;
    } else if (responseData && 'resBasicTreatList' in responseData) {
        records = [responseData as HiraMedicalRecord];
    }

    return { records };
}

// ─── HIRA 자동차보험 진료정보 조회 API ───────────────
// 건강보험심사평가원 내 진료정보 열람(자동차보험)
// /v1/kr/public/hw/hira-list/my-car-insurance

// 자동차보험 기본진료내역
export interface HiraCarBasicTreatRecord {
    resTreatStartDate?: string;    // 진료시작일
    resHospitalName?: string;      // 병/의원&약국
    resDepartment?: string;        // 진단과
    resTreatType?: string;         // 타입
    resDiseaseCode?: string;       // 주상병코드
    resDiseaseName?: string;       // 주상병명
    resTreatDate?: string;         // 진료일수
    resTotalAmount?: string;       // 청구진료비 총금액
    resMedicalFee?: string;        // 자동차보험 총진료비
}

export interface HiraCarInsuranceRecord {
    commName?: string;
    commStartDate?: string;
    commEndDate?: string;
    resBasicTreatList?: HiraCarBasicTreatRecord[];
    resDetailTreatList?: HiraDetailTreatRecord[];
}

export interface HiraCarInsuranceResponse {
    result: { code: string; message: string };
    data: HiraCarInsuranceRecord | HiraCarInsuranceRecord[] | {
        continue2Way?: boolean;
        method?: string;
        jobIndex?: number;
        threadIndex?: number;
        jti?: string;
        twoWayTimestamp?: number;
        extraInfo?: Record<string, string>;
    };
}

export async function fetchMyCarInsurance(params: HiraMedicalRequest): Promise<{
    records: HiraCarInsuranceRecord[];
    requires2Way?: boolean;
    twoWayData?: Record<string, unknown>;
}> {
    const token = await getAccessToken();

    const now = new Date();
    const endDate = params.endDate || now.toISOString().slice(0, 10).replace(/-/g, '');
    const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    const startDate = params.startDate || fiveYearsAgo.toISOString().slice(0, 10).replace(/-/g, '');

    const body: Record<string, unknown> = {
        organization: '0020',
        loginType: params.loginType,
        loginTypeLevel: params.loginTypeLevel || '',
        userName: params.userName,
        identity: params.identity,
        phoneNo: params.phoneNo,
        telecom: params.telecom || '',
        id: params.id || '',
        startDate,
        endDate,
        type: params.type || '0',
    };

    if (params.is2Way && params.twoWayInfo) {
        body.is2Way = true;
        body.twoWayInfo = params.twoWayInfo;
        body.simpleAuth = params.simpleAuth || '1';
        body.secureNo = params.secureNo || '';
        body.secureNoRefresh = params.secureNoRefresh || '0';
        if (params.smsAuthNo) body.smsAuthNo = params.smsAuthNo;
    }

    console.log('[CODEF] fetchMyCarInsurance request:', JSON.stringify({
        ...body,
        identity: `${String(body.identity).slice(0, 4)}*****`,
        phoneNo: `***${String(body.phoneNo).slice(-4)}`,
    }, null, 2));

    const res = await fetch(`${CODEF_API_URL}/v1/kr/public/hw/hira-list/my-car-insurance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    const data: HiraCarInsuranceResponse = await parseCodefResponse(res);
    console.log('[CODEF] fetchMyCarInsurance response:', data.result?.code, data.result?.message);

    if (data.result?.code === 'CF-03002') {
        return {
            records: [],
            requires2Way: true,
            twoWayData: data.data as Record<string, unknown>,
        };
    }

    if (data.result?.code !== 'CF-00000') {
        throw new Error(`자동차보험 조회 실패: ${data.result?.code} ${data.result?.message}`);
    }

    const responseData = data.data;
    let records: HiraCarInsuranceRecord[] = [];
    if (Array.isArray(responseData)) {
        records = responseData;
    } else if (responseData && 'resBasicTreatList' in responseData) {
        records = [responseData as HiraCarInsuranceRecord];
    }

    return { records };
}

