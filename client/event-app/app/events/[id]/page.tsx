"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AnnouncementForm from "@/components/AnnouncementForm";
import { Button } from "@/components/ui/button";
import { toZonedTime, format as formatTz } from "date-fns-tz";

interface Event {
	id: number;
	title: string;
	description: string;
	start_date: string;
	end_date: string;
	start_time: string;
	end_time: string;
	location: string;
	organizer: string;
	attendees: number;
	status: "upcoming" | "ongoing" | "completed";
	createdBy: string;
	creator_name: string;
	creator_email: string;
	display_timezone?: string;
}

interface Subscriber {
	id: number;
	name: string;
	email: string;
}

interface Announcement {
	id: number;
	title: string;
	message: string;
	created_at: string;
	author_name: string;
	author_email: string;
}

export default function EventDetails() {
	const params = useParams();
	const router = useRouter();
	const { data: session } = useSession();
	const [event, setEvent] = useState<Event | null>(null);
	const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [isAdmin, setIsAdmin] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [settings, setSettings] = useState({ timezone: "" });
	const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);

	// Fetch user settings first
	useEffect(() => {
		const fetchSettings = async () => {
			if (session?.user?.id) {
				try {
					console.log("Fetching user settings...");
					const response = await fetch(
						`http://localhost:3001/settings/reminders/${session.user.id}`
					);
					if (response.ok) {
						const data = await response.json();
						console.log("Received settings:", data);
						setSettings((prev) => ({
							...prev,
							timezone: data.timezone || "America/New_York",
						}));
					}
				} catch (error) {
					console.error("Error fetching settings:", error);
				}
			}
		};
		fetchSettings();
	}, [session?.user?.id]);

	useEffect(() => {
		const fetchEventDetails = async () => {
			if (!session?.user?.id) return;

			try {
				// Fetch event details
				const eventResponse = await fetch(
					`http://localhost:3001/events/${params.id}`,
					{
						headers: {
							Authorization: `Bearer ${session.user.accessToken}`,
						},
					}
				);

				if (!eventResponse.ok) {
					throw new Error("Failed to fetch event details");
				}

				const eventData = await eventResponse.json();
				setEvent(eventData);

				// Fetch subscribers
				const subscribersResponse = await fetch(
					`http://localhost:3001/events/${params.id}/subscribers`,
					{
						headers: {
							Authorization: `Bearer ${session.user.accessToken}`,
						},
					}
				);

				if (!subscribersResponse.ok) {
					throw new Error("Failed to fetch subscribers");
				}

				const subscribersData = await subscribersResponse.json();
				setSubscribers(subscribersData);

				// Fetch announcements
				const announcementsResponse = await fetch(
					`http://localhost:3001/events/${params.id}/announcements`,
					{
						headers: {
							Authorization: `Bearer ${session.user.accessToken}`,
						},
					}
				);

				if (!announcementsResponse.ok) {
					throw new Error("Failed to fetch announcements");
				}

				const announcementsData = await announcementsResponse.json();
				setAnnouncements(announcementsData);

				// Check if user is admin
				const adminResponse = await fetch(
					`http://localhost:3001/events/${params.id}/admin`,
					{
						headers: {
							Authorization: `Bearer ${session.user.accessToken}`,
						},
					}
				);

				if (adminResponse.ok) {
					setIsAdmin(true);
				}
			} catch (error) {
				console.error("Error fetching event details:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchEventDetails();
	}, [params.id, session]);

	// Format time to 12-hour format
	const formatTime = (timeObj: any) => {
		if (!timeObj || !timeObj.formatted) return "";
		return timeObj.formatted;
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
			</div>
		);
	}

	if (error || !event) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen">
				<h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
				<p className="text-gray-600 dark:text-gray-400 mb-4">
					{error || "Event not found"}
				</p>
				<button
					onClick={() => router.push("/events")}
					className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
				>
					Back to Events
				</button>
			</div>
		);
	}

	const handleAnnouncementCreated = async () => {
		// Refresh announcements
		const response = await fetch(
			`http://localhost:3001/events/${params.id}/announcements`,
			{
				headers: {
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			}
		);

		if (response.ok) {
			const data = await response.json();
			setAnnouncements(data);
		}
	};

	const handleDeleteAnnouncement = async (announcementId: number) => {
		if (
			!window.confirm(
				"Are you sure you want to delete this announcement?"
			)
		)
			return;
		try {
			await fetch(
				`http://localhost:3001/events/${event?.id}/announcements/${announcementId}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				}
			);
			// Refresh announcements
			const response = await fetch(
				`http://localhost:3001/events/${event?.id}/announcements`,
				{
					headers: {
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				}
			);
			if (response.ok) {
				const data = await response.json();
				setAnnouncements(data);
			}
		} catch (error) {
			alert("Failed to delete announcement.");
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-6">
			{/* Header */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-slate-100 dark:border-gray-700">
				<div className="flex items-center justify-between">
					<h1 className="text-3xl font-bold text-slate-800 dark:text-white">
						{event.title}
					</h1>
					<span
						className={`px-3 py-1 rounded-full text-sm font-medium ${
							event.status === "upcoming"
								? "bg-emerald-50 text-emerald-700 dark:bg-green-900 dark:text-green-100"
								: event.status === "ongoing"
									? "bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
									: "bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-100"
						}`}
					>
						{event.status
							? event.status.charAt(0).toUpperCase() +
								event.status.slice(1)
							: "Unknown"}
					</span>
				</div>
			</div>

			{/* Main Content */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
				{/* Event Details */}
				<div className="md:col-span-2">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-slate-100 dark:border-gray-700">
						<h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-4">
							About This Event
						</h2>
						<p className="text-slate-600 dark:text-gray-400 whitespace-pre-wrap">
							{event.description}
						</p>
					</div>

					{/* Announcements Section */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-slate-100 dark:border-gray-700">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-2xl font-semibold text-slate-800 dark:text-white">
								Announcements
							</h2>
							{isAdmin && (
								<Button
									onClick={() =>
										setShowAnnouncementForm(
											!showAnnouncementForm
										)
									}
									className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-400 focus:outline-none text-white font-semibold px-4 py-2 rounded-lg shadow transition-all duration-150 active:scale-95 hover:scale-105 transform w-auto"
								>
									{!showAnnouncementForm && (
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-5 w-5"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth={2}
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M12 4v16m8-8H4"
											/>
										</svg>
									)}
									{showAnnouncementForm
										? "Cancel"
										: "New Announcement"}
								</Button>
							)}
						</div>
						{showAnnouncementForm && (
							<AnnouncementForm
								eventId={event.id}
								onAnnouncementCreated={
									handleAnnouncementCreated
								}
								subscribers={subscribers
									.filter(
										(s) => s.email !== event.creator_email
									)
									.map((s) => ({
										id: s.user_id,
										name: s.name,
										email: s.email,
									}))}
							/>
						)}
						<div className="space-y-4 max-h-56 overflow-y-auto">
							{announcements.length === 0 ? (
								<p className="text-slate-500 dark:text-gray-400">
									No announcements yet
								</p>
							) : (
								announcements.map((announcement) => (
									<div
										key={announcement.id}
										className="bg-slate-50 dark:bg-gray-900 rounded-lg p-4 border border-slate-200 dark:border-gray-800 relative group"
									>
										{isAdmin && (
											<button
												onClick={() =>
													handleDeleteAnnouncement(
														announcement.id
													)
												}
												className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 z-10 shadow active:scale-90 hover:scale-110 transform"
												title="Delete announcement"
												aria-label="Delete announcement"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													className="h-4 w-4"
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
										)}
										<h3 className="font-semibold text-lg text-slate-800 dark:text-white mb-1">
											{announcement.title}
										</h3>
										<p className="text-slate-700 dark:text-gray-300 mb-2">
											{announcement.message}
										</p>
										<div className="text-xs text-slate-500 dark:text-gray-400 flex justify-between">
											<span>
												By {announcement.author_name}
											</span>
											<span>
												{announcement.created_at
													? (() => {
															const date =
																new Date(
																	announcement.created_at
																);
															return date.toLocaleString(
																"en-US",
																{
																	timeZone:
																		settings.timezone ||
																		"America/New_York",
																	year: "numeric",
																	month: "short",
																	day: "numeric",
																	hour: "numeric",
																	minute: "2-digit",
																	hour12: true,
																}
															);
														})()
													: ""}
											</span>
										</div>
									</div>
								))
							)}
						</div>
					</div>

					{/* Additional Information */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-slate-100 dark:border-gray-700">
						<h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-4">
							Additional Information
						</h2>
						<div className="space-y-4">
							<div>
								<h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
									Organizer(s)
								</h3>
								<p className="text-slate-600 dark:text-gray-400">
									{event.creator_name}
								</p>
							</div>
							<div>
								<h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
									Attendees ({subscribers.length})
								</h3>
								<div className="space-y-2">
									{subscribers.length === 0 ? (
										<p className="text-slate-600 dark:text-gray-400">
											No attendees yet
										</p>
									) : (
										subscribers.map((subscriber) => (
											<div
												key={subscriber.id}
												className="flex items-center space-x-2"
											>
												<span className="text-slate-600 dark:text-gray-400">
													{subscriber.name}
												</span>
												<span className="text-slate-500 dark:text-gray-500 text-sm">
													({subscriber.email})
												</span>
											</div>
										))
									)}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Sidebar */}
				<div className="md:col-span-1">
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-slate-100 dark:border-gray-700">
						<h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-4">
							Event Details
						</h2>
						<div className="space-y-4">
							<div>
								<h3 className="text-sm font-medium text-slate-500 dark:text-gray-400">
									Date
								</h3>
								<p className="text-slate-800 dark:text-white">
									{new Date(
										event.start_date
									).toLocaleDateString()}{" "}
									-{" "}
									{new Date(
										event.end_date
									).toLocaleDateString()}
								</p>
							</div>
							<div>
								<h3 className="text-sm font-medium text-slate-500 dark:text-gray-400">
									Time
								</h3>
								<p className="text-slate-800 dark:text-white">
									{formatTime(event.start_time)} -{" "}
									{formatTime(event.end_time)}
									{event.display_timezone && (
										<span className="ml-2 text-sm text-slate-500">
											({event.display_timezone})
										</span>
									)}
								</p>
							</div>
							<div>
								<h3 className="text-sm font-medium text-slate-500 dark:text-gray-400">
									Location
								</h3>
								<p className="text-slate-800 dark:text-white">
									{event.location}
								</p>
							</div>
							<div>
								<h3 className="text-sm font-medium text-slate-500 dark:text-gray-400">
									Status
								</h3>
								<p className="text-slate-800 dark:text-white">
									{event.status.charAt(0).toUpperCase() +
										event.status.slice(1)}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
