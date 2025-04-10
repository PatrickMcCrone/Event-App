"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";

interface Event {
	id: number;
	title: string;
	description: string;
	date: string;
	location: string;
	organizer: string;
	attendees: number;
	status?: "upcoming" | "ongoing" | "completed";
}

export default function Events() {
	const [events, setEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<
		"all" | "upcoming" | "ongoing" | "completed"
	>("all");
	const router = useRouter();
	const { theme } = useTheme();

	useEffect(() => {
		const fetchEvents = async () => {
			try {
				const response = await fetch(
					"http://localhost:3001/conferences",
					{
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							Accept: "application/json",
						},
					}
				);

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const contentType = response.headers.get("content-type");
				if (!contentType || !contentType.includes("application/json")) {
					throw new Error("Server did not return JSON");
				}

				const data = await response.json();
				// Add default status based on date
				const eventsWithStatus = data.map((event: Event) => ({
					...event,
					status: getEventStatus(event.date),
				}));
				setEvents(eventsWithStatus);
				setError(null);
			} catch (error) {
				console.error("Error fetching events:", error);
				setError(
					error instanceof Error
						? error.message
						: "Failed to fetch events"
				);
			} finally {
				setLoading(false);
			}
		};

		fetchEvents();
	}, []);

	const getEventStatus = (
		date: string
	): "upcoming" | "ongoing" | "completed" => {
		const eventDate = new Date(date);
		const now = new Date();
		const diffTime = eventDate.getTime() - now.getTime();
		const diffDays = diffTime / (1000 * 60 * 60 * 24);

		if (diffDays < 0) return "completed";
		if (diffDays <= 1) return "ongoing";
		return "upcoming";
	};

	const filteredEvents = events.filter((event) => {
		if (filter === "all") return true;
		return event.status === filter;
	});

	const sortedEvents = filteredEvents.sort((a, b) => {
		const dateA = new Date(a.date);
		const dateB = new Date(b.date);
		return dateB.getTime() - dateA.getTime();
	});

	const handleEventClick = (eventId: number) => {
		router.push(`/events/${eventId}`);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-gray-900">
			{/* Header */}
			<div className="bg-white dark:bg-gray-800 shadow border-b border-slate-100 dark:border-gray-700">
				<div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
					<h1 className="text-3xl font-bold text-slate-800 dark:text-white">
						Events
					</h1>
					<p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
						Browse and manage all events
					</p>
				</div>
			</div>

			{/* Main Content */}
			<div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
				{/* Filters */}
				<div className="mb-8">
					<div className="flex space-x-4">
						<button
							onClick={() => setFilter("all")}
							className={`px-4 py-2 rounded-md text-sm font-medium ${
								filter === "all"
									? "bg-indigo-600 text-white"
									: "bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-600 border border-slate-200 dark:border-gray-600"
							}`}
						>
							All Events
						</button>
						<button
							onClick={() => setFilter("upcoming")}
							className={`px-4 py-2 rounded-md text-sm font-medium ${
								filter === "upcoming"
									? "bg-indigo-600 text-white"
									: "bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-600 border border-slate-200 dark:border-gray-600"
							}`}
						>
							Upcoming
						</button>
						<button
							onClick={() => setFilter("ongoing")}
							className={`px-4 py-2 rounded-md text-sm font-medium ${
								filter === "ongoing"
									? "bg-indigo-600 text-white"
									: "bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-600 border border-slate-200 dark:border-gray-600"
							}`}
						>
							Ongoing
						</button>
						<button
							onClick={() => setFilter("completed")}
							className={`px-4 py-2 rounded-md text-sm font-medium ${
								filter === "completed"
									? "bg-indigo-600 text-white"
									: "bg-white dark:bg-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-600 border border-slate-200 dark:border-gray-600"
							}`}
						>
							Completed
						</button>
					</div>
				</div>

				{/* Events Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{sortedEvents.length === 0 ? (
						<div className="col-span-full text-center py-12">
							<p className="text-lg text-slate-600 dark:text-gray-400">
								No events found in this category.
							</p>
						</div>
					) : (
						sortedEvents.map((event) => (
							<div
								key={event.id}
								className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200 cursor-pointer border border-slate-100 dark:border-gray-700"
								onClick={() => handleEventClick(event.id)}
							>
								<div className="p-6">
									<div className="flex items-center justify-between mb-4">
										<h2 className="text-xl font-semibold text-slate-800 dark:text-white">
											{event.title}
										</h2>
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
												? event.status
														.charAt(0)
														.toUpperCase() +
												  event.status.slice(1)
												: "Unknown"}
										</span>
									</div>
									<p className="text-slate-600 dark:text-gray-400 mb-4 line-clamp-2">
										{event.description}
									</p>
									<div className="flex items-center justify-between text-sm">
										<span className="text-slate-500 dark:text-gray-400">
											{new Date(
												event.date
											).toLocaleDateString()}
										</span>
										<span className="text-slate-500 dark:text-gray-400">
											{event.attendees} attendees
										</span>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
