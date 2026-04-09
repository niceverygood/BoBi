import Link from 'next/link';

export default function BusinessFooter() {
    return (
        <footer className="border-t py-8 px-4 bg-muted/20 mt-auto">
            <div className="max-w-6xl mx-auto">
                <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                        <strong>주식회사 바틀</strong> | 대표자: 한승수 | 사업자등록번호: 376-87-01076 |{' '}
                        통신판매업신고번호: 제2019-성남분당B-0177호
                    </p>
                    <p>주소: 경기도 성남시 분당구 판교로289번길 20, 2동 8층 (삼평동, 판교테크노밸리 스타트업 캠퍼스)</p>
                    <p>연락처: 010-2309-7443 | 이메일: dev@bottlecorp.kr</p>
                    <p className="mt-2">
                        주식회사 바틀에서 운영하는 보비(BoBi)에서 판매되는 모든 상품은 주식회사 바틀에서 책임지고 있습니다.
                    </p>
                    <div className="flex gap-4 mt-3">
                        <Link href="/terms" className="hover:text-foreground underline">이용약관</Link>
                        <Link href="/privacy" className="hover:text-foreground underline font-semibold">개인정보처리방침</Link>
                    </div>
                    <p className="mt-3">© 2026 BoBi. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
