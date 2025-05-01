"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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

export default function EventDetails() {
	const params = useParams();
	const router = useRouter();
	const [event, setEvent] = useState<Event | null>(null);
	const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const { data: session } = useSession();
	const [settings, setSettings] = useState({ timezone: "" });

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

	// Fetch event details only after settings are available
	useEffect(() => {
		const fetchEventDetails = async () => {
			if (!settings.timezone) {
				return;
			}

			setLoading(true);
			try {
				console.log("Fetching event with timezone:", settings.timezone);
				const response = await fetch(
					`http://localhost:3001/events/${params.id}?timezone=${settings.timezone}`
				);
				if (!response.ok) {
					throw new Error("Event not found");
				}
				const data = await response.json();
				console.log("Received event data:", {
					start_time: data.start_time,
					end_time: data.end_time,
					display_timezone: data.display_timezone,
				});

				// Calculate status based on start and end dates
				const now = new Date();
				const startDate = new Date(data.start_date);
				const endDate = new Date(data.end_date);
				const status =
					now > endDate
						? "completed"
						: now >= startDate && now <= endDate
						? "ongoing"
						: "upcoming";
				setEvent({ ...data, status });

				// Fetch subscribers
				const subsResponse = await fetch(
					`http://localhost:3001/events/${params.id}/subscribers`
				);
				if (subsResponse.ok) {
					const subsData = await subsResponse.json();
					setSubscribers(subsData);
				}
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load event"
				);
			} finally {
				setLoading(false);
			}
		};

		fetchEventDetails();
	}, [params.id, settings.timezone]);

	// Format time to 12-hour format
	const formatTime = (timeObj: any) => {
		console.log("Formatting time object:", timeObj);
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

					{/* Additional Information */}
					<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-slate-100 dark:border-gray-700">
						<h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-4">
							Additional Information
						</h2>
						<div className="space-y-4">
							<div>
								<h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
									Organizer
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
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
