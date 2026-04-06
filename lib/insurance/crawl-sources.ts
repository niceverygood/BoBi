// lib/insurance/crawl-sources.ts
// 보험사 약관 공시 페이지 URL 및 크롤링 설정

export interface InsuranceSource {
    id: string;
    name: string;
    type: '손해' | '생명';
    url: string;
    /** 크롤링 난이도 (static: 정적 HTML, dynamic: JS 렌더링 필요) */
    difficulty: 'static' | 'dynamic';
    enabled: boolean;
}

export const INSURANCE_SOURCES: InsuranceSource[] = [
    { id: 'samsung', name: '삼성화재', type: '손해', url: 'https://www.samsungfire.com/vh/page/VH.HPIF0103.do', difficulty: 'dynamic', enabled: true },
    { id: 'hyundai', name: '현대해상', type: '손해', url: 'https://www.hi.co.kr/serviceAction.do', difficulty: 'dynamic', enabled: true },
    { id: 'db', name: 'DB손해보험', type: '손해', url: 'https://www.idbins.com/FWMAIV1534.do', difficulty: 'dynamic', enabled: true },
    { id: 'kb', name: 'KB손해보험', type: '손해', url: 'https://www.kbinsure.co.kr/CG802030001.ec', difficulty: 'dynamic', enabled: true },
    { id: 'meritz', name: '메리츠화재', type: '손해', url: 'https://www.meritzfire.com/disclosure/product-announcement/product-list.do#!/', difficulty: 'dynamic', enabled: true },
    { id: 'hanwha', name: '한화손해', type: '손해', url: 'https://www.hwgeneralins.com/notice/ir/product-ing01.do', difficulty: 'dynamic', enabled: true },
    { id: 'heungkuk', name: '흥국화재', type: '손해', url: 'https://www.heungkukfire.co.kr/MAW/main1.do', difficulty: 'dynamic', enabled: true },
    { id: 'lotte', name: '롯데손해', type: '손해', url: 'https://www.lotteins.co.kr/index2.jsp', difficulty: 'dynamic', enabled: true },
    { id: 'nhfire', name: '농협손해', type: '손해', url: 'https://www.nhfire.co.kr/announce/productAnnounce/retrieveInsuranceProductsAnnounce.nhfire', difficulty: 'dynamic', enabled: true },
    { id: 'hana', name: '하나손해', type: '손해', url: 'https://www.hanainsure.co.kr/w/disclosure/product/saleProduct', difficulty: 'dynamic', enabled: true },
    { id: 'aig', name: 'AIG손해보험', type: '손해', url: 'https://www.aig.co.kr/wo/dpwot001.html?menuId=MS702', difficulty: 'dynamic', enabled: true },
    { id: 'chubb', name: '라이나손해(처브)', type: '손해', url: 'https://www.chubb.com/kr-kr/disclosure/product.html', difficulty: 'static', enabled: true },
    { id: 'yebyeol', name: '예별손해', type: '손해', url: 'https://www.yebyeol.co.kr/PB031210DM.scp?menuId=MN0803006', difficulty: 'dynamic', enabled: true },
];
