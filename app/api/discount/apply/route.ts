// app/api/discount/apply/route.ts
// ⛔ 할인코드 직접 적용 API — 사용 중단
// 모든 할인/쿠폰은 결제 페이지(subscribe)에서만 적용 가능
import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { error: '할인코드 직접 적용은 더 이상 지원되지 않습니다. 구독 페이지에서 쿠폰을 입력해주세요.' },
        { status: 410 }
    );
}
