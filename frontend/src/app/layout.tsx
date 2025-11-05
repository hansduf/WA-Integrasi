import { AuthProvider } from '@/contexts/AuthContext';
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SessionExpiredModal from './components/ui/SessionExpiredModal';
import { ToastProvider } from './components/ui/ToastProvider';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AVEVA PI Integration Dashboard",
  description: "Dashboard untuk integrasi AVEVA PI dengan WhatsApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <ToastProvider>
            <SessionExpiredModal />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
