import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { BellIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface Notification {
	id: number;
	message: string;
	created_at: string;
	read: boolean;
	event_id: number;
	event_title?: string;
	event_date?: string;
	event_time?: string;
	announcement_id?: number;
	announcement_title?: string;
	announcement_message?: string;
	announcement_author_name?: string;
	announcement_author_email?: string;
}

export default function NotificationsPanel() {
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);
	const { data: session } = useSession();
	const router = useRouter();
	const panelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const fetchNotifications = async () => {
			if (!session?.user?.id) return;
			try {
				const response = await fetch(
					"http://localhost:3001/notifications",
					{
						headers: {
							Authorization: `Bearer ${session.user.accessToken}`,
						},
					}
				);
				if (response.ok) {
					const data = await response.json();
					setNotifications(data);
					setUnreadCount(
						data.filter((n: Notification) => !n.read).length
					);
				}
			} catch (error) {
				console.error("Error fetching notifications:", error);
			}
		};
		fetchNotifications();
	}, [session]);

	// Click-away to close
	useEffect(() => {
		if (!isOpen) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (
				panelRef.current &&
				!panelRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const markAsRead = async (id: number) => {
		try {
			const response = await fetch(
				`http://localhost:3001/notifications/${id}/read`,
				{
					method: "PUT",
					headers: {
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				}
			);
			if (response.ok) {
				setNotifications((prev) =>
					prev.map((n) => (n.id === id ? { ...n, read: true } : n))
				);
				setUnreadCount((prev) => prev - 1);
			}
		} catch (error) {
			console.error("Error marking notification as read:", error);
		}
	};

	const handleNotificationClick = async (notification: Notification) => {
		if (!notification.read) {
			try {
				const response = await fetch(
					`http://localhost:3001/notifications/${notification.id}/read`,
					{
						method: "PUT",
						headers: {
							Authorization: `Bearer ${session?.user?.accessToken}`,
						},
					}
				);
				if (response.ok) {
					setNotifications((prev) =>
						prev.map((n) =>
							n.id === notification.id ? { ...n, read: true } : n
						)
					);
					setUnreadCount((prev) => prev - 1);
				}
			} catch (error) {
				console.error("Error marking notification as read:", error);
			}
		}
		router.push(`/events/${notification.event_id}`);
		setIsOpen(false);
	};

	const formatDate = (dateString: string) => {
		if (!dateString) return "";
		const date = new Date(dateString);
		return date.toLocaleString("en-US", {
			timeZone: "America/New_York", // Use user's timezone from settings if available
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
			hour12: true,
		});
	};

	return (
		<div className="relative">
			<Button
				variant="outline"
				className="relative p-2"
				onClick={() => setIsOpen(!isOpen)}
			>
				<BellIcon className="h-6 w-6" />
				{unreadCount > 0 && (
					<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
						{unreadCount}
					</span>
				)}
			</Button>

			{isOpen && (
				<div
					ref={panelRef}
					className="absolute right-0 mt-2 w-80 max-h-96 z-50"
				>
					<Card className="w-full max-h-96 overflow-y-auto">
						<CardHeader>
							<CardTitle>Notifications</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{notifications.length === 0 ? (
									<p className="text-sm text-slate-500 dark:text-gray-400">
										No notifications
									</p>
								) : (
									notifications.map((notification) => (
										<div
											key={notification.id}
											className={`p-4 rounded-lg cursor-pointer ${
												!notification.read
													? "bg-slate-50 dark:bg-gray-800"
													: "bg-white dark:bg-gray-900"
											} border border-slate-200 dark:border-gray-700`}
											onClick={() =>
												handleNotificationClick(
													notification
												)
											}
										>
											{notification.announcement_id ? (
												<div>
													<h3 className="font-medium text-slate-800 dark:text-white">
														{
															notification.announcement_title
														}
													</h3>
													<p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
														{
															notification.announcement_message
														}
													</p>
													<div className="text-xs text-slate-500 dark:text-gray-500 mt-2">
														Posted by{" "}
														{
															notification.announcement_author_name
														}{" "}
														on{" "}
														{formatDate(
															notification.created_at
														)}
													</div>
												</div>
											) : (
												<div>
													<p className="text-slate-800 dark:text-white">
														{notification.message}
													</p>
													{notification.event_title && (
														<div className="text-sm text-slate-600 dark:text-gray-400 mt-1">
															{
																notification.event_title
															}
														</div>
													)}
													<div className="text-xs text-slate-500 dark:text-gray-500 mt-2">
														{formatDate(
															notification.created_at
														)}
													</div>
												</div>
											)}
										</div>
									))
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
