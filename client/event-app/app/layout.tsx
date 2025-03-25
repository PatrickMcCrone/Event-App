import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./sidebar";
import { ThemeProvider } from "./context/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Event App",
	description: "Manage your events with ease",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<style>{`
					.nextjs-toast-errors-parent {
						display: none !important;
					}
					* {
						transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
					}
				`}</style>
			</head>
			<body
				className={`${inter.className} bg-slate-50 dark:bg-gray-900 text-slate-800 dark:text-white`}
			>
				<ThemeProvider>
					<div className="flex min-h-screen">
						<Sidebar />
						<main className="flex-1 ml-64">{children}</main>
					</div>
				</ThemeProvider>
			</body>
		</html>
	);
}
