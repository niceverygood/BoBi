// lib/kcd/client-utils.ts
// 클라이언트 컴포넌트에서 사용할 수 있는 경량 KCD 유틸 함수
// 전체 DB를 로드하지 않고, 기본적인 포맷/아이콘 함수만 제공

/**
 * KCD 코드의 대분류에 따른 신체부위 아이콘 반환
 */
export function getBodyPartIcon(code: string): string {
    if (!code) return '🏥';
    const c = code.toUpperCase().trim();

    // 대분류별 아이콘 매핑
    if (c.startsWith('A') || c.startsWith('B')) return '🦠'; // 감염
    if (c.startsWith('C') || c.startsWith('D0')) return '🔬'; // 신생물(암)
    if (c >= 'D5' && c < 'E0') return '🩸'; // 혈액/면역
    if (c.startsWith('E')) return '⚗️'; // 내분비/대사
    if (c.startsWith('F')) return '🧠'; // 정신
    if (c.startsWith('G')) return '🧠'; // 신경
    if (c.startsWith('H0') || c.startsWith('H1') || c.startsWith('H2') || c.startsWith('H3') || c.startsWith('H4') || c.startsWith('H5')) return '👁️'; // 눈
    if (c.startsWith('H6') || c.startsWith('H7') || c.startsWith('H8') || c.startsWith('H9')) return '👂'; // 귀
    if (c.startsWith('I')) return '❤️'; // 순환계(심혈관)
    if (c.startsWith('J')) return '🫁'; // 호흡기
    if (c.startsWith('K')) return '🫃'; // 소화기
    if (c.startsWith('L')) return '🧴'; // 피부
    if (c.startsWith('M')) return '🦴'; // 근골격
    if (c.startsWith('N')) return '🫘'; // 비뇨생식
    if (c.startsWith('O')) return '🤰'; // 임신/출산
    if (c.startsWith('P')) return '👶'; // 출생전후기
    if (c.startsWith('Q')) return '🧬'; // 선천기형
    if (c.startsWith('R')) return '🔍'; // 증상/징후
    if (c.startsWith('S') || c.startsWith('T')) return '🩹'; // 손상/중독
    if (c.startsWith('V') || c.startsWith('W') || c.startsWith('X') || c.startsWith('Y')) return '⚡'; // 외인
    if (c.startsWith('Z')) return '📋'; // 건강상태
    if (c.startsWith('U')) return '🏷️'; // 특수목적

    return '🏥';
}

/**
 * 진단코드를 보기 좋게 포맷 (AI가 제공한 진단명과 함께)
 */
export function formatDiagnosisDisplay(
    code: string,
    aiProvidedName?: string
): { icon: string; displayName: string; code: string } {
    const icon = getBodyPartIcon(code);
    return {
        icon,
        displayName: aiProvidedName || code,
        code: code || '',
    };
}
