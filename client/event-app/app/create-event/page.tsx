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
		<div className="min-h-screen bg-slate-50 dark:bg-gray-800 p-6">
			<div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-slate-100 dark:border-gray-700">
				<div className="mb-8">
					<h1 className="text-3xl font-bold text-slate-800 dark:text-white">
						Create New Event
					</h1>
					<p className="mt-2 text-slate-600 dark:text-gray-400">
						Fill in the details below to create your event
					</p>
				</div>

				{/* Error or Success Message */}
				{errorMessage && (
					<div className="mb-6 p-4 bg-rose-50 dark:bg-red-900 text-rose-700 dark:text-red-100 rounded-lg border border-rose-100 dark:border-red-800">
						{errorMessage}
					</div>
				)}
				{successMessage && (
					<div className="mb-6 p-4 bg-emerald-50 dark:bg-green-900 text-emerald-700 dark:text-green-100 rounded-lg border border-emerald-100 dark:border-green-800">
						{successMessage}
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
								Event Type{" "}
								<span className="text-rose-500">*</span>
							</label>
							<select
								name="eventType"
								value={formData.eventType}
								onChange={handleInputChange}
								required
								className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-slate-50 text-slate-900 shadow-sm"
							>
								<option value="">Select event type</option>
								<option value="conference">Conference</option>
								<option value="seminar">Seminar</option>
								<option value="talk">Talk</option>
								<option value="workshop">Workshop</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
								Event Title{" "}
								<span className="text-rose-500">*</span>
							</label>
							<input
								type="text"
								name="title"
								value={formData.title}
								onChange={handleInputChange}
								required
								placeholder="Enter event title"
								className="mt-1 block w-full px-3 py-2.5 text-base border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-slate-50 text-slate-900 shadow-sm placeholder-slate-400"
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
							Event Description
						</label>
						<textarea
							name="description"
							value={formData.description}
							onChange={handleInputChange}
							placeholder="Enter event description"
							rows={4}
							className="mt-1 block w-full px-3 py-2.5 text-base border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-slate-50 text-slate-900 shadow-sm placeholder-slate-400"
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
								Event Date{" "}
								<span className="text-rose-500">*</span>
							</label>
							<input
								type="date"
								name="date"
								value={formData.date}
								onChange={handleInputChange}
								required
								className="mt-1 block w-full px-3 py-2.5 text-base border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-slate-50 text-slate-900 shadow-sm"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
								Event Time{" "}
								<span className="text-rose-500">*</span>
							</label>
							<input
								type="time"
								name="time"
								value={formData.time}
								onChange={handleInputChange}
								required
								className="mt-1 block w-full px-3 py-2.5 text-base border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-slate-50 text-slate-900 shadow-sm"
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
							Event Location{" "}
							<span className="text-rose-500">*</span>
						</label>
						<input
							type="text"
							name="location"
							value={formData.location}
							onChange={handleInputChange}
							required
							placeholder="Enter event location"
							className="mt-1 block w-full px-3 py-2.5 text-base border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-slate-50 text-slate-900 shadow-sm placeholder-slate-400"
						/>
					</div>

					<div className="flex justify-end pt-4">
						<button
							type="submit"
							disabled={isSubmitting}
							className={`px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium transition-colors duration-200 ${
								isSubmitting
									? "opacity-50 cursor-not-allowed"
									: "hover:bg-indigo-700"
							}`}
						>
							{isSubmitting ? (
								<div className="flex items-center">
									<svg
										className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Creating Event...
								</div>
							) : (
								"Create Event"
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
