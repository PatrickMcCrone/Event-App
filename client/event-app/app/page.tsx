"use client";
import { useEffect, useState } from "react";
import Sidebar from "./sidebar";

// Define the type for a single event
interface Event {
	id: number;
	title: string;
	date: string;
}

export default function Home() {
	// Explicitly define the state type for events
	const [events, setEvents] = useState<Event[]>([]);

	useEffect(() => {
		const fetchEvents = async () => {
			const response = await fetch("http://localhost:3001/conferences");
			const data = await response.json();

			// Sort events by the date in descending order (latest first)
			const sortedEvents: Event[] = data.sort((a: Event, b: Event) => {
				const dateA: Date = new Date(a.date);
				const dateB: Date = new Date(b.date);
				return dateB.getTime() - dateA.getTime();
			});

			// Slice the sorted events to get only the 3 most recent
			setEvents(sortedEvents.slice(0, 3));
		};
		fetchEvents();
	}, []);

	return (
		<div className="flex">
			{/* Sidebar */}
			<Sidebar />

			{/* Main Content */}
			<div className="flex justify-center min-h-screen bg-gray-100 p-6">
				<div className="max-w-4xl mx-auto">
					{/* Welcome Banner */}
					<div className="bg-blue-600 text-white p-6 rounded-lg shadow-lg">
						<h1 className="flex text-3xl font-bold">
							Welcome to the Event App
						</h1>
						<p className="flex mt-2 text-lg">
							Manage and explore faculty events with ease.
						</p>
					</div>

					{/* Quick Actions */}
					<div className="mt-6 flex gap-4">
						<button className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-blue-700">
							+ Create Event
						</button>
						<button className="bg-gray-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-700">
							Browse Events
						</button>
					</div>

					{/* Upcoming Events Section */}
					<h2 className="mt-8 text-2xl font-semibold">
						Upcoming Events
					</h2>
					<div className="mt-4">
						{events.length === 0 ? (
							<p>No upcoming events.</p>
						) : (
							<ul className="bg-white p-4 rounded-lg shadow-md">
								{events.map((event) => (
									<li
										key={event.id}
										className="p-2 border-b last:border-none"
									>
										<span className="font-bold">
											{event.title}
										</span>{" "}
										-{" "}
										{new Date(
											event.date
										).toLocaleDateString()}
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
