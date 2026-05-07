import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import ChatBot from "@/components/chat/ChatBot";
import PostHogProvider from "@/components/analytics/PostHogProvider";
import MetaPixelProvider from "@/components/analytics/MetaPixelProvider";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* PostHog 분석 초기화 + pageview 자동 캡처 (useSearchParams 때문에 Suspense 필요) */}
        <Suspense fallback={null}>
          <PostHogProvider />
        </Suspense>
        {/* Meta Pixel — 인스타·페북 광고 전환 측정 (Suspense 동일 이유) */}
        <Suspense fallback={null}>
          <MetaPixelProvider />
        </Suspense>
        {children}
        <Toaster position="top-right" richColors />
        <ChatBot />
      </body>
    </html>
  );
}
