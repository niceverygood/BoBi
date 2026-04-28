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

      // 이벤트 구독 — verified(성공) / 에러·취소 이벤트도 함께 캐치해 "결제 진행 중..." 무한로딩 방지
      store.when().verified(onVerified);
      // CdvPurchase는 에러 상황에 따라 여러 이벤트가 존재. 가용한 것만 시도.
      try { store.when().rejected(onError); } catch { /* 플러그인 버전에 따라 미지원 */ }
      try { store.when().error(onError); } catch { /* 플러그인 버전에 따라 미지원 */ }
      try { store.when().cancelled(() => onError(new Error('결제가 취소되었습니다.'))); } catch { /* ignore */ }
      try { store.error((err: any) => onError(err)); } catch { /* ignore */ }

      // 30초 타임아웃
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({
            success: false,
            error: '결제 응답 시간이 초과되었습니다. 이미 구독 중이시면 아래 "구매 복원" 버튼을 눌러주세요.',
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

/**
 * 기존 Apple/Google 구독을 복원. 애플/구글에서 active한 구독의 영수증·transactionId를
 * 반환 — 호출자가 /api/iap/verify로 POST하여 DB와 sync한다.
 *
 * 반환되는 productId는 상품 ID(예: 'kr.bobi.app.basic.monthly')로, verify 엔드포인트의
 * productId 파라미터로 그대로 전달 가능.
 */
export async function restorePurchases(): Promise<PurchaseResult & { productId?: string }> {
  if (!storeReady || !store) {
    return { success: false, error: '인앱결제를 초기화할 수 없습니다.' };
  }

  return new Promise((resolve) => {
    let resolved = false;

    const onApproved = (transaction: any) => {
      if (resolved) return;

      const platform = getPlatform();
      let receiptData: string | undefined;
      let transactionId: string | undefined;
      let productId: string | undefined;

      // 트랜잭션에서 receipt / transactionId / productId 추출
      if (platform === 'ios') {
        receiptData = transaction.appStoreReceipt
          || transaction.nativePurchase?.appStoreReceipt
          || transaction.receipt;
        transactionId = transaction.transactionId || transaction.id;
      } else {
        receiptData = transaction.purchaseToken || transaction.receipt;
        transactionId = transaction.transactionId || transaction.purchaseToken || transaction.id;
      }
      productId = transaction.products?.[0]?.id
        || transaction.productId
        || transaction.id;

      if (!receiptData && !transactionId) {
        // 빈 트랜잭션 — 다음 것을 기다림
        return;
      }

      resolved = true;
      try { transaction.finish && transaction.finish(); } catch { /* ignore */ }
      resolve({ success: true, receipt: receiptData, transactionId, productId });
    };

    // 애플/구글이 active 구독 이벤트를 다시 쏘면 그 중 첫 번째를 캐치
    try { store.when().approved(onApproved); } catch { /* ignore */ }

    // 15초 타임아웃 — 복원할 구독이 없으면 여기서 빠져나옴
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: '복원할 구독이 없습니다. 이미 다른 계정으로 구매하셨거나 아직 구매 이력이 없습니다.' });
      }
    }, 15000);

    // 복원 트리거
    try {
      const p = store.restorePurchases();
      if (p && typeof p.catch === 'function') {
        p.catch((err: any) => {
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: err?.message || '구매 복원에 실패했습니다.' });
          }
        });
      }
    } catch (err) {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: (err as Error).message || '구매 복원에 실패했습니다.' });
      }
    }
  });
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
