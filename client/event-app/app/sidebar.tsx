"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./context/ThemeContext";
import UserProfile from "../components/UserProfile";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CalendarIcon, HomeIcon, CheckCircleIcon, PlusCircleIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";

export default function Sidebar() {
	const pathname = usePathname();
	const { theme } = useTheme();

	const navigation = [
		{
			name: "Home",
			href: "/",
			icon: HomeIcon,
		},
		{
			name: "Events",
			href: "/events",
			icon: CalendarIcon,
		},
		{
			name: "Subscribed Events",
			href: "/subscribed-events",
			icon: CheckCircleIcon,
		},
		{
			name: "Create Event",
			href: "/create-event",
			icon: PlusCircleIcon,
		},
		{
			name: "Settings",
			href: "/settings",
			icon: Cog6ToothIcon,
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
									<item.icon className="h-5 w-5" />
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
