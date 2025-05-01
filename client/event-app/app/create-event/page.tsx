"use client";
import { useState, useEffect } from "react";
import AuthWrapper from "../../components/AuthWrapper";
import { useSession } from "next-auth/react";

export default function CreateEvent() {
	const { data: session } = useSession();
	const [formData, setFormData] = useState({
		title: "",
		description: "",
		start_date: "",
		end_date: "",
		start_time: "",
		end_time: "",
		location: "",
		eventType: "",
		timezone: "America/New_York", // Default timezone
	});

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");

	// Valid event types
	const validEventTypes = ["conference", "seminar", "talk", "workshop"];

	// Fetch user settings to get timezone
	useEffect(() => {
		const fetchSettings = async () => {
			if (session?.user?.id) {
				try {
					const response = await fetch(
						`http://localhost:3001/settings/reminders/${session.user.id}`
					);
					if (response.ok) {
						const data = await response.json();
						setFormData((prev) => ({
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

		console.log("Session:", session);
		console.log("Access Token:", session?.user?.accessToken);

		if (!session?.user?.accessToken) {
			setErrorMessage("You must be logged in to create an event");
			setIsSubmitting(false);
			return;
		}

		// Validate event type
		if (!validEventTypes.includes(formData.eventType.toLowerCase())) {
			setErrorMessage("Please select a valid event type.");
			setIsSubmitting(false);
			return;
		}

		// Validate dates and times
		if (formData.end_date < formData.start_date) {
			setErrorMessage("End date cannot be before start date.");
			setIsSubmitting(false);
			return;
		}

		if (
			formData.end_date === formData.start_date &&
			formData.end_time <= formData.start_time
		) {
			setErrorMessage(
				"End time must be after start time for same-day events."
			);
			setIsSubmitting(false);
			return;
		}

		const updatedFormData = {
			title: formData.title,
			description: formData.description,
			start_date: formData.start_date,
			end_date: formData.end_date,
			start_time: formData.start_time,
			end_time: formData.end_time,
			location: formData.location,
			type: formData.eventType.toLowerCase(),
			timezone: formData.timezone,
		};

		// Simple form validation
		if (
			!formData.title ||
			!formData.start_date ||
			!formData.end_date ||
			!formData.start_time ||
			!formData.end_time ||
			!formData.location ||
			!formData.eventType
		) {
			setErrorMessage("Please fill in all required fields.");
			setIsSubmitting(false);
			return;
		}

		console.log("Form Data being sent:", updatedFormData);

		try {
			const response = await fetch("http://localhost:3001/events", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
				body: JSON.stringify(updatedFormData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to create event");
			}

			setSuccessMessage("Event created successfully!");
			setFormData({
				title: "",
				description: "",
				start_date: "",
				end_date: "",
				start_time: "",
				end_time: "",
				location: "",
				eventType: "",
				timezone: "America/New_York", // Default timezone
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
		<AuthWrapper>
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
									<option value="conference">
										Conference
									</option>
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
									Start Date{" "}
									<span className="text-rose-500">*</span>
								</label>
								<input
									type="date"
									name="start_date"
									value={formData.start_date}
									onChange={handleInputChange}
									required
									className="mt-1 block w-full px-3 py-2.5 text-base border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-slate-50 text-slate-900 shadow-sm"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
									End Date{" "}
									<span className="text-rose-500">*</span>
								</label>
								<input
									type="date"
									name="end_date"
									value={formData.end_date}
									onChange={handleInputChange}
									required
									min={formData.start_date}
									className="mt-1 block w-full px-3 py-2.5 text-base border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-slate-50 text-slate-900 shadow-sm"
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
									Start Time{" "}
									<span className="text-rose-500">*</span>
								</label>
								<input
									type="time"
									name="start_time"
									value={formData.start_time}
									onChange={handleInputChange}
									required
									className="mt-1 block w-full px-3 py-2.5 text-base border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-slate-50 text-slate-900 shadow-sm"
								/>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
									End Time{" "}
									<span className="text-rose-500">*</span>
								</label>
								<input
									type="time"
									name="end_time"
									value={formData.end_time}
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
		</AuthWrapper>
	);
}
