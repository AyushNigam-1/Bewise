"use client"
import "./globals.css";
import { useUserStore } from "./stores/useUserStores";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const fetchUser = useUserStore(state => state.getUser);
  useEffect(() => {
    fetchUser();
  }, []);
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en" className="">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <QueryClientProvider client={queryClient}>
        <body className="antialiased  flex flex-col h-screen">
          {children}
        </body>
      </QueryClientProvider>
    </html>
  );
}
