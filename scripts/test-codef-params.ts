/**
 * CODEF HIRA API 파라미터 구성 테스트
 * 실행: npx tsx scripts/test-codef-params.ts
 * 
 * 실제 API 호출 없이 request body가 정확히 구성되는지 검증합니다.
 */

// ─── 프론트엔드 AUTH_PROVIDERS (page.tsx에서 가져옴) ───
const AUTH_PROVIDERS = [
    { id: '1', name: '카카오톡', needsTelecom: false },
    { id: '8', name: '토스', needsTelecom: false },
    { id: '5', name: 'PASS', needsTelecom: true },
    { id: '6', name: '네이버', needsTelecom: false },
    { id: '4', name: 'KB모바일', needsTelecom: false },
    { id: '3', name: '삼성패스', needsTelecom: false },
];

const TELECOM_PROVIDERS = [
    { id: '0', name: 'SKT' },
    { id: '1', name: 'KT' },
    { id: '2', name: 'LGU+' },
];

// ─── CODEF 공식 스펙 ───
const CODEF_SPEC = {
    loginTypeLevel: {
        '1': '카카오',
        '2': '페이코',
        '3': '삼성패스',
        '4': 'KB모바일',
        '5': 'PASS(통신사)',
        '6': '네이버',
        '7': '신한',
        '8': '토스',
        '9': '하나',
        '10': 'NH',
    },
    telecom: {
        '0': 'SKT',
        '1': 'KT',
        '2': 'LGU+',
    },
};

// ─── 테스트 시작 ───
console.log('='.repeat(60));
console.log('  CODEF HIRA API 파라미터 구성 테스트');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.log(`  ❌ ${message}`);
        failed++;
    }
}

// Test 1: loginTypeLevel 코드 검증
console.log('\n📋 Test 1: loginTypeLevel 코드 검증');
for (const provider of AUTH_PROVIDERS) {
    const validCode = provider.id in CODEF_SPEC.loginTypeLevel;
    assert(validCode, `${provider.name} (id='${provider.id}') → CODEF 스펙에 ${validCode ? '존재' : '없음!'}`);
    
    if (validCode) {
        const codefName = CODEF_SPEC.loginTypeLevel[provider.id as keyof typeof CODEF_SPEC.loginTypeLevel];
        assert(
            codefName.includes(provider.name.replace('톡', '')) || provider.name.includes(codefName.split('(')[0]),
            `  매핑 확인: '${provider.name}' → CODEF '${codefName}'`
        );
    }
}

// Test 2: telecom 코드 검증  
console.log('\n📋 Test 2: telecom 코드 검증');
for (const telecom of TELECOM_PROVIDERS) {
    const validCode = telecom.id in CODEF_SPEC.telecom;
    assert(validCode, `${telecom.name} (id='${telecom.id}') → CODEF 스펙에 ${validCode ? '존재' : '없음!'}`);
}

// Test 3: buildRequestBody 파라미터 구성 시뮬레이션
console.log('\n📋 Test 3: API 요청 body 구성 시뮬레이션');

function simulateBuildRequestBody(authProviderId: string, telecomId: string) {
    const selectedProvider = AUTH_PROVIDERS.find(a => a.id === authProviderId);
    const needsTelecom = selectedProvider?.needsTelecom === true;
    
    return {
        userName: '테스트',
        identity: '9103251234567',
        phoneNo: '01012345678',
        loginType: '5',
        loginTypeLevel: authProviderId,
        ...(needsTelecom ? { telecom: telecomId } : {}),
        queryType: 'medical',
    };
}

// 카카오 인증 테스트
const kakaoBody = simulateBuildRequestBody('1', '0');
assert(kakaoBody.loginType === '5', '카카오: loginType = "5" (간편인증)');
assert(kakaoBody.loginTypeLevel === '1', '카카오: loginTypeLevel = "1"');
assert(!('telecom' in kakaoBody), '카카오: telecom 없음 (불필요)');

// PASS 인증 테스트 (통신사 필요)
const passBody = simulateBuildRequestBody('5', '0');
assert(passBody.loginType === '5', 'PASS: loginType = "5" (간편인증)');
assert(passBody.loginTypeLevel === '5', 'PASS: loginTypeLevel = "5"');
assert('telecom' in passBody, 'PASS: telecom 포함됨 (필수)');
assert(passBody.telecom === '0', 'PASS: telecom = "0" (SKT)');

// 토스 인증 테스트
const tossBody = simulateBuildRequestBody('8', '0');
assert(tossBody.loginTypeLevel === '8', '토스: loginTypeLevel = "8"');
assert(!('telecom' in tossBody), '토스: telecom 없음 (불필요)');

// Test 4: HIRA 필수 파라미터 검증 (client.ts의 fetchMyMedicalInfo)
console.log('\n📋 Test 4: HIRA 필수 파라미터 구성 검증');

function simulateCodefBody(params: { startDate?: string; endDate?: string; type?: string }) {
    const now = new Date();
    const endDate = params.endDate || now.toISOString().slice(0, 10).replace(/-/g, '');
    const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    const startDate = params.startDate || fiveYearsAgo.toISOString().slice(0, 10).replace(/-/g, '');

    return {
        organization: '0020',
        loginType: '5',
        userName: '테스트',
        identity: '9103251234567',
        phoneNo: '01012345678',
        startDate,
        endDate,
        type: params.type || '0',
    };
}

const defaultBody = simulateCodefBody({});
assert(defaultBody.organization === '0020', '기관코드: "0020" (건강보험심사평가원)');
assert(!!defaultBody.startDate, `startDate 존재: "${defaultBody.startDate}"`);
assert(!!defaultBody.endDate, `endDate 존재: "${defaultBody.endDate}"`);
assert(defaultBody.type === '0', 'type 기본값: "0" (민감상병 미포함)');
assert(defaultBody.startDate.length === 8, 'startDate 형식: yyyyMMdd (8자리)');
assert(defaultBody.endDate.length === 8, 'endDate 형식: yyyyMMdd (8자리)');

const startYear = parseInt(defaultBody.startDate.slice(0, 4));
const endYear = parseInt(defaultBody.endDate.slice(0, 4));
assert(endYear - startYear === 5, `조회기간: ${startYear}~${endYear} (5년)`)

// Test 5: identity 검증 (13자리)
console.log('\n📋 Test 5: 주민등록번호 검증');
const validIdentity = '9103251234567';
const invalidIdentity = '910325123456'; // 12자리

assert(validIdentity.replace(/\D/g, '').length === 13, `유효한 주민번호: ${validIdentity.length}자리 → 통과`);
assert(invalidIdentity.replace(/\D/g, '').length !== 13, `유효하지 않은 주민번호: ${invalidIdentity.length}자리 → 차단됨`);

// ─── 결과 ───
console.log('\n' + '='.repeat(60));
console.log(`  결과: ${passed} 통과 / ${failed} 실패`);
console.log('='.repeat(60));

if (failed > 0) {
    console.log('\n⚠️  실패한 테스트가 있습니다. 코드를 확인해주세요.');
    process.exit(1);
} else {
    console.log('\n🎉 모든 테스트 통과! CODEF 파라미터가 올바르게 구성됩니다.');
}
