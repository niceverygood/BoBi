// lib/naver/trend.ts
// 네이버 데이터랩 검색 트렌드 API 클라이언트

const API_URL = 'https://naveropenapi.apigw.ntruss.com/datalab/v1/search';

// 보험 관련 키워드 카테고리
export const INSURANCE_KEYWORDS = [
    // 보험 운영
    '갱신', '해지', '환급', '인상', '환급금', '중도해지',
    // 질병/건강
    '암', '뇌경색', '심장', '치매', '입원', '수술', '간병', '당뇨', '골절',
    // 라이프
    '출산', '태아', '첫째', '둘째', '퇴직', '부모님',
    // 행동
    '비교', '추천', '가입', '청구', '필요',
    // 노후
    '연금', '노후', '간병인', '실버',
];

// 네이버 API 연령 코드
// "1":0-12, "2":13-18, "3":19-24, "4":25-29, "5":30-34, "6":35-39,
// "7":40-44, "8":45-49, "9":50-54, "10":55-59, "11":60+
export const AGE_GROUPS = [
    { label: '30대', ages: ['5', '6'] },
    { label: '40대', ages: ['7', '8'] },
    { label: '50대', ages: ['9', '10'] },
    { label: '60대+', ages: ['11'] },
] as const;

export const GENDERS = [
    { label: '남성', code: 'm' },
    { label: '여성', code: 'f' },
] as const;

interface NaverTrendResult {
    title: string;
    keywords: string[];
    data: Array<{ period: string; ratio: number }>;
}

interface NaverTrendResponse {
    startDate: string;
    endDate: string;
    timeUnit: string;
    results: NaverTrendResult[];
}

// 키워드를 5개씩 묶어서 API 호출 (API 제한: 요청당 최대 5개 keywordGroup)
function chunkKeywords(keywords: string[], size: number): string[][] {
    const chunks: string[][] = [];
    for (let i = 0; i < keywords.length; i += size) {
        chunks.push(keywords.slice(i, i + size));
    }
    return chunks;
}

// 날짜 포맷 (yyyy-MM-dd)
function formatDate(d: Date): string {
    return d.toISOString().split('T')[0];
}

// 네이버 검색 트렌드 API 호출
async function fetchTrend(
    keywords: string[],
    ages: string[],
    gender: string,
    startDate: string,
    endDate: string,
): Promise<NaverTrendResult[]> {
    const clientId = process.env.NAVER_SEARCH_TREND_CLIENT_ID;
    const clientSecret = process.env.NAVER_SEARCH_TREND_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error('NAVER_SEARCH_TREND_CLIENT_ID / SECRET 미설정');
    }

    const keywordGroups = keywords.map(kw => ({
        groupName: kw,
        keywords: [kw + ' 보험'], // "갱신 보험", "암 보험" 등으로 검색
    }));

    const body = {
        startDate,
        endDate,
        timeUnit: 'week',
        keywordGroups,
        ages,
        gender,
    };

    const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-NCP-APIGW-API-KEY-ID': clientId,
            'X-NCP-APIGW-API-KEY': clientSecret,
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        console.error(`[NaverTrend] API 에러 (${res.status}):`, errText);
        return [];
    }

    const data: NaverTrendResponse = await res.json();
    return data.results || [];
}

export interface TrendKeyword {
    keyword: string;
    thisWeek: number;
    lastWeek: number;
    changeRate: number; // 증감률 (%)
}

export interface TrendGroup {
    ageLabel: string;
    gender: string;
    genderLabel: string;
    topKeywords: TrendKeyword[];
    fetchedAt: string;
}

// 특정 연령·성별의 급상승 키워드 TOP N 계산
export async function fetchTrendingKeywords(
    ages: string[],
    gender: string,
    topN: number = 5,
): Promise<TrendKeyword[]> {
    const now = new Date();
    const endDate = formatDate(now);
    // 3주 전부터 조회 (이번 주 + 지난 주 비교용)
    const start = new Date(now);
    start.setDate(start.getDate() - 21);
    const startDate = formatDate(start);

    const chunks = chunkKeywords(INSURANCE_KEYWORDS, 5);
    const allResults: TrendKeyword[] = [];

    for (const chunk of chunks) {
        try {
            const results = await fetchTrend(chunk, ages, gender, startDate, endDate);

            for (const r of results) {
                const data = r.data || [];
                if (data.length < 2) continue;

                const thisWeek = data[data.length - 1]?.ratio ?? 0;
                const lastWeek = data[data.length - 2]?.ratio ?? 0;

                const changeRate = lastWeek > 0
                    ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
                    : thisWeek > 0 ? 100 : 0;

                allResults.push({
                    keyword: r.title,
                    thisWeek,
                    lastWeek,
                    changeRate,
                });
            }
        } catch (err) {
            console.error('[NaverTrend] chunk 처리 에러:', err);
        }

        // API rate limit 방지 (100ms 간격)
        await new Promise(r => setTimeout(r, 100));
    }

    // 증감률 내림차순 정렬 → TOP N
    return allResults
        .filter(k => k.thisWeek > 0) // 검색량 0인 키워드 제외
        .sort((a, b) => b.changeRate - a.changeRate)
        .slice(0, topN);
}

// 전체 연령·성별 조합의 트렌드 데이터 수집
export async function fetchAllTrends(): Promise<TrendGroup[]> {
    const results: TrendGroup[] = [];

    for (const age of AGE_GROUPS) {
        for (const gender of GENDERS) {
            console.log(`[NaverTrend] ${age.label} ${gender.label} 수집 중...`);

            const topKeywords = await fetchTrendingKeywords(
                [...age.ages],
                gender.code,
                5,
            );

            results.push({
                ageLabel: age.label,
                gender: gender.code,
                genderLabel: gender.label,
                topKeywords,
                fetchedAt: new Date().toISOString(),
            });
        }
    }

    return results;
}
