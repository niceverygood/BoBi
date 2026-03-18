import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { GoogleAuth } from 'google-auth-library';

// Apple App Store 영수증 검증
async function verifyAppleReceipt(receipt: string) {
  // 프로덕션 URL (샌드박스 실패 시 자동 전환)
  const urls = [
    'https://buy.itunes.apple.com/verifyReceipt',
    'https://sandbox.itunes.apple.com/verifyReceipt',
  ];

  for (const url of urls) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receipt,
        password: process.env.APPLE_SHARED_SECRET,
        'exclude-old-transactions': true,
      }),
    });

    const data = await res.json();

    // status 21007 = sandbox receipt sent to production → retry with sandbox
    if (data.status === 21007) continue;

    if (data.status === 0) {
      const latestInfo = data.latest_receipt_info?.[0];
      return {
        valid: true,
        productId: latestInfo?.product_id,
        transactionId: latestInfo?.transaction_id,
        expiresDate: latestInfo?.expires_date_ms
          ? new Date(parseInt(latestInfo.expires_date_ms))
          : null,
      };
    }

    return { valid: false, error: `Apple verification failed: status ${data.status}` };
  }

  return { valid: false, error: 'Apple verification failed' };
}

// Google Play 영수증 검증
async function verifyGoogleReceipt(productId: string, purchaseToken: string) {
  try {
    const packageName = 'kr.bobi.app';
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}');

    const auth = new GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const verifyRes = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${purchaseToken}`,
      { headers: { Authorization: `Bearer ${accessToken.token}` } },
    );

    const data = await verifyRes.json();

    if (data.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE') {
      return {
        valid: true,
        productId: data.lineItems?.[0]?.productId || productId,
        transactionId: data.latestOrderId,
        expiresDate: data.lineItems?.[0]?.expiryTime
          ? new Date(data.lineItems[0].expiryTime)
          : null,
      };
    }

    return { valid: false, error: `Google verification failed: ${data.subscriptionState || 'unknown'}` };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

// 상품 ID → 플랜 매핑
function getSubscriptionInfo(productId: string) {
  const mapping: Record<string, { planSlug: string; billingCycle: string }> = {
    'kr.bobi.app.basic.monthly': { planSlug: 'basic', billingCycle: 'monthly' },
    'kr.bobi.app.basic.yearly': { planSlug: 'basic', billingCycle: 'yearly' },
    'kr.bobi.app.pro.monthly': { planSlug: 'pro', billingCycle: 'monthly' },
    'kr.bobi.app.pro.yearly': { planSlug: 'pro', billingCycle: 'yearly' },
  };
  return mapping[productId] || null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }

  const { platform, receipt, productId, purchaseToken } = await request.json();

  // 영수증 검증
  let verification;
  if (platform === 'ios') {
    if (!receipt) {
      return NextResponse.json({ error: '영수증이 누락되었습니다.' }, { status: 400 });
    }
    verification = await verifyAppleReceipt(receipt);
  } else if (platform === 'android') {
    if (!productId || !purchaseToken) {
      return NextResponse.json({ error: '구매 정보가 누락되었습니다.' }, { status: 400 });
    }
    verification = await verifyGoogleReceipt(productId, purchaseToken);
  } else {
    return NextResponse.json({ error: '지원하지 않는 플랫폼입니다.' }, { status: 400 });
  }

  if (!verification.valid) {
    return NextResponse.json({ error: verification.error || '영수증 검증에 실패했습니다.' }, { status: 400 });
  }

  // 플랜 정보 매핑
  const subInfo = getSubscriptionInfo(verification.productId!);
  if (!subInfo) {
    return NextResponse.json({ error: '알 수 없는 상품입니다.' }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  // 플랜 조회
  const { data: plan } = await serviceClient
    .from('subscription_plans')
    .select('*')
    .eq('slug', subInfo.planSlug)
    .single();

  if (!plan) {
    return NextResponse.json({ error: '플랜을 찾을 수 없습니다.' }, { status: 400 });
  }

  const now = new Date();
  const periodEnd = verification.expiresDate || new Date(now);
  if (!verification.expiresDate) {
    if (subInfo.billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
  }

  // 기존 구독 취소
  await serviceClient
    .from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: now.toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'active');

  // 새 구독 생성
  const paymentProvider = platform === 'ios' ? 'apple_iap' : 'google_play';

  const { data: subscription, error: subError } = await serviceClient
    .from('subscriptions')
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      status: 'active',
      billing_cycle: subInfo.billingCycle,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      payment_provider: paymentProvider,
      payment_key: verification.transactionId,
    })
    .select()
    .single();

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  // usage_tracking 갱신
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const periodStart = `${year}-${month}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const periodEndUsage = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

  const { data: existingUsage } = await serviceClient
    .from('usage_tracking')
    .select('id')
    .eq('user_id', user.id)
    .eq('period_start', periodStart)
    .maybeSingle();

  const newLimit = plan.max_analyses === -1 ? 999999 : plan.max_analyses;

  if (existingUsage) {
    await serviceClient
      .from('usage_tracking')
      .update({ analyses_limit: newLimit })
      .eq('id', existingUsage.id);
  } else {
    await serviceClient
      .from('usage_tracking')
      .insert({
        user_id: user.id,
        period_start: periodStart,
        period_end: periodEndUsage,
        analyses_used: 0,
        analyses_limit: newLimit,
      });
  }

  return NextResponse.json({
    ok: true,
    subscription,
    plan: plan.slug,
    billingCycle: subInfo.billingCycle,
  });
}
