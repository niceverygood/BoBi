// lib/health/trend-analyzer.ts
// 건강검진 다년도 데이터 추이 분석 + 악화 속도 계산 + 골든타임 경고

export interface CheckupSnapshot {
    year: string;
    bmi?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    fastingGlucose?: number;
    totalCholesterol?: number;
    hdl?: number;
    ldl?: number;
    triglyceride?: number;
    ast?: number;
    alt?: number;
    gtp?: number;
    hemoglobin?: number;
    gfr?: number;
}

export interface TrendPoint {
    year: string;
    value: number;
}

export interface TrendAnalysis {
    metric: string;
    label: string;
    unit: string;
    points: TrendPoint[];
    changeRate: number; // 연평균 변화율 (%)
    direction: 'improving' | 'worsening' | 'stable';
    currentStatus: 'normal' | 'borderline' | 'abnormal';
    normalRange: { min?: number; max?: number };
    alert?: string; // 경고 메시지
    goldenTime?: string; // 골든타임 경고
}

const METRIC_CONFIG: Record<string, {
    label: string;
    unit: string;
    normalMin?: number;
    normalMax?: number;
    borderlineMax?: number;
    higherIsWorse: boolean;
}> = {
    bmi: { label: 'BMI', unit: '', normalMin: 18.5, normalMax: 23, borderlineMax: 25, higherIsWorse: true },
    bloodPressureSystolic: { label: '수축기 혈압', unit: 'mmHg', normalMax: 120, borderlineMax: 140, higherIsWorse: true },
    bloodPressureDiastolic: { label: '이완기 혈압', unit: 'mmHg', normalMax: 80, borderlineMax: 90, higherIsWorse: true },
    fastingGlucose: { label: '공복혈당', unit: 'mg/dL', normalMax: 100, borderlineMax: 126, higherIsWorse: true },
    totalCholesterol: { label: '총콜레스테롤', unit: 'mg/dL', normalMax: 200, borderlineMax: 240, higherIsWorse: true },
    hdl: { label: 'HDL 콜레스테롤', unit: 'mg/dL', normalMin: 60, higherIsWorse: false },
    ldl: { label: 'LDL 콜레스테롤', unit: 'mg/dL', normalMax: 130, borderlineMax: 160, higherIsWorse: true },
    triglyceride: { label: '중성지방', unit: 'mg/dL', normalMax: 150, borderlineMax: 200, higherIsWorse: true },
    ast: { label: 'AST', unit: 'U/L', normalMax: 40, higherIsWorse: true },
    alt: { label: 'ALT', unit: 'U/L', normalMax: 40, higherIsWorse: true },
    gtp: { label: 'γ-GTP', unit: 'U/L', normalMax: 50, higherIsWorse: true },
    gfr: { label: '신사구체여과율', unit: 'mL/min', normalMin: 60, higherIsWorse: false },
};

// CODEF 응답에서 다년도 검진 데이터 추출
export function extractCheckupSnapshots(checkupData: unknown): CheckupSnapshot[] {
    const data = checkupData as { resPreviewList?: Array<Record<string, unknown>>; resResultList?: unknown[] };
    const list = data?.resPreviewList || [];

    const snapshots: CheckupSnapshot[] = [];
    for (const item of list) {
        const year = String(item.resCheckupYear || '').trim();
        if (!year) continue;

        const bp = String(item.resBloodPressure || '');
        const bpMatch = bp.match(/(\d+)[\/ ](\d+)/);

        snapshots.push({
            year,
            bmi: toNum(item.resBMI),
            bloodPressureSystolic: bpMatch ? Number(bpMatch[1]) : undefined,
            bloodPressureDiastolic: bpMatch ? Number(bpMatch[2]) : undefined,
            fastingGlucose: toNum(item.resFastingBloodSuger),
            totalCholesterol: toNum(item.resTotalCholesterol),
            hdl: toNum(item.resHDLCholesterol),
            ldl: toNum(item.resLDLCholesterol),
            triglyceride: toNum(item.resTriglyceride),
            ast: toNum(item.resAST),
            alt: toNum(item.resALT),
            gtp: toNum(item.resyGPT || item.resGTP || item.resGpt),
            hemoglobin: toNum(item.resHemoglobin),
            gfr: toNum(item.resGFR),
        });
    }

    // 연도 오름차순
    return snapshots.sort((a, b) => a.year.localeCompare(b.year));
}

