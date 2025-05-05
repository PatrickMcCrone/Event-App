"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Notification {
	id: number;
	message: string;
	read: boolean;
	createdAt?: string;
	created_at?: string;
	event: {
		id: number;
		title: string;
	};
	event_id?: number;
	event_title?: string;
}

export default function NotificationBell() {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [authToken, setAuthToken] = useState<string | null>(null);
	const { data: session } = useSession();
	const dropdownRef = useRef<HTMLDivElement>(null);
	const router = useRouter();

	// Get auth token when session changes
	useEffect(() => {
		const getAuthToken = async () => {
			if (session?.user) {
				try {
					const authResponse = await fetch(
						"http://localhost:3001/auth/google",
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								name: session.user.name,
								email: session.user.email,
								picture: session.user.image,
								googleId: session.user.googleId,
							}),
						}
					);

					if (authResponse.ok) {
						const authData = await authResponse.json();
						setAuthToken(authData.token);
					}
				} catch (error) {
					console.error("Error getting auth token:", error);
				}
			}
		};

		getAuthToken();
	}, [session]);

	const fetchNotifications = async () => {
		if (!authToken) return;

		try {
			const response = await fetch(
				"http://localhost:3001/notifications",
				{
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}
			);

			if (!response.ok) {
				throw new Error("Failed to fetch notifications");
			}

			const data = await response.json();
			console.log("Fetched notifications:", data);
			setNotifications(data);
		} catch (error) {
			console.error("Error fetching notifications:", error);
		}
	};

	useEffect(() => {
		if (authToken) {
			fetchNotifications();
		}
	}, [authToken]);

	const markAsRead = async (id: number) => {
		try {
			const response = await fetch(
				`http://localhost:3001/notifications/${id}/read`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${authToken}`,
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

	const deleteNotification = async (id: number) => {
		try {
			const response = await fetch(
				`http://localhost:3001/notifications/${id}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${authToken}`,
					},
				}
			);
			if (response.ok) {
				setNotifications((prev) => prev.filter((n) => n.id !== id));
			}
		} catch (error) {
			console.error("Error deleting notification:", error);
		}
	};

	const unreadCount = notifications.filter((n) => !n.read).length;

	// Click-away logic
	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const handleNotificationClick = async (notification: Notification) => {
		console.log("Notification clicked:", notification);
		if (!notification.read) {
			await markAsRead(notification.id);
		}
		// Navigate to the event page
		if (notification.event_id) {
			router.push(`/events/${notification.event_id}`);
			setIsOpen(false);
		} else {
			console.warn("No event_id found in notification:", notification);
		}
	};

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
				<div
					ref={dropdownRef}
					className="fixed top-4 right-4 w-[420px] max-w-full max-h-[80vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-y-auto z-50 border border-slate-200 dark:border-gray-800 flex flex-col"
				>
					<div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center gap-2 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
						<svg
							className="w-7 h-7 text-indigo-600"
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
						<h3 className="text-2xl font-bold text-slate-900 dark:text-white flex-1">
							Notifications
						</h3>
					</div>
					<div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto max-h-56">
						{notifications.length === 0 ? (
							<p className="text-gray-500 dark:text-gray-400 text-center mt-8">
								No notifications
							</p>
						) : (
							notifications.map((notification) => (
								<div
									key={notification.id}
									className={`relative rounded-xl transition-colors duration-150 cursor-pointer select-none border p-4 shadow-sm flex flex-row items-center gap-4 group
										${notification.read ? "bg-gray-50 dark:bg-gray-800 border-slate-100 dark:border-gray-800" : "bg-indigo-50 dark:bg-indigo-900 border-indigo-200 dark:border-indigo-700"}
										hover:bg-indigo-100 dark:hover:bg-indigo-800"}`}
									onClick={() =>
										handleNotificationClick(notification)
									}
								>
									<div className="flex items-center gap-3 flex-1 min-w-0">
										<svg
											className="w-5 h-5 text-indigo-500"
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
										<div className="flex flex-col flex-1 min-w-0">
											<span className="font-semibold text-slate-800 dark:text-white truncate">
												{notification.event_title ||
													"Event"}
											</span>
											<span className="text-xs text-slate-500 dark:text-gray-400 truncate">
												{notification.message}
											</span>
										</div>
										<div className="flex flex-col items-end min-w-[90px]">
											<span className="text-xs text-slate-500 dark:text-gray-400">
												{notification.created_at
													? new Date(
															notification.created_at
														).toLocaleTimeString(
															[],
															{
																hour: "2-digit",
																minute: "2-digit",
															}
														)
													: ""}
											</span>
											<span className="text-xs text-slate-400 dark:text-gray-600">
												{notification.created_at
													? new Date(
															notification.created_at
														).toLocaleDateString()
													: ""}
											</span>
										</div>
									</div>
									{/* Delete X button, small, top-right, only visible on hover */}
									<button
										onClick={(e) => {
											e.stopPropagation();
											deleteNotification(notification.id);
										}}
										className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white rounded-full p-1 z-10 shadow"
										title="Delete notification"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-3.5 w-3.5"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth={2}
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}
