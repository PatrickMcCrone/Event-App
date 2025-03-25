"use client";
import { useState } from "react";
import { useTheme } from "../context/ThemeContext";

interface Settings {
	emailNotifications: boolean;
	eventReminders: boolean;
	timezone: string;
}

export default function Settings() {
	const { theme, toggleTheme } = useTheme();
	const [settings, setSettings] = useState<Settings>({
		emailNotifications: true,
		eventReminders: true,
		timezone: "UTC",
	});

	const [isSaving, setIsSaving] = useState(false);
	const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(
		null
	);

	const handleToggle = (setting: keyof Settings) => {
		setSettings((prev) => ({
			...prev,
			[setting]: !prev[setting],
		}));
	};

	const handleSelectChange = (setting: keyof Settings, value: string) => {
		setSettings((prev) => ({
			...prev,
			[setting]: value,
		}));
	};

	const handleSave = async () => {
		setIsSaving(true);
		setSaveStatus(null);

		try {
			// Save reminder preferences
			const response = await fetch(
				"http://localhost:3001/settings/reminders",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						userId: 1, // In a real app, this would come from authentication
						eventReminders: settings.eventReminders,
						emailNotifications: settings.emailNotifications,
					}),
				}
			);

			if (!response.ok) {
				throw new Error("Failed to save settings");
			}

			setSaveStatus("success");
		} catch (error) {
			console.error("Error saving settings:", error);
			setSaveStatus("error");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-gray-800 p-6">
			<div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-slate-100 dark:border-gray-700">
				<h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-white">
					Settings
				</h1>

				{/* Notification Settings */}
				<section className="mb-8">
					<h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">
						Notification Settings
					</h2>
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<label className="text-sm font-medium text-slate-700 dark:text-gray-300">
									Email Notifications
								</label>
								<p className="text-sm text-slate-600 dark:text-gray-400">
									Receive email notifications about your
									events
								</p>
							</div>
							<button
								onClick={() =>
									handleToggle("emailNotifications")
								}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ease-in-out ${
									settings.emailNotifications
										? "bg-indigo-600"
										: "bg-slate-200 dark:bg-gray-700"
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${
										settings.emailNotifications
											? "translate-x-6"
											: "translate-x-1"
									}`}
								/>
							</button>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<label className="text-sm font-medium text-slate-700 dark:text-gray-300">
									Event Reminders
								</label>
								<p className="text-sm text-slate-600 dark:text-gray-400">
									Get reminders before your events
								</p>
							</div>
							<button
								onClick={() => handleToggle("eventReminders")}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ease-in-out ${
									settings.eventReminders
										? "bg-indigo-600"
										: "bg-slate-200 dark:bg-gray-700"
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${
										settings.eventReminders
											? "translate-x-6"
											: "translate-x-1"
									}`}
								/>
							</button>
						</div>
					</div>
				</section>

				{/* Display Settings */}
				<section className="mb-8">
					<h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">
						Display Settings
					</h2>
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<label className="text-sm font-medium text-slate-700 dark:text-gray-300">
									Dark Mode
								</label>
								<p className="text-sm text-slate-600 dark:text-gray-400">
									Switch between light and dark theme
								</p>
							</div>
							<button
								onClick={toggleTheme}
								className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ease-in-out ${
									theme === "dark"
										? "bg-indigo-600"
										: "bg-slate-200 dark:bg-gray-700"
								}`}
							>
								<span
									className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${
										theme === "dark"
											? "translate-x-6"
											: "translate-x-1"
									}`}
								/>
							</button>
						</div>
					</div>
				</section>

				{/* Time Settings */}
				<section className="mb-8">
					<h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-white">
						Time Settings
					</h2>
					<div className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
								Timezone
							</label>
							<select
								value={settings.timezone}
								onChange={(e) =>
									handleSelectChange(
										"timezone",
										e.target.value
									)
								}
								className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-slate-50 text-slate-900 shadow-sm"
							>
								<option value="UTC">UTC</option>
								<option value="EST">Eastern Time</option>
								<option value="CST">Central Time</option>
								<option value="MST">Mountain Time</option>
								<option value="PST">Pacific Time</option>
							</select>
						</div>
					</div>
				</section>

				{/* Save Button */}
				<div className="flex justify-end">
					<button
						onClick={handleSave}
						disabled={isSaving}
						className={`px-4 py-2 bg-indigo-600 text-white rounded-lg transition-colors duration-200 ${
							isSaving
								? "opacity-50 cursor-not-allowed"
								: "hover:bg-indigo-700"
						}`}
					>
						{isSaving ? "Saving..." : "Save Changes"}
					</button>
				</div>

				{/* Status Messages */}
				{saveStatus === "success" && (
					<div className="mt-4 p-4 bg-emerald-50 dark:bg-green-900 text-emerald-700 dark:text-green-100 rounded-lg border border-emerald-100 dark:border-green-800">
						Settings saved successfully!
					</div>
				)}
				{saveStatus === "error" && (
					<div className="mt-4 p-4 bg-rose-50 dark:bg-red-900 text-rose-700 dark:text-red-100 rounded-lg border border-rose-100 dark:border-red-800">
						Failed to save settings. Please try again.
					</div>
				)}
			</div>
		</div>
	);
}
