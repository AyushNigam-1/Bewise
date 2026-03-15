import AuthProvider from "./components/providers/AuthProvider";
import QueryProvider from "./components/providers/QueryProvider";
import "./globals.css";
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['latin'] });

export const metadata = {
  title: "Book Insights",
  description: "Bite-sized, actionable knowledge from the best books.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={`${montserrat.className} antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col h-screen`}>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}