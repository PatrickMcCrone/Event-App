"use client";
import React, { useState, useEffect } from "react";

// Define the Event type
type Event = {
	id: number;
	title: string;
	description: string;
	date: string;
	time: string;
	location: string;
};

const Events = () => {
	const [events, setEvents] = useState<Event[]>([]); // Explicit type declaration
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		// Fetch events data
		const fetchEvents = async () => {
			const response = await fetch("http://localhost:3001/conferences"); // Replace with your actual endpoint
			const data = await response.json();
			setEvents(data);
			setLoading(false);
		};

		fetchEvents();
	}, []);

	// Function to combine the date and time into a Date object for sorting
	const sortEventsByDate = (events: Event[]) => {
		return events.sort((a, b) => {
			// Combine the date and time and create Date objects
			const dateA = new Date(`${a.date}T${a.time}`);
			const dateB = new Date(`${b.date}T${b.time}`);

			console.log("Date A:", dateA, "Date B:", dateB); // Debugging the Date objects

			// Sort in descending order (most recent first)
			return dateB.getTime() - dateA.getTime();
		});
	};

	// Sorted events
	const sortedEvents = sortEventsByDate(events);

	// Function to format date and time
	const formatDateTime = (date: string, time: string) => {
		if (!date || !time) return "Invalid event date or time";

		// Remove the extra time part from the date and append the time
		const dateWithoutTime = date.split("T")[0]; // Extract only the date part
		const combinedDateTime = new Date(`${dateWithoutTime}T${time}`); // Combine properly without extra T

		// Check if the date is invalid and return a fallback message
		if (isNaN(combinedDateTime.getTime())) {
			return "Invalid event date or time";
		}

		// Return formatted date and time without seconds
		return combinedDateTime.toLocaleString("en-US", {
			weekday: "long", // Day of the week
			year: "numeric", // Full year
			month: "long", // Full month name
			day: "numeric", // Day of the month
			hour: "numeric", // Hour in 12-hour format
			minute: "numeric", // Minute
			hour12: true, // 12-hour format (AM/PM)
		});
	};

	return (
		<div className="min-h-screen bg-gray-100 p-6">
			<div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg">
				<h1 className="text-3xl font-bold mb-6">Event List</h1>

				{/* Display loading state */}
				{loading ? (
					<div>Loading...</div>
				) : (
					<div
						className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto" // Adjust max height and enable scrolling
					>
						{sortedEvents.length === 0 ? (
							<p>No events available.</p>
						) : (
							sortedEvents.map((event) => (
								<div
									key={event.id}
									className="p-4 border border-gray-300 rounded-lg"
								>
									<h2 className="text-xl font-semibold">
										{event.title}
									</h2>
									<p>{event.description}</p>
									<p className="text-sm text-gray-500">
										{formatDateTime(event.date, event.time)}
									</p>
									<p className="text-sm text-gray-500">
										{event.location}
									</p>
								</div>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default Events;
