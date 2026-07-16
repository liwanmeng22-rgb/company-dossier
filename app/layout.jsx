import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata = {
  title: "公司拆解仪表盘",
  description: "输入公司名称，生成带置信度标记的结构化拆解档案",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className={`${mono.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
