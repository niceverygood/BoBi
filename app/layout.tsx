import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import ChatBotLazy from "@/components/chat/ChatBotLazy";
import PostHogProvider from "@/components/analytics/PostHogProvider";
import "./globals.css";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1a365d',
};

export const metadata: Metadata = {
  title: "보비 BoBi - AI 보험비서",
  description: "보험설계사를 위한 AI 보험비서. 고객의 진료이력을 분석하여 고지사항 정리, 가입가능 상품 판단, 보험금 청구 가능여부를 안내합니다.",
  keywords: ["보험", "AI", "보험비서", "고지사항", "보험설계사", "심평원"],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '보비 BoBi',
  },
};

const PRETENDARD_HREF = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          id="pretendard-css"
          rel="stylesheet"
          href={PRETENDARD_HREF}
          media="print"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.getElementById('pretendard-css');if(l){l.media='all';}})();`,
          }}
        />
        <noscript>
          <link rel="stylesheet" href={PRETENDARD_HREF} />
        </noscript>
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* PostHog 분석 초기화 + pageview 자동 캡처 (useSearchParams 때문에 Suspense 필요) */}
        <Suspense fallback={null}>
          <PostHogProvider />
        </Suspense>
        {children}
        <Toaster position="top-right" richColors />
        <ChatBotLazy />
      </body>
    </html>
  );
}
