"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Notification {
	id: number;
	message: string;
	read: boolean;
	createdAt: string;
	event: {
		id: number;
		title: string;
	};
}

export default function NotificationBell() {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const { data: session } = useSession();

	useEffect(() => {
		if (session?.user) {
			fetchNotifications();
		}
	}, [session]);

	const fetchNotifications = async () => {
		try {
			const response = await fetch(
				"http://localhost:3001/notifications",
				{
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
			if (response.ok) {
				const data = await response.json();
				setNotifications(data);
			}
		} catch (error) {
			console.error("Error fetching notifications:", error);
		}
	};

	const markAsRead = async (id: number) => {
		try {
			const response = await fetch(
				`http://localhost:3001/notifications/${id}/read`,
				{
					method: "PUT",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
				}
			);
			if (response.ok) {
				setNotifications(
					notifications.map((n) =>
						n.id === id ? { ...n, read: true } : n
					)
				);
			}
		} catch (error) {
			console.error("Error marking notification as read:", error);
		}
	};

	const unreadCount = notifications.filter((n) => !n.read).length;

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="relative p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
			>
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
						d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
					/>
				</svg>
				{unreadCount > 0 && (
					<span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
						{unreadCount}
					</span>
				)}
			</button>

			{isOpen && (
				<div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden z-50">
					<div className="p-4">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
							Notifications
						</h3>
						<div className="space-y-4">
							{notifications.length === 0 ? (
								<p className="text-gray-500 dark:text-gray-400 text-center">
									No notifications
								</p>
							) : (
								notifications.map((notification) => (
									<div
										key={notification.id}
										className={`p-3 rounded-lg ${
											notification.read
												? "bg-gray-50 dark:bg-gray-700"
												: "bg-blue-50 dark:bg-blue-900"
										}`}
										onClick={() =>
											markAsRead(notification.id)
										}
									>
										<p className="text-sm text-gray-800 dark:text-gray-200">
											{notification.message}
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
											{new Date(
												notification.createdAt
											).toLocaleDateString()}
										</p>
									</div>
								))
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
