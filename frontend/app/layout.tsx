import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Bobby's POC",
  description: 'วิเคราะห์และตรวจสอบที่อยู่ภาษาไทยจากข้อความอิสระ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
