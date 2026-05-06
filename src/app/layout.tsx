import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "NEURAL_AGENT // v3.0",
    description: "autonomous code synthesis engine",
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={`${geistMono.variable} h-full`}>
            <body className="min-h-full antialiased">{children}</body>
        </html>
    );
}
