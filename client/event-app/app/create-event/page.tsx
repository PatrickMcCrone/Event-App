"use client";
import { useState } from "react";

export default function CreateEvent() {
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		date: "",
		time: "",
		location: "",
		eventType: "",
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	// Handle form field change
	const handleInputChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => {
		const { name, value } = e.target;
		setFormData({
			...formData,
			[name]: value,
		});
	};

	// Handle form submission
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setErrorMessage("");
		setSuccessMessage("");

		// Combine date and time fields into a single ISO string
		const formattedDateTime = `${formData.date}T${formData.time}`;

		const eventTypeLowerCase = formData.eventType.toLowerCase();

		const updatedFormData = {
			...formData,
			eventType: eventTypeLowerCase,
			date: formattedDateTime, // Combine date and time here
		};

		// Simple form validation
		if (
			!formData.title ||
			!formData.date ||
			!formData.location ||
			!formData.eventType ||
			!formData.time
		) {
			setErrorMessage("Please fill in all required fields.");
			setIsSubmitting(false);
			return;
		}

		console.log("Form Data being sent:", updatedFormData);

		try {
			// Conditionally set the endpoint based on event type
			let url = "http://localhost:3001/conferences"; // Default to conferences
			if (updatedFormData.eventType === "workshop") {
				url = "http://localhost:3001/workshops"; // Example URL for workshops
			} else if (updatedFormData.eventType === "seminar") {
				url = "http://localhost:3001/seminars"; // Example URL for seminars
			} else if (updatedFormData.eventType === "talk") {
				url = "http://localhost:3001/talks"; // Example URL for talks
			}

			// Send data to the correct endpoint
			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updatedFormData),
			});

			if (!response.ok) {
				throw new Error("Failed to create event");
			}

			setSuccessMessage("Event created successfully!");
			setFormData({
				title: "",
				description: "",
				date: "",
				time: "",
				location: "",
				eventType: "",
			});
		} catch (error: unknown) {
			if (error instanceof Error) {
				setErrorMessage(error.message);
			} else {
				setErrorMessage("An unexpected error occurred.");
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-100 p-6">
			<div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg">
				<h1 className="text-3xl font-bold">Create New Event</h1>

				{/* Error or Success Message */}
				{errorMessage && (
					<div className="text-red-600 mt-4">{errorMessage}</div>
				)}
				{successMessage && (
					<div className="text-green-600 mt-4">{successMessage}</div>
				)}

				<form onSubmit={handleSubmit} className="mt-6 space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700">
							Event Type *
						</label>
						<select
							name="eventType"
							value={formData.eventType}
							onChange={handleInputChange}
							required
							className="mt-2 p-3 border border-gray-300 rounded-lg w-full"
						>
							<option value="">Select event type</option>
							<option value="conference">Conference</option>
							<option value="seminar">Seminar</option>
							<option value="talk">Talk</option>
							<option value="workshop">Workshop</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							Event Title *
						</label>
						<input
							type="text"
							name="title"
							value={formData.title}
							onChange={handleInputChange}
							required
							className="mt-2 p-3 border border-gray-300 rounded-lg w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							Event Description
						</label>
						<textarea
							name="description"
							value={formData.description}
							onChange={handleInputChange}
							className="mt-2 p-3 border border-gray-300 rounded-lg w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							Event Date *
						</label>
						<input
							type="date"
							name="date"
							value={formData.date}
							onChange={handleInputChange}
							required
							className="mt-2 p-3 border border-gray-300 rounded-lg w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							Event Time *
						</label>
						<input
							type="time"
							name="time"
							value={formData.time}
							onChange={handleInputChange}
							required
							className="mt-2 p-3 border border-gray-300 rounded-lg w-full"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700">
							Event Location *
						</label>
						<input
							type="text"
							name="location"
							value={formData.location}
							onChange={handleInputChange}
							required
							className="mt-2 p-3 border border-gray-300 rounded-lg w-full"
						/>
					</div>

					<div className="mt-4">
						<button
							type="submit"
							disabled={isSubmitting}
							className={`w-full py-3 bg-blue-600 text-white rounded-lg ${
								isSubmitting
									? "opacity-50"
									: "hover:bg-blue-700"
							}`}
						>
							{isSubmitting ? "Submitting..." : "Create Event"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
