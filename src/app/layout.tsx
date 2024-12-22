import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "내신 등급컷 예측기",
  description: "우리학교 등급컷은?",
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
