// lib/codef/client.ts
// 코드에프(CODEF) API 클라이언트
// 내보험다보여 계약정보 조회 연동

const CODEF_TOKEN_URL = 'https://oauth.codef.io/oauth/token';
const CODEF_API_URL = process.env.CODEF_API_URL || 'https://development.codef.io'; // 정식: https://api.codef.io

let cachedToken: { token: string; expiresAt: number } | null = null;

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

    const data = await res.json();

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

    return data.data?.connectedId || '';
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

    const data: CodefInsuranceResponse = await res.json();

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
    if (/심장|심근경색|허혈성|협심증/.test(name)) return '심장';
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
