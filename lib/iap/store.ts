// Apple / Google 인앱결제 서비스
import { getPlatform, type AppPlatform } from './platform';

// App Store Connect / Google Play Console에서 등록한 상품 ID
export const IAP_PRODUCTS = {
  basic_monthly: 'kr.bobi.app.basic.monthly',      // 19,900원/월
  basic_yearly: 'kr.bobi.app.basic.yearly',         // 190,000원/년
  pro_monthly: 'kr.bobi.app.pro.monthly',           // 39,900원/월
  pro_yearly: 'kr.bobi.app.pro.yearly',             // 380,000원/년
} as const;

// 크레딧 상품 ID (소모성 아이템)
export const IAP_CREDIT_PRODUCTS = {
  credit_1: 'kr.bobi.app.credit.1',         // 990원 / 1크레딧
  credit_10: 'kr.bobi.app.credit.10',       // 7,900원 / 10크레딧
  credit_30: 'kr.bobi.app.credit.30',       // 19,900원 / 30크레딧
} as const;

export type IAPProductId = typeof IAP_PRODUCTS[keyof typeof IAP_PRODUCTS];
export type IAPCreditProductId = typeof IAP_CREDIT_PRODUCTS[keyof typeof IAP_CREDIT_PRODUCTS];

type PlanSlug = 'basic' | 'pro';
type BillingCycle = 'monthly' | 'yearly';
type CreditPackId = 'credit_1' | 'credit_10' | 'credit_30';

export function getProductId(plan: PlanSlug, cycle: BillingCycle): IAPProductId {
  const key = `${plan}_${cycle}` as keyof typeof IAP_PRODUCTS;
  return IAP_PRODUCTS[key];
}

export function getCreditProductId(packId: CreditPackId): IAPCreditProductId {
  return IAP_CREDIT_PRODUCTS[packId];
}

interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  receipt?: string;
  error?: string;
}

let storeReady = false;
let store: any = null;

// CdvPurchase 플러그인이 로드될 때까지 대기 (Capacitor 원격 서버 모드에서 시간이 걸릴 수 있음)
async function waitForCdvPurchase(maxWaitMs = 10000): Promise<any> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const cdvStore = (window as any).CdvPurchase?.store;
    if (cdvStore) return cdvStore;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return null;
}

export async function initializeStore(): Promise<boolean> {
  const platform = getPlatform();
  if (platform === 'web') return false;

  try {
    // Cordova 플러그인이 로드될 때까지 대기 (최대 10초)
    store = await waitForCdvPurchase(10000);
    if (!store) {
      console.warn('IAP store not available after waiting');
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

    // 크레딧 상품 등록 (소모성 아이템)
    store.register([
      { id: IAP_CREDIT_PRODUCTS.credit_1, type: ProductType.CONSUMABLE, platform: targetPlatform },
      { id: IAP_CREDIT_PRODUCTS.credit_10, type: ProductType.CONSUMABLE, platform: targetPlatform },
      { id: IAP_CREDIT_PRODUCTS.credit_30, type: ProductType.CONSUMABLE, platform: targetPlatform },
    ]);

    // 승인된 트랜잭션 이벤트 핸들러 — 서버에 영수증 전송
    store.when()
      .approved((transaction: any) => {
        console.log('[IAP] Transaction approved:', transaction.id);
        // 트랜잭션을 verify하면 서버 validator로 전송됨
        return transaction.verify();
      })
      .verified((receipt: any) => {
        console.log('[IAP] Receipt verified:', receipt.id);
        // 서버 검증 완료 → finish
        return receipt.finish();
      })
      .finished((transaction: any) => {
        console.log('[IAP] Transaction finished:', transaction.id);
      });
    
    // 커스텀 validator 대신 이벤트 핸들러에서 수동 처리
    // store.validator = '/api/iap/verify'; // 이벤트 기반으로 직접 처리

    await store.initialize();
    storeReady = true;
    console.log('[IAP] Store initialized successfully');
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

    // Promise로 구매 결과를 대기
    const purchasePromise = new Promise<PurchaseResult>((resolve) => {
      let resolved = false;

      // 성공 이벤트 리스너
      const onVerified = (receipt: any) => {
        if (resolved) return;
        const tx = receipt.sourceTransaction || receipt;
        
        // iOS: appStoreReceipt 또는 receipt
        // Android: purchaseToken
        const platform = getPlatform();
        let receiptData: string | undefined;
        let transactionId: string | undefined;

        if (platform === 'ios') {
          receiptData = tx.appStoreReceipt
            || (tx.nativePurchase as any)?.appStoreReceipt
            || tx.receipt;
          transactionId = tx.transactionId || tx.id;
        } else {
          receiptData = tx.purchaseToken || tx.receipt;
          transactionId = tx.transactionId || tx.purchaseToken || tx.id;
        }

        resolved = true;
        receipt.finish();

        resolve({
          success: true,
          transactionId,
          receipt: receiptData,
        });
      };

      // 에러 이벤트 리스너
      const onError = (error: any) => {
        if (resolved) return;
        resolved = true;
        resolve({
          success: false,
          error: error?.message || '결제에 실패했습니다.',
        });
      };

      // 이벤트 구독
      store.when().verified(onVerified);

      // 30초 타임아웃
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({
            success: false,
            error: '결제 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
          });
        }
      }, 30000);

      // 결제 시작
      store.order(offer).then((result: any) => {
        if (result?.isError) {
          if (!resolved) {
            resolved = true;
            resolve({
              success: false,
              error: result.message || '결제에 실패했습니다.',
            });
          }
        }
      }).catch((err: any) => {
        onError(err);
      });
    });

    return await purchasePromise;
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

// 크레딧 구매 (소모성 아이템) — 이벤트 기반 처리
export async function purchaseCredit(packId: CreditPackId): Promise<PurchaseResult> {
  if (!storeReady || !store) {
    return { success: false, error: '인앱결제를 초기화할 수 없습니다.' };
  }

  const productId = getCreditProductId(packId);

  try {
    const product = store.get(productId);
    if (!product) {
      return { success: false, error: '크레딧 상품 정보를 불러올 수 없습니다.' };
    }

    const offer = product.getOffer();
    if (!offer) {
      return { success: false, error: '구매 가능한 상품이 없습니다.' };
    }

    // Promise로 구매 결과를 대기
    const purchasePromise = new Promise<PurchaseResult>((resolve) => {
      let resolved = false;

      const onVerified = (receipt: any) => {
        if (resolved) return;
        const tx = receipt.sourceTransaction || receipt;
        resolved = true;
        receipt.finish();
        resolve({
          success: true,
          transactionId: tx.transactionId || tx.id,
          receipt: tx.receipt || tx.purchaseToken,
        });
      };

      store.when().verified(onVerified);

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({
            success: false,
            error: '결제 응답 시간이 초과되었습니다.',
          });
        }
      }, 30000);

      store.order(offer).then((result: any) => {
        if (result?.isError && !resolved) {
          resolved = true;
          resolve({
            success: false,
            error: result.message || '크레딧 구매에 실패했습니다.',
          });
        }
      }).catch((err: any) => {
        if (!resolved) {
          resolved = true;
          resolve({
            success: false,
            error: (err as Error).message || '크레딧 구매 중 오류가 발생했습니다.',
          });
        }
      });
    });

    return await purchasePromise;
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message || '크레딧 구매 중 오류가 발생했습니다.',
    };
  }
}
