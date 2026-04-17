// app/inicis/closed/page.tsx
// KG이니시스 결제창 "닫기" 시 이동하는 공개 페이지
// - 미들웨어 auth 체크 없이 접근 가능 (/dashboard/* 경로가 아님)
// - iframe/popup 방식이면 창만 닫고, redirection 방식이면 부모 창으로 복귀
// - JavaScript로 부모 창에 "inicis_closed" 플래그 전달 후 창 닫음
//
// 주의: 이 라우트는 public. 로그인 세션 없이도 접근 가능.

export const dynamic = 'force-static';

export default function InicisClosedPage() {
    return (
        <html lang="ko">
            <head>
                <title>결제창 닫힘</title>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function () {
                                try {
                                    // iframe 방식이면 부모에 메시지 전달 후 창 닫기
                                    if (window.opener && !window.opener.closed) {
                                        try {
                                            window.opener.postMessage({ type: 'inicis_closed' }, '*');
                                        } catch (e) {}
                                        window.close();
                                        return;
                                    }
                                    // redirection 방식이면 부모 창(=원본 탭)의 subscribe 페이지로 이동
                                    // 세션 쿠키가 정상 전달되도록 현재 도메인 유지
                                    var url = new URL(window.location.href);
                                    var origin = url.origin;
                                    window.location.replace(origin + '/dashboard/subscribe?inicis_closed=true');
                                } catch (err) {
                                    // fallback
                                    window.location.replace('/dashboard/subscribe?inicis_closed=true');
                                }
                            })();
                        `,
                    }}
                />
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
                            body { font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif;
                                   display: flex; align-items: center; justify-content: center;
                                   min-height: 100vh; margin: 0; background: #f8f8f8; color: #555; }
                            .box { text-align: center; padding: 2rem; }
                            .box h1 { font-size: 1rem; font-weight: 600; margin: 0 0 0.5rem; }
                            .box p { font-size: 0.85rem; margin: 0; color: #888; }
                        `,
                    }}
                />
            </head>
            <body>
                <div className="box">
                    <h1>결제창이 닫혔습니다</h1>
                    <p>원래 창으로 돌아가는 중입니다...</p>
                </div>
            </body>
        </html>
    );
}
