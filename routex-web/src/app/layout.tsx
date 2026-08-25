import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';

export const metadata: Metadata = {
  title: "RouteX - India's AI-Powered Digital Freight Marketplace",
  description: "Move Anything. Anywhere. Smarter, Faster, and More Reliably.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <SocketProvider>
            {children}
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
