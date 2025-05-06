"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AuthWrapper from "@/components/AuthWrapper";

interface User {
	id: number;
	name: string;
	email: string;
	admin: boolean;
}

type AdminRole = "admin" | "chair" | "speaker" | "";
type ParticipantRole = "chair" | "presenter" | "speaker" | "attendee" | "";

interface FormData {
	title: string;
	description: string;
	start_date: string;
	end_date: string;
	start_time: string;
	end_time: string;
	location: string;
	type: string;
	timezone: string;
	selectedAdmins: { userId: number; role: AdminRole }[];
	selectedParticipants: { userId: number; role: ParticipantRole }[];
}

export default function EditEvent({ params }: { params: Promise<{ id: string }> }) {
	const resolvedParams = use(params);
	const router = useRouter();
	const { data: session } = useSession();
	const [users, setUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [formData, setFormData] = useState<FormData>({
		title: "",
		description: "",
		start_date: "",
		end_date: "",
		start_time: "",
		end_time: "",
		location: "",
		type: "conference",
		timezone: "America/New_York",
		selectedAdmins: [],
		selectedParticipants: [],
	});

	const adminRoles = ["Admin", "Chair", "Speaker"].sort();
	const participantRoles = ["Attendee", "Chair", "Presenter", "Speaker"].sort();

	useEffect(() => {
		fetchEventAndUsers();
	}, []);

	const fetchEventAndUsers = async () => {
		try {
			// Fetch event details
			const eventResponse = await fetch(`http://localhost:3001/events/${resolvedParams.id}`, {
				headers: {
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!eventResponse.ok) {
				throw new Error("Failed to fetch event");
			}

			const eventData = await eventResponse.json();

			// Fetch users
			const usersResponse = await fetch('http://localhost:3001/users', {
				headers: {
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!usersResponse.ok) {
				throw new Error("Failed to fetch users");
			}

			const usersData = await usersResponse.json();
			setUsers(usersData);

			// Fetch admins
			const adminsResponse = await fetch(`http://localhost:3001/events/${resolvedParams.id}/admins`, {
				headers: {
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!adminsResponse.ok) {
				throw new Error("Failed to fetch admins");
			}

			const adminsData = await adminsResponse.json();

			// Fetch subscribers
			const subscribersResponse = await fetch(`http://localhost:3001/events/${resolvedParams.id}/subscribers`, {
				headers: {
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!subscribersResponse.ok) {
				throw new Error("Failed to fetch subscribers");
			}

			const subscribersData = await subscribersResponse.json();

			// Set form data with event details
			setFormData({
				title: eventData.title,
				description: eventData.description,
				start_date: eventData.start_date,
				end_date: eventData.end_date,
				start_time: eventData.start_time.formatted || eventData.start_time,
				end_time: eventData.end_time.formatted || eventData.end_time,
				location: eventData.location,
				type: eventData.type,
				timezone: eventData.timezone || "America/New_York",
				selectedAdmins: adminsData
					.filter((admin: any) => admin.role !== 'creator')
					.map((admin: any) => ({
						userId: admin.user_id,
						role: admin.role.toLowerCase() as AdminRole,
					})),
				selectedParticipants: subscribersData
					.filter((sub: any) => !adminsData.some((admin: any) => admin.user_id === sub.user_id))
					.map((sub: any) => ({
						userId: sub.user_id,
						role: sub.role.toLowerCase() as ParticipantRole,
					})),
			});
		} catch (err) {
			setError("Failed to load event details");
			console.error(err);
		}
	};

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleAdminSelect = (userId: number, role: AdminRole) => {
		setFormData((prev) => {
			const existingAdmin = prev.selectedAdmins.find((a) => a.userId === userId);
			if (existingAdmin) {
				if (role === "") {
					return {
						...prev,
						selectedAdmins: prev.selectedAdmins.filter((a) => a.userId !== userId),
					};
				}
				return {
					...prev,
					selectedAdmins: prev.selectedAdmins.map((a) =>
						a.userId === userId ? { ...a, role } : a
					),
				};
			}
			return {
				...prev,
				selectedAdmins: [...prev.selectedAdmins, { userId, role }],
			};
		});
	};

	const handleParticipantSelect = (userId: number, role: ParticipantRole) => {
		setFormData((prev) => {
			const existingParticipant = prev.selectedParticipants.find((p) => p.userId === userId);
			if (existingParticipant) {
				if (role === "") {
					return {
						...prev,
						selectedParticipants: prev.selectedParticipants.filter((p) => p.userId !== userId),
					};
				}
				return {
					...prev,
					selectedParticipants: prev.selectedParticipants.map((p) =>
						p.userId === userId ? { ...p, role } : p
					),
				};
			}
			return {
				...prev,
				selectedParticipants: [...prev.selectedParticipants, { userId, role }],
			};
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			// Find the creator from the current event
			const creator = users.find(user => user.admin && user.id === Number(session?.user?.id));
			if (!creator) {
				throw new Error("No creator found for the event");
			}

			// 1. Create new event with edited data
			const createResponse = await fetch('http://localhost:3001/events', {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					...formData,
					creator_id: creator.id,
					selectedAdmins: formData.selectedAdmins.filter((a) => a.role !== ""),
					selectedParticipants: formData.selectedParticipants.filter((p) => p.role !== ""),
				}),
			});

			if (!createResponse.ok) {
				throw new Error("Failed to create new event");
			}

			const newEvent = await createResponse.json();

			// 2. Add creator as attendee
			await fetch(`http://localhost:3001/events/${newEvent.id}/subscribe`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
				body: JSON.stringify({
					user_id: creator.id,
					role: 'attendee'
				}),
			});

			// 3. Add all selected admins (except creator)
			const adminPromises = formData.selectedAdmins
				.filter(admin => admin.role !== "")
				.map(admin => 
					fetch(`http://localhost:3001/events/${newEvent.id}/admins`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${session?.user?.accessToken}`,
						},
						body: JSON.stringify({
							user_id: admin.userId,
							role: admin.role
						}),
					}).then(() => 
						// Also add admin as attendee
						fetch(`http://localhost:3001/events/${newEvent.id}/subscribe`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								Authorization: `Bearer ${session?.user?.accessToken}`,
							},
							body: JSON.stringify({
								user_id: admin.userId,
								role: admin.role
							}),
						})
					)
				);

			// 4. Add all selected users as attendees
			const attendeePromises = formData.selectedParticipants
				.filter(participant => participant.role !== "")
				.map(participant => 
					fetch(`http://localhost:3001/events/${newEvent.id}/subscribe`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${session?.user?.accessToken}`,
						},
						body: JSON.stringify({
							user_id: participant.userId,
							role: participant.role
						}),
					})
				);

			// Wait for all admin and attendee additions to complete
			await Promise.all([...adminPromises, ...attendeePromises]);

			// 5. Delete original event
			const deleteResponse = await fetch(`http://localhost:3001/events/${resolvedParams.id}`, {
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${session?.user?.accessToken}`,
				},
			});

			if (!deleteResponse.ok) {
				throw new Error("Failed to delete original event");
			}

			router.push(`/events/${newEvent.id}`);
		} catch (err) {
			setError("Failed to update event");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthWrapper>
			<div className="min-h-screen bg-slate-50 dark:bg-gray-800 p-6">
				<div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg border border-slate-100 dark:border-gray-700">
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-slate-800 dark:text-white">
							Edit Event
						</h1>
						<p className="mt-2 text-slate-600 dark:text-gray-400">
							Update the details below to modify your event
						</p>
					</div>

					{/* Error or Success Message */}
					{error && (
						<div className="mb-6 p-4 bg-rose-50 dark:bg-red-900 text-rose-700 dark:text-red-100 rounded-lg border border-rose-100 dark:border-red-800">
							{error}
						</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
									Event Type <span className="text-rose-500">*</span>
								</label>
								<select
									name="type"
									value={formData.type}
									onChange={handleInputChange}
									required
									className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-slate-50 text-slate-900 shadow-sm"
								>
									<option value="">Select event type</option>
									<option value="conference">Conference</option>
									<option value="meeting">Meeting</option>
									<option value="talk">Talk</option>
									<option value="workshop">Workshop</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
									Event Title <span className="text-rose-500">*</span>
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
									Start Date <span className="text-rose-500">*</span>
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
									End Date <span className="text-rose-500">*</span>
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
									Start Time <span className="text-rose-500">*</span>
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
									End Time <span className="text-rose-500">*</span>
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
								Event Location <span className="text-rose-500">*</span>
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

						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
								Timezone
							</label>
							<select
								name="timezone"
								value={formData.timezone}
								onChange={handleInputChange}
								className="mt-1 block w-full pl-3 pr-10 py-2.5 text-base border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg bg-slate-50 text-slate-900 shadow-sm"
							>
								<option value="America/New_York">Eastern Time (ET)</option>
								<option value="America/Chicago">Central Time (CT)</option>
								<option value="America/Denver">Mountain Time (MT)</option>
								<option value="America/Los_Angeles">Pacific Time (PT)</option>
							</select>
						</div>

						{/* Admin Selection */}
						<div>
							<h2 className="text-xl font-bold mb-4">Select Admins</h2>
							<div className="max-h-64 overflow-y-auto space-y-2">
								{users
									.filter((user) => user.admin && user.id !== Number(session?.user?.id))
									.sort((a, b) => a.name.localeCompare(b.name))
									.map((user) => (
										<div
											key={user.id}
											className="flex items-center justify-between p-2 border rounded text-sm"
										>
											<div>
												<h3 className="font-semibold">{user.name}</h3>
												<p className="text-gray-600">{user.email}</p>
											</div>
											<select
												className="border rounded px-2 py-1 bg-slate-50 text-slate-900 dark:bg-gray-700 dark:text-white"
												value={formData.selectedAdmins.find((a) => a.userId === user.id)?.role || ""}
												onChange={(e) => handleAdminSelect(user.id, e.target.value as AdminRole)}
											>
												<option value="">No role</option>
												{adminRoles.map((role) => (
													<option key={role} value={role.toLowerCase()}>
														{role}
													</option>
												))}
											</select>
										</div>
									))}
							</div>
						</div>

						{/* Participant Selection */}
						<div>
							<h2 className="text-xl font-bold mb-4">Select Participants</h2>
							<div className="max-h-64 overflow-y-auto space-y-2">
								{users
									.filter((user) => !user.admin)
									.sort((a, b) => a.name.localeCompare(b.name))
									.map((user) => (
										<div
											key={user.id}
											className="flex items-center justify-between p-2 border rounded text-sm"
										>
											<div>
												<h3 className="font-semibold">{user.name}</h3>
												<p className="text-gray-600">{user.email}</p>
											</div>
											<select
												className="border rounded px-2 py-1 bg-slate-50 text-slate-900 dark:bg-gray-700 dark:text-white"
												value={formData.selectedParticipants.find((p) => p.userId === user.id)?.role || ""}
												onChange={(e) => handleParticipantSelect(user.id, e.target.value as ParticipantRole)}
											>
												<option value="">No role</option>
												{participantRoles.map((role) => (
													<option key={role} value={role.toLowerCase()}>
														{role}
													</option>
												))}
											</select>
										</div>
									))}
							</div>
						</div>

						<div className="flex justify-end space-x-4 pt-4">
							<button
								type="button"
								onClick={() => router.push(`/events/${resolvedParams.id}`)}
								className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium transition-colors duration-200 hover:bg-gray-600"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={loading}
								className={`px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium transition-colors duration-200 ${
									loading ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-700"
								}`}
							>
								{loading ? (
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
										Saving...
									</div>
								) : (
									"Submit Changes"
								)}
							</button>
						</div>
					</form>
				</div>
			</div>
		</AuthWrapper>
	);
}
