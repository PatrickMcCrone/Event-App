import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "./sidebar";
import { Providers } from "./providers";
import NotificationBell from "../components/NotificationBell";
import AuthWrapper from "../components/AuthWrapper";

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
				<Providers>
					<AuthWrapper>
						<div className="flex min-h-screen">
							<Sidebar />
							<main className="flex-1 ml-64">
								<nav className="bg-white dark:bg-gray-800 shadow-sm">
									<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
										<div className="flex justify-between h-16">
											<div className="flex items-center">
												<a
													href="/"
													className="text-xl font-bold text-slate-800 dark:text-white"
												>
													{/* Removed "Event App" text */}
												</a>
											</div>
											<div className="flex items-center space-x-4">
												<NotificationBell />
												{/* Add other nav items here */}
											</div>
										</div>
									</div>
								</nav>
								{children}
							</main>
						</div>
					</AuthWrapper>
				</Providers>
			</body>
		</html>
	);
}
