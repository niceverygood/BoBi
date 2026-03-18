// Apple / Google 인앱결제 서비스
import { getPlatform, type AppPlatform } from './platform';

// App Store Connect / Google Play Console에서 등록한 상품 ID
export const IAP_PRODUCTS = {
  basic_monthly: 'kr.bobi.app.basic.monthly',      // 29,900원/월
  basic_yearly: 'kr.bobi.app.basic.yearly',         // 298,800원/년
  pro_monthly: 'kr.bobi.app.pro.monthly',           // 59,900원/월
  pro_yearly: 'kr.bobi.app.pro.yearly',             // 598,800원/년
} as const;

export type IAPProductId = typeof IAP_PRODUCTS[keyof typeof IAP_PRODUCTS];

type PlanSlug = 'basic' | 'pro';
type BillingCycle = 'monthly' | 'yearly';

export function getProductId(plan: PlanSlug, cycle: BillingCycle): IAPProductId {
  const key = `${plan}_${cycle}` as keyof typeof IAP_PRODUCTS;
  return IAP_PRODUCTS[key];
}

interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  receipt?: string;
  error?: string;
}

let storeReady = false;
let store: any = null;

export async function initializeStore(): Promise<boolean> {
  const platform = getPlatform();
  if (platform === 'web') return false;

  try {
    // cordova-plugin-purchase의 CdvPurchase 글로벌 객체
    store = (window as any).CdvPurchase?.store;
    if (!store) {
      console.warn('IAP store not available');
      return false;
    }

    const ProductType = (window as any).CdvPurchase.ProductType;
    const Platform = (window as any).CdvPurchase.Platform;

    const targetPlatform = platform === 'ios' ? Platform.APPLE_APPSTORE : Platform.GOOGLE_PLAY;

    // 구독 상품 등록
    store.register([
      { id: IAP_PRODUCTS.basic_monthly, type: ProductType.PAID_SUBSCRIPTION, platform: targetPlatform },
      { id: IAP_PRODUCTS.basic_yearly, type: ProductType.PAID_SUBSCRIPTION, platform: targetPlatform },
      { id: IAP_PRODUCTS.pro_monthly, type: ProductType.PAID_SUBSCRIPTION, platform: targetPlatform },
      { id: IAP_PRODUCTS.pro_yearly, type: ProductType.PAID_SUBSCRIPTION, platform: targetPlatform },
    ]);

    // 영수증 검증 서버 설정
    store.validator = '/api/iap/verify';

    await store.initialize();
    storeReady = true;
    return true;
  } catch (err) {
    console.error('IAP store init failed:', err);
    return false;
  }
}

export async function purchase(plan: PlanSlug, cycle: BillingCycle): Promise<PurchaseResult> {
  if (!storeReady || !store) {
    return { success: false, error: '인앱결제를 초기화할 수 없습니다.' };
  }

  const productId = getProductId(plan, cycle);

  try {
    const product = store.get(productId);
    if (!product) {
      return { success: false, error: '상품 정보를 불러올 수 없습니다.' };
    }

    const offer = product.getOffer();
    if (!offer) {
      return { success: false, error: '구매 가능한 상품이 없습니다.' };
    }

    const result = await store.order(offer);

    if (result?.isError) {
      return { success: false, error: result.message || '결제에 실패했습니다.' };
    }

    return {
      success: true,
      transactionId: result?.transactionId,
      receipt: result?.receipt,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || '결제 처리 중 오류가 발생했습니다.',
    };
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  if (!storeReady || !store) {
    return { success: false, error: '인앱결제를 초기화할 수 없습니다.' };
  }

  try {
    await store.restorePurchases();
    return { success: true };
  } catch (err) {
    return { success: false, error: '구매 복원에 실패했습니다.' };
  }
}
