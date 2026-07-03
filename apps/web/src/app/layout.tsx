import "./globals.css";

import { M_PLUS_Rounded_1c } from 'next/font/google';

import { AppFooter } from '@/components/app-footer';

const todonFont = M_PLUS_Rounded_1c({
  variable: '--font-todon',
  subsets: ['latin'],
  weight: ['400', '500', '700', '800'],
});

export const metadata = {
  title: 'TodoN（トドン）',
  description: '個人とチームのタスクを詰まらせずに進めるためのアプリ',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${todonFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="flex min-h-full flex-1 flex-col">{children}</div>
        <AppFooter />
      </body>
    </html>
  );
}
