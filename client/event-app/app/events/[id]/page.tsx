"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AnnouncementForm from "@/components/AnnouncementForm";
import { Button } from "@/components/ui/button";
import { toZonedTime, format as formatTz } from "date-fns-tz";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

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
	user_id: number;
	role?: string;
	status?: string;
}

interface Announcement {
	id: number;
	title: string;
	message: string;
	created_at: string;
	author_name: string;
	author_email: string;
}

interface Admin {
	id: number;
	name: string;
	email: string;
	role: string;
}

interface PageParams {
	id: string;
}

// Add utility functions at the top of the file
function toDateInputValue(date: string | Date | undefined): string {
	if (!date) return "";
	const d = typeof date === "string" ? new Date(date) : date;
	return d.toISOString().slice(0, 10);
}

function toTimeInputValue(
	time:
		| string
		| { formatted: string; hours: number; minutes: number }
		| undefined
): string {
	if (!time) return "";
	if (typeof time === "string") {
		return time.slice(0, 5);
	}
	if (typeof time === "object" && time.formatted) {
		const h = String(time.hours).padStart(2, "0");
		const m = String(time.minutes).padStart(2, "0");
		return `${h}:${m}`;
	}
	return "";
}

export default function EventDetails() {
	const params = useParams() as unknown as PageParams;
	const router = useRouter();
	const { data: session } = useSession();
	const [event, setEvent] = useState<Event | null>(null);
	const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
	const [announcements, setAnnouncements] = useState<Announcement[]>([]);
	const [admins, setAdmins] = useState<Admin[]>([]);
	const [isAdmin, setIsAdmin] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [settings, setSettings] = useState({ timezone: "" });
	const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
	const [authToken, setAuthToken] = useState<string | null>(null);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [editFields, setEditFields] = useState({
		title: "",
		description: "",
		start_date: "",
		end_date: "",
		start_time: "",
		end_time: "",
		location: "",
	});

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

				// Fetch admins
				const adminsResponse = await fetch(
					`http://localhost:3001/events/${params.id}/admins`,
					{
						headers: {
							Authorization: `Bearer ${session.user.accessToken}`,
						},
					}
				);

				if (!adminsResponse.ok) {
					throw new Error("Failed to fetch admins");
				}

				const adminsData = await adminsResponse.json();
				setAdmins(adminsData);

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

	useEffect(() => {
		if (event) {
			setEditFields({
				title: event.title,
				description: event.description,
				start_date: event.start_date,
				end_date: event.end_date,
				start_time: event.start_time,
				end_time: event.end_time,
				location: event.location,
			});
		}
	}, [event]);

	// Format time to 12-hour format
	const formatTime = (timeObj: any) => {
		if (!timeObj) return "";
		if (typeof timeObj === "string") return timeObj;
		if (typeof timeObj === "object" && timeObj.formatted)
			return timeObj.formatted;
		return "";
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

	const handleToggleSubscriberStatus = async (
		userId: number,
		currentStatus: string
	) => {
		if (!session?.user?.id || !authToken) return;

		try {
			const newStatus =
				currentStatus === "enabled" ? "disabled" : "enabled";
			const response = await fetch(
				`http://localhost:3001/events/${params.id}/subscribers/${userId}/status`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bearer ${authToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ status: newStatus }),
				}
			);

			if (!response.ok) {
				throw new Error("Failed to update subscriber status");
			}

			// Update local state
			setSubscribers((prevSubscribers) =>
				prevSubscribers.map((sub) =>
					sub.user_id === userId ? { ...sub, status: newStatus } : sub
				)
			);
		} catch (error) {
			console.error("Error updating subscriber status:", error);
		}
	};

	const handleUnsubscribe = async (userId: number) => {
		if (!session?.user?.accessToken) return;

		try {
			const response = await fetch(
				`http://localhost:3001/events/${params.id}/subscribe`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${session.user.accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ user_id: userId }),
				}
			);

			if (!response.ok) {
				throw new Error("Failed to unsubscribe user");
			}

			// Update local state by removing the unsubscribed user
			setSubscribers((prevSubscribers) =>
				prevSubscribers.filter((sub) => sub.user_id !== userId)
			);
		} catch (error) {
			console.error("Error unsubscribing user:", error);
			alert("Failed to unsubscribe user. Please try again.");
		}
	};

	const handleDeleteEvent = async () => {
		try {
			const response = await fetch(
				`http://localhost:3001/events/${params.id}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
				}
			);

			if (response.ok) {
				router.push("/events");
			} else {
				throw new Error("Failed to delete event");
			}
		} catch (error) {
			console.error("Error deleting event:", error);
			setError("Failed to delete event. Please try again.");
		}
	};

	const handleEditFieldChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setEditFields((prev) => ({ ...prev, [name]: value }));
	};

	const handleSaveEdit = async () => {
		// Compare fields before saving
		if (
			event &&
			editFields.title === event.title &&
			editFields.description === event.description &&
			toDateInputValue(editFields.start_date) ===
				toDateInputValue(event.start_date) &&
			toDateInputValue(editFields.end_date) ===
				toDateInputValue(event.end_date) &&
			toTimeInputValue(editFields.start_time) ===
				toTimeInputValue(event.start_time) &&
			toTimeInputValue(editFields.end_time) ===
				toTimeInputValue(event.end_time) &&
			editFields.location === event.location
		) {
			setEditMode(false);
			return;
		}
		try {
			// Ensure time fields are strings
			const getTimeString = (val: any) => {
				if (typeof val === "string") return val;
				if (val && typeof val === "object" && val.formatted)
					return val.formatted;
				return "";
			};
			const body = {
				...editFields,
				start_time: getTimeString(editFields.start_time),
				end_time: getTimeString(editFields.end_time),
			};
			const response = await fetch(
				`http://localhost:3001/events/${params.id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session?.user?.accessToken}`,
					},
					body: JSON.stringify(body),
				}
			);
			if (!response.ok) throw new Error("Failed to update event");
			const updatedEvent = await response.json();
			setEvent({
				...event,
				...updatedEvent,
				status: updatedEvent.status || event?.status,
			});
			setEditMode(false);
		} catch (err) {
			setError("Failed to update event. Please try again.");
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-gray-900 p-6">
			{/* Header */}
			<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-slate-100 dark:border-gray-700">
				<div className="flex items-center justify-between">
					{editMode ? (
						<input
							name="title"
							value={editFields.title}
							onChange={handleEditFieldChange}
							className="text-3xl font-bold text-slate-800 dark:text-white bg-transparent border-b border-indigo-300 focus:outline-none focus:border-indigo-600 mb-2 w-full"
						/>
					) : (
						<h1 className="text-3xl font-bold text-slate-800 dark:text-white">
							{event.title}
						</h1>
					)}
					<div className="flex items-center gap-4">
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
						{isAdmin && !editMode && (
							<button
								onClick={() => setEditMode(true)}
								className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mr-2"
								title="Edit Event"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							</button>
						)}
						{isAdmin && editMode && (
							<>
								<Button
									onClick={handleSaveEdit}
									className="bg-emerald-600 text-white px-6 py-2 text-base rounded-lg shadow hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all duration-200 active:scale-95 mr-2"
								>
									Save
								</Button>
								<Button
									onClick={() => {
										setEditMode(false);
										setEditFields({ ...event });
									}}
									className="bg-gray-300 text-gray-800 px-6 py-2 text-base rounded-lg shadow hover:bg-gray-400 focus:ring-2 focus:ring-gray-400 focus:outline-none transition-all duration-200 active:scale-95"
								>
									Cancel
								</Button>
							</>
						)}
						{isAdmin && (
							<button
								onClick={() => setShowDeleteDialog(true)}
								className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
								title="Delete Event"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-6 w-6"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						)}
					</div>
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
						{editMode ? (
							<>
								<textarea
									name="description"
									value={editFields.description}
									onChange={handleEditFieldChange}
									className="w-full rounded border border-slate-300 dark:border-gray-600 p-2 mb-4 bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
									rows={3}
								/>
								<div className="flex gap-2">
									<Button
										onClick={handleSaveEdit}
										className="bg-emerald-600 text-white px-6 py-2 text-base rounded-lg shadow hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all duration-200 active:scale-95 mr-2"
									>
										Save
									</Button>
									<Button
										onClick={() => {
											setEditMode(false);
											setEditFields({ ...event });
										}}
										className="bg-gray-300 text-gray-800 px-6 py-2 text-base rounded-lg shadow hover:bg-gray-400 focus:ring-2 focus:ring-gray-400 focus:outline-none transition-all duration-200 active:scale-95"
									>
										Cancel
									</Button>
								</div>
							</>
						) : (
							<p className="text-slate-600 dark:text-gray-400 whitespace-pre-wrap">
								{event.description}
							</p>
						)}
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
								<div className="space-y-2">
									{/* Only show unique admins by email */}
									{Array.from(
										new Map(
											admins.map((a) => [a.email, a])
										).values()
									).map((admin) => (
										<div
											key={admin.id}
											className="flex items-center space-x-2"
										>
											<span className="text-slate-600 dark:text-gray-400">
												{admin.name} (
												{admin.role
													.charAt(0)
													.toUpperCase() +
													admin.role.slice(1)}
												)
											</span>
											<span className="text-slate-500 dark:text-gray-500 text-sm">
												({admin.email})
											</span>
										</div>
									))}
								</div>
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
												className="flex items-center justify-between space-x-2 relative group"
											>
												<div className="flex items-center space-x-2">
													<span className="text-slate-600 dark:text-gray-400">
														{subscriber.name}
														{subscriber.role &&
															subscriber.role !==
																"attendee" && (
																<>
																	{" "}
																	(
																	{subscriber.role
																		.charAt(
																			0
																		)
																		.toUpperCase() +
																		subscriber.role.slice(
																			1
																		)}
																	)
																</>
															)}
													</span>
													<span className="text-slate-500 dark:text-gray-500 text-sm">
														({subscriber.email})
													</span>
												</div>
												{(isAdmin ||
													event.creator_email ===
														session?.user
															?.email) && (
													<button
														onClick={() => {
															if (
																window.confirm(
																	"Are you sure you want to unsubscribe this user?"
																)
															) {
																handleUnsubscribe(
																	subscriber.user_id
																);
															}
														}}
														className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 z-10 shadow active:scale-90 hover:scale-110 transform"
														title="Unsubscribe user"
														aria-label="Unsubscribe user"
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
							{isAdmin && (
								<div className="flex justify-end mb-2">
									{!editMode ? (
										<Button
											onClick={() => setEditMode(true)}
											className="bg-indigo-600 text-white px-6 py-2 text-base rounded-lg shadow hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-400 focus:outline-none transition-all duration-200 active:scale-95"
										>
											Edit
										</Button>
									) : (
										<>
											<Button
												onClick={handleSaveEdit}
												className="bg-emerald-600 text-white px-6 py-2 text-base rounded-lg shadow hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all duration-200 active:scale-95 mr-2"
											>
												Save
											</Button>
											<Button
												onClick={() => {
													setEditMode(false);
													setEditFields({ ...event });
												}}
												className="bg-gray-300 text-gray-800 px-6 py-2 text-base rounded-lg shadow hover:bg-gray-400 focus:ring-2 focus:ring-gray-400 focus:outline-none transition-all duration-200 active:scale-95"
											>
												Cancel
											</Button>
										</>
									)}
								</div>
							)}
							<div>
								<h3 className="text-sm font-medium text-slate-500 dark:text-gray-400">
									Date
								</h3>
								{editMode ? (
									<div className="flex gap-2">
										<input
											type="date"
											name="start_date"
											value={toDateInputValue(
												editFields.start_date
											)}
											onChange={handleEditFieldChange}
											className="rounded border border-slate-300 dark:border-gray-600 p-1 bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
										/>
										<span>-</span>
										<input
											type="date"
											name="end_date"
											value={toDateInputValue(
												editFields.end_date
											)}
											onChange={handleEditFieldChange}
											className="rounded border border-slate-300 dark:border-gray-600 p-1 bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
										/>
									</div>
								) : (
									<p className="text-slate-800 dark:text-white">
										{new Date(
											event.start_date
										).toLocaleDateString()}{" "}
										-{" "}
										{new Date(
											event.end_date
										).toLocaleDateString()}
									</p>
								)}
							</div>
							<div>
								<h3 className="text-sm font-medium text-slate-500 dark:text-gray-400">
									Time
								</h3>
								{editMode ? (
									<div className="flex gap-2">
										<input
											type="time"
											name="start_time"
											value={toTimeInputValue(
												editFields.start_time
											)}
											onChange={handleEditFieldChange}
											className="rounded border border-slate-300 dark:border-gray-600 p-1 bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
										/>
										<span>-</span>
										<input
											type="time"
											name="end_time"
											value={toTimeInputValue(
												editFields.end_time
											)}
											onChange={handleEditFieldChange}
											className="rounded border border-slate-300 dark:border-gray-600 p-1 bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
										/>
										{event.display_timezone && (
											<span className="ml-2 text-sm text-slate-500">
												({event.display_timezone})
											</span>
										)}
									</div>
								) : (
									<p className="text-slate-800 dark:text-white">
										{formatTime(event.start_time)} -{" "}
										{formatTime(event.end_time)}
										{event.display_timezone && (
											<span className="ml-2 text-sm text-slate-500">
												({event.display_timezone})
											</span>
										)}
									</p>
								)}
							</div>
							<div>
								<h3 className="text-sm font-medium text-slate-500 dark:text-gray-400">
									Location
								</h3>
								{editMode ? (
									<input
										name="location"
										value={editFields.location}
										onChange={handleEditFieldChange}
										className="w-full rounded border border-slate-300 dark:border-gray-600 p-1 bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
									/>
								) : (
									<p className="text-slate-800 dark:text-white">
										{event.location}
									</p>
								)}
							</div>
							<div>
								<h3 className="text-sm font-medium text-slate-500 dark:text-gray-400">
									Status
								</h3>
								<p className="text-slate-800 dark:text-white">
									{event.status
										? event.status.charAt(0).toUpperCase() +
											event.status.slice(1)
										: "Unknown"}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<ConfirmationDialog
				isOpen={showDeleteDialog}
				onClose={() => setShowDeleteDialog(false)}
				onConfirm={handleDeleteEvent}
				title="Delete Event"
				message="Are you sure you want to delete this event? This action cannot be undone."
				confirmText="Delete"
			/>
		</div>
	);
}
