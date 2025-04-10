"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";

interface Event {
	id: number;
	title: string;
	date: string;
	description: string;
	location: string;
	organizer: string;
	attendees: number;
	status: "upcoming" | "ongoing" | "completed";
}

export default function EventDetails() {
	const params = useParams();
	const router = useRouter();
	const [event, setEvent] = useState<Event | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchEventDetails = async () => {
			try {
				const response = await fetch(
					`http://localhost:3001/conferences/${params.id}`
				);
				if (!response.ok) {
					throw new Error("Event not found");
				}
				const data = await response.json();
				setEvent(data);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load event"
				);
			} finally {
				setLoading(false);
			}
		};

		fetchEventDetails();
	}, [params.id]);

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
									{event.organizer}
								</p>
							</div>
							<div>
								<h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
									Attendees
								</h3>
								<p className="text-slate-600 dark:text-gray-400">
									{event.attendees} people
								</p>
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
									{new Date(event.date).toLocaleDateString()}
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
