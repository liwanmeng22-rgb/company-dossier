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
  title: "Company Dossier · 公司研究档案",
  description: "快速了解一家公司的产品、商业模式、竞争力、风险与国内外业务，结合公开来源形成结构化研究档案。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className={`${mono.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