function toNum(val: unknown): number | undefined {
    if (val === null || val === undefined || val === '') return undefined;
    const n = Number(String(val).replace(/[^0-9.\-]/g, ''));
    return isNaN(n) ? undefined : n;
}

// 특정 지표의 추이 분석
export function analyzeTrend(
    snapshots: CheckupSnapshot[],
    metric: keyof CheckupSnapshot,
): TrendAnalysis | null {
    const config = METRIC_CONFIG[metric as string];
    if (!config || snapshots.length === 0) return null;

    const points: TrendPoint[] = snapshots
        .map(s => ({ year: s.year, value: s[metric] as number | undefined }))
        .filter((p): p is TrendPoint => p.value !== undefined);

    if (points.length === 0) return null;

    const latest = points[points.length - 1];
    const earliest = points[0];

    // 연평균 변화율
    const yearDiff = Math.max(1, Number(latest.year) - Number(earliest.year));
    const totalChange = latest.value - earliest.value;
    const changeRate = yearDiff > 0 && earliest.value > 0
        ? Math.round((totalChange / earliest.value / yearDiff) * 100)
        : 0;

    // 방향 판단
    let direction: 'improving' | 'worsening' | 'stable' = 'stable';
    if (Math.abs(changeRate) < 2) {
        direction = 'stable';
    } else if (config.higherIsWorse) {
        direction = changeRate > 0 ? 'worsening' : 'improving';
    } else {
        direction = changeRate > 0 ? 'improving' : 'worsening';
    }

    // 현재 상태
    let currentStatus: 'normal' | 'borderline' | 'abnormal' = 'normal';
    if (config.higherIsWorse) {
        if (config.borderlineMax !== undefined && latest.value >= config.borderlineMax) {
            currentStatus = 'abnormal';
        } else if (config.normalMax !== undefined && latest.value > config.normalMax) {
            currentStatus = 'borderline';
        }
    } else {
        if (config.normalMin !== undefined && latest.value < config.normalMin) {
            currentStatus = 'abnormal';
        }
    }

    // 경고 생성
    let alert: string | undefined;
    let goldenTime: string | undefined;

    if (currentStatus === 'abnormal') {
        alert = `⚠️ ${config.label}이(가) 이상 범위입니다 (현재 ${latest.value}${config.unit})`;
    } else if (currentStatus === 'borderline' && direction === 'worsening') {
        alert = `⚠️ ${config.label}이(가) 경계 수치이며 악화 중입니다 (${changeRate > 0 ? '+' : ''}${changeRate}%/년)`;
        goldenTime = '지금이 보험 가입 골든타임입니다. 정식 진단 시 가입이 제한될 수 있습니다.';
    } else if (direction === 'worsening' && Math.abs(changeRate) >= 5) {
        alert = `📉 ${config.label}이(가) 연 ${changeRate > 0 ? '+' : ''}${changeRate}% 속도로 악화 중`;
    }

    return {
        metric: metric as string,
        label: config.label,
        unit: config.unit,
        points,
        changeRate,
        direction,
        currentStatus,
        normalRange: { min: config.normalMin, max: config.normalMax },
        alert,
        goldenTime,
    };
}

// 전체 지표 분석
export function analyzeAllTrends(snapshots: CheckupSnapshot[]): TrendAnalysis[] {
    const metrics: (keyof CheckupSnapshot)[] = [
        'bmi', 'bloodPressureSystolic', 'fastingGlucose',
        'totalCholesterol', 'hdl', 'ldl', 'triglyceride',
        'ast', 'alt', 'gtp', 'gfr',
    ];

    const results: TrendAnalysis[] = [];
    for (const metric of metrics) {
        const analysis = analyzeTrend(snapshots, metric);
        if (analysis && analysis.points.length >= 1) {
            results.push(analysis);
        }
    }
    return results;
}

// 우선순위 정렬: 이상 > 경계+악화 > 악화 > 기타
export function sortTrendsByPriority(trends: TrendAnalysis[]): TrendAnalysis[] {
    return [...trends].sort((a, b) => {
        const score = (t: TrendAnalysis) => {
            let s = 0;
            if (t.currentStatus === 'abnormal') s += 100;
            if (t.currentStatus === 'borderline') s += 50;
            if (t.direction === 'worsening') s += 30;
            if (t.alert) s += 10;
            return s;
        };
        return score(b) - score(a);
    });
}
