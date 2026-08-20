import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AppHeader } from "@/components/app-header";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Daily Habit Tracker",
  description: "Track your daily habits and visualize your progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <div className="min-h-screen bg-background text-foreground">
            <AppHeader />
            <main className="container py-6">{children}</main>
          </div>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
