import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "내신 등급컷 예측기",
  description: "우리학교 등급컷은?",
  icons: {
    // 기본 브라우저 탭 아이콘
    icon: "/icon2.png",
    // 크롬 등에서 사용하는 shortcut icon
    shortcut: "/icon2.png",
    // iOS 홈 화면 아이콘
    apple: "/icon2.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className='dark' >
      <body>
        {children}
      </body>
    </html>
  );
}
