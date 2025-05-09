"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "./context/ThemeContext";
import { useSession } from "next-auth/react";

// Define the type for a single event
interface Event {
	id: number;
	title: string;
	description: string;
	start_date: string;
	end_date: string;
	start_time: string;
	end_time: string;
	location: string;
	type: string;
	creator: {
		name: string;
		email: string;
	};
}

export default function Home() {
	const [events, setEvents] = useState<Event[]>([]);
	const [totalUsers, setTotalUsers] = useState<number>(0);
	const [totalEvents, setTotalEvents] = useState<number>(0);
	const [isClient, setIsClient] = useState(false);
	const { theme } = useTheme();
	const router = useRouter();
	const { data: session, status } = useSession();
	const isLoading = status === "loading";
	const isAuthenticated = status === "authenticated";
	const isAdmin = session?.user?.admin === true;

	// Use useEffect to ensure that the router is only used on the client
	useEffect(() => {
		setIsClient(true);
	}, []);

	useEffect(() => {
		const fetchData = async () => {
			try {
				// Fetch events
				const eventsResponse = await fetch(
					"http://localhost:3001/events"
				);
				if (!eventsResponse.ok) {
					throw new Error("Failed to fetch events");
				}
				const eventsData = await eventsResponse.json();

				if (!Array.isArray(eventsData)) {
					throw new Error("Invalid events data received");
				}

				// Sort events by the date in descending order (latest first)
				const sortedEvents: Event[] = eventsData.sort(
					(a: Event, b: Event) => {
						const dateA: Date = new Date(
							a.start_date + "T" + a.start_time
						);
						const dateB: Date = new Date(
							b.start_date + "T" + b.start_time
						);
						return dateB.getTime() - dateA.getTime();
					}
				);

				// Set total events count
				setTotalEvents(eventsData.length);

				// Slice the sorted events to get only the 3 most recent
				setEvents(sortedEvents.slice(0, 3));

				// Fetch total users count
				try {
					const usersResponse = await fetch(
						"http://localhost:3001/users/active-count"
					);
					if (usersResponse.ok) {
						const usersData = await usersResponse.json();
						setTotalUsers(usersData.totalUsers);
					} else {
						console.warn("Users count endpoint not available");
						setTotalUsers(0);
					}
				} catch (error) {
					console.warn("Error fetching users count:", error);
					setTotalUsers(0);
				}
			} catch (error) {
				console.error("Error fetching data:", error);
				setEvents([]);
				setTotalEvents(0);
			}
		};

		fetchData();
	}, []);

	// Handle the button click to navigate to the create-event page
	const handleCreateEventClick = () => {
		if (router) {
			router.push("/create-event");
		}
	};

	const handleBrowseEventsClick = () => {
		if (router) {
			router.push("/events");
		}
	};

	const handleEventClick = (eventId: number) => {
		if (router) {
			router.push(`/events/${eventId}`);
		}
	};

	// Format time to 12-hour format
	const formatTime = (timeObj: any) => {
		if (!timeObj || !timeObj.formatted) return "";
		return timeObj.formatted;
	};

	// Format date range
	const formatDateRange = (startDate: string, endDate: string) => {
		const start = new Date(startDate);
		const end = new Date(endDate);

		if (start.toDateString() === end.toDateString()) {
			return start.toLocaleDateString();
		}

		return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
	};

	if (!isClient || isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen">
			{/* Hero Section */}
			<div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800 dark:from-blue-900 dark:to-blue-950">
				<div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px]" />
				<div className="relative max-w-7xl mx-auto px-6 py-24 sm:py-32 lg:px-8">
					<div className="text-center">
						<h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
							Welcome to Event App
						</h1>
						<p className="mt-6 text-lg leading-8 text-indigo-100">
							Create, manage, and explore faculty events with
							ease. Your one-stop platform for academic event
							management.
						</p>
						<div className="mt-10 flex flex-col items-center justify-center gap-y-4 gap-x-6">
							<div className="flex gap-x-6">
								{isAuthenticated ? (
									isAdmin ? (
										<button
											onClick={handleCreateEventClick}
											className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200 hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-95"
										>
											Create New Event
										</button>
									) : null
								) : (
									<button
										onClick={() => router.push("/login")}
										className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200 hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-95"
									>
										Sign In
									</button>
								)}
								<button
									onClick={handleBrowseEventsClick}
									className="rounded-md bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition-all duration-200 hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-95"
								>
									Browse Events
								</button>
							</div>
							{!isAdmin && isAuthenticated && (
								<div className="flex flex-col items-center justify-center mt-6 gap-2">
									<span className="text-slate-200 dark:text-indigo-100 text-base font-medium">
										Need the ability to create events?
									</span>
									<button
										onClick={() =>
											router.push("/admin-application")
										}
										className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-3 font-semibold transition-all duration-200 hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
									>
										Apply for Admin status here
										<svg
											className="ml-1 w-5 h-5 transition-all duration-300 ease-in-out"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											viewBox="0 0 24 24"
										>
											<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
											<circle cx="9" cy="7" r="4" />
											<line
												x1="19"
												y1="8"
												x2="19"
												y2="14"
											/>
											<line
												x1="22"
												y1="11"
												x2="16"
												y2="11"
											/>
										</svg>
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Stats Section */}
			<div className="bg-slate-100 dark:bg-gray-800/50 py-24 sm:py-32">
				<div className="mx-auto max-w-7xl px-6 lg:px-8">
					<dl className="grid grid-cols-1 gap-x-8 gap-y-16 text-center lg:grid-cols-2">
						<div className="mx-auto flex max-w-xs flex-col gap-y-4">
							<dt className="text-base leading-7 text-slate-600 dark:text-gray-400">
								Total Users
							</dt>
							<dd className="order-first text-3xl font-semibold tracking-tight text-slate-800 dark:text-white sm:text-5xl">
								{totalUsers || 0}
							</dd>
						</div>
						<div className="mx-auto flex max-w-xs flex-col gap-y-4">
							<dt className="text-base leading-7 text-slate-600 dark:text-gray-400">
								Events Created
							</dt>
							<dd className="order-first text-3xl font-semibold tracking-tight text-slate-800 dark:text-white sm:text-5xl">
								{totalEvents}
							</dd>
						</div>
					</dl>
				</div>
			</div>

			{/* Upcoming Events Section */}
			<div className="bg-slate-50 dark:bg-gray-800 py-24 sm:py-32">
				<div className="mx-auto max-w-7xl px-6 lg:px-8">
					<div className="mx-auto max-w-2xl text-center">
						<h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white sm:text-4xl">
							Upcoming Events
						</h2>
						<p className="mt-2 text-lg leading-8 text-slate-600 dark:text-gray-400">
							Stay updated with the latest faculty events and
							conferences.
						</p>
					</div>
					<div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
						{events.length === 0 ? (
							<div className="col-span-3 text-center py-12">
								<p className="text-lg text-slate-600 dark:text-gray-400">
									No upcoming events at the moment.
								</p>
							</div>
						) : (
							events.map((event) => (
								<article
									key={event.id}
									className="flex flex-col items-start bg-white dark:bg-gray-700 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200 border border-slate-100 dark:border-gray-600"
								>
									<div className="flex items-center gap-x-4 text-xs">
										<time
											dateTime={event.start_date}
											className="text-slate-500 dark:text-gray-400"
										>
											{formatDateRange(
												event.start_date,
												event.end_date
											)}
										</time>
									</div>
									<div className="group relative">
										<h3 className="mt-3 text-lg font-semibold leading-6 text-slate-800 dark:text-white">
											{event.title}
										</h3>
									</div>
									<div className="mt-6 flex items-center gap-x-4">
										<button
											onClick={() =>
												handleEventClick(event.id)
											}
											className="group text-sm font-semibold leading-6 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-all duration-300 ease-in-out transform hover:translate-x-1 hover:scale-105"
										>
											View details{" "}
											<span
												aria-hidden="true"
												className="inline-block transition-all duration-300 ease-in-out group-hover:translate-x-2 group-hover:scale-110"
											>
												→
											</span>
										</button>
									</div>
								</article>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
