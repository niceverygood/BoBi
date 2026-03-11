import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "보비 BoBi - AI 보험비서",
  description: "보험설계사를 위한 AI 보험비서. 고객의 진료이력을 분석하여 고지사항 정리, 가입가능 상품 판단, 보험금 청구 가능여부를 안내합니다.",
  keywords: ["보험", "AI", "보험비서", "고지사항", "보험설계사", "심평원"],
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
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
