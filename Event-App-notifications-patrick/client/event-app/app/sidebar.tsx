"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./context/ThemeContext";
import UserProfile from "../components/UserProfile";

export default function Sidebar() {
	const pathname = usePathname();
	const { theme } = useTheme();

	const navigation = [
		{
			name: "Dashboard",
			href: "/",
			icon: (
				<svg
					className="w-6 h-6"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
					/>
				</svg>
			),
		},
		{
			name: "Events",
			href: "/events",
			icon: (
				<svg
					className="w-6 h-6"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			),
		},
		{
			name: "Create Event",
			href: "/create-event",
			icon: (
				<svg
					className="w-6 h-6"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 4v16m8-8H4"
					/>
				</svg>
			),
		},
		{
			name: "Settings",
			href: "/settings",
			icon: (
				<svg
					className="w-6 h-6"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
			),
		},
	];

	return (
		<div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg z-50">
			{/* Logo */}
			<div className="flex items-center justify-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
				<h1 className="text-xl font-bold text-gray-900 dark:text-white">
					Event App
				</h1>
			</div>

			{/* Navigation */}
			<nav className="mt-6">
				<div className="px-4 space-y-1">
					{navigation.map((item) => {
						const isActive = pathname === item.href;
						return (
							<Link
								key={item.name}
								href={item.href}
								className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
									isActive
										? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-100"
										: "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
								}`}
							>
								<span
									className={`mr-3 ${
										isActive
											? "text-blue-700 dark:text-blue-100"
											: "text-gray-500 dark:text-gray-400"
									}`}
								>
									{item.icon}
								</span>
								{item.name}
							</Link>
						);
					})}
				</div>
			</nav>

			{/* User Profile */}
			<UserProfile />
		</div>
	);
}
