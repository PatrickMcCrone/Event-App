"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../context/ThemeContext";
import { useSession } from "next-auth/react";
import AuthWrapper from "../../components/AuthWrapper";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "@heroicons/react/24/outline";

interface Event {
	id: number;
	title: string;
	description: string;
	start_date: string;
	end_date: string;
	start_time: string;
	end_time: string;
	location: string;
	status?: "upcoming" | "ongoing" | "completed";
}

export default function SubscribedEvents() {
	const { data: session } = useSession();
	const [subscribedEvents, setSubscribedEvents] = useState<Event[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState<
		"all" | "upcoming" | "ongoing" | "completed"
	>("all");
	const [authToken, setAuthToken] = useState<string | null>(null);
	const [hoveredEventId, setHoveredEventId] = useState<number | null>(null);
	const router = useRouter();
	const { theme } = useTheme();

	const getEventStatus = (
		startDate: string,
		endDate: string,
		startTime: string,
		endTime: string
	): "upcoming" | "ongoing" | "completed" => {
		const now = new Date();

		// Create date objects with time
		const eventStart = new Date(startDate);
		const [startHours, startMinutes] = startTime.split(":").map(Number);
		eventStart.setHours(startHours, startMinutes, 0, 0);

		const eventEnd = new Date(endDate);
		const [endHours, endMinutes] = endTime.split(":").map(Number);
		eventEnd.setHours(endHours, endMinutes, 0, 0);

		if (now > eventEnd) return "completed";
		if (now >= eventStart && now <= eventEnd) return "ongoing";
		return "upcoming";
	};

	const formatDateRange = (startDate: string, endDate: string) => {
		const start = new Date(startDate);
		const end = new Date(endDate);

		if (start.toDateString() === end.toDateString()) {
			return start.toLocaleDateString();
		}

		return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
	};

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

	useEffect(() => {
		const fetchSubscribedEvents = async () => {
			if (!session?.user?.id || !authToken) {
				setLoading(false);
				return;
			}

			try {
				// Fetch subscribed events
				const response = await fetch(
					`http://localhost:3001/users/${session.user.id}/subscriptions`,
					{
						headers: {
							Authorization: `Bearer ${authToken}`,
							"Content-Type": "application/json",
						},
					}
				);

				if (!response.ok) {
					throw new Error("Failed to fetch subscriptions");
				}

				const subscriptionsData = await response.json();

				if (!Array.isArray(subscriptionsData)) {
					throw new Error("Invalid subscription data received");
				}

				// Transform the data to match our Event interface
				const events = subscriptionsData.map((sub) => ({
					id: sub.event_id,
					title: sub.title,
					description: sub.description,
					start_date: sub.start_date,
					end_date: sub.end_date,
					start_time: sub.start_time,
					end_time: sub.end_time,
					location: sub.location,
					status: getEventStatus(
						sub.start_date,
						sub.end_date,
						sub.start_time,
						sub.end_time
					),
				}));

				setSubscribedEvents(events);
				setError(null);
			} catch (error) {
				console.error("Error fetching subscribed events:", error);
				setError(
					error instanceof Error
						? error.message
						: "Failed to fetch subscribed events"
				);
			} finally {
				setLoading(false);
			}
		};

		fetchSubscribedEvents();
	}, [session?.user?.id, authToken]);

	const handleUnsubscribe = async (eventId: number) => {
		if (!session?.user?.id || !authToken) return;

		try {
			const response = await fetch(
				`http://localhost:3001/events/${eventId}/subscribe`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${authToken}`,
						"Content-Type": "application/json",
					},
				}
			);

			if (!response.ok) {
				throw new Error("Failed to unsubscribe");
			}

			// Remove the event from the list
			setSubscribedEvents((events) =>
				events.filter((event) => event.id !== eventId)
			);
		} catch (error) {
			console.error("Error unsubscribing:", error);
		}
	};

	const handleEventClick = (eventId: number) => {
		router.push(`/events/${eventId}`);
	};

	const filteredEvents = subscribedEvents.filter((event) => {
		if (filter === "all") return true;
		const status = getEventStatus(
			event.start_date,
			event.end_date,
			event.start_time,
			event.end_time
		);
		return status === filter;
	});

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
						Subscribed Events
					</h1>
					<p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
						View and manage your subscribed events
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
					{filteredEvents.length === 0 ? (
						<div className="col-span-full text-center py-12">
							<p className="text-lg text-slate-600 dark:text-gray-400">
								No subscribed events found in this category.
							</p>
						</div>
					) : (
						filteredEvents.map((event) => (
							<div
								key={event.id}
								className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200 cursor-pointer border border-slate-100 dark:border-gray-700 min-h-[200px]"
								onClick={() => handleEventClick(event.id)}
								onMouseEnter={() => setHoveredEventId(event.id)}
								onMouseLeave={() => setHoveredEventId(null)}
							>
								<div className="p-6 flex flex-col h-full">
									<div className="flex items-center justify-between h-12">
										<h2 className="text-xl font-semibold text-slate-800 dark:text-white line-clamp-1">
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
									<div className="flex-1" />
									<div className="space-y-4">
										<p className="text-slate-600 dark:text-gray-400 line-clamp-2">
											{event.description}
										</p>
										<span className="block text-sm text-slate-500 dark:text-gray-400">
											{formatDateRange(
												event.start_date,
												event.end_date
											)}
										</span>
									</div>
								</div>
								{hoveredEventId === event.id && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											handleUnsubscribe(event.id);
										}}
										className="absolute bottom-4 right-4 p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-5 w-5"
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path
												fillRule="evenodd"
												d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
												clipRule="evenodd"
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
	);
}
