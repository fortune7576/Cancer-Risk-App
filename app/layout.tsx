import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Cancer Lifestyle Risk Check",
  description:
    "생활습관 기반 암 위험도를 확인하고, 주요 위험 요인과 추천 검진, 주간 건강 미션을 받아보세요.",
  keywords: [
    "암 위험도",
    "건강 체크",
    "생활습관",
    "암 예방",
    "건강검진",
    "검진 추천",
    "건강 미션",
    "cancer risk",
    "lifestyle health",
    "screening",
    "prevention",
  ],
  authors: [{ name: "Cancer Lifestyle Risk Check" }],
  openGraph: {
    type: "website",
    url: "/",
    title: "Cancer Lifestyle Risk Check",
    description:
      "생활습관 기반 암 위험도를 확인하고, 주요 위험 요인과 추천 검진, 주간 건강 미션을 받아보세요.",
    siteName: "Cancer Lifestyle Risk Check",
    locale: "ko_KR",
    images: [
      {
        url: "/assets/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cancer Lifestyle Risk Check preview image",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cancer Lifestyle Risk Check",
    description:
      "생활습관 기반 암 위험도를 확인하고, 주요 위험 요인과 추천 검진, 주간 건강 미션을 받아보세요.",
    images: ["/assets/images/og-image.png"],
  },
  icons: {
    icon: "/assets/images/favicon.png",
  },
  themeColor: "#0F172A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}