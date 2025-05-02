"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AuthWrapper from "../../components/AuthWrapper";
import { Button } from "@/components/ui/button";
import { useTheme } from "../context/ThemeContext";

export default function AdminApplication() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [reason, setReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const router = useRouter();
	const { theme } = useTheme();
	const { data: session } = useSession();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch("/api/admin-application", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name,
					email,
					reason,
					userId: session?.user?.id,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to submit application");
			}

			setSuccess(true);
			// Clear form
			setName("");
			setEmail("");
			setReason("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 dark:bg-gray-900">
			<div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
				<div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
					<h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
						Apply for Admin Status
					</h1>

					{success ? (
						<div className="bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100 p-4 rounded-md mb-6">
							<p>
								Your application has been submitted
								successfully! We'll review it and get back to
								you soon.
							</p>
						</div>
					) : (
						<form onSubmit={handleSubmit} className="space-y-6">
							<div>
								<label
									htmlFor="name"
									className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1"
								>
									Name
								</label>
								<input
									id="name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required
									className="w-full rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
									placeholder="Your name"
								/>
							</div>

							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1"
								>
									Email
								</label>
								<input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									className="w-full rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
									placeholder="Your email"
								/>
							</div>

							<div>
								<label
									htmlFor="reason"
									className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1"
								>
									Reason for admin status
								</label>
								<textarea
									id="reason"
									value={reason}
									onChange={(e) => setReason(e.target.value)}
									required
									className="w-full min-h-[150px] rounded-md border border-slate-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-900 text-slate-800 dark:text-white"
									placeholder="Please type your reason here"
								/>
							</div>

							{error && (
								<div className="bg-red-50 dark:bg-red-900 text-red-800 dark:text-red-100 p-4 rounded-md">
									{error}
								</div>
							)}

							<div className="flex justify-end">
								<Button
									type="submit"
									disabled={isSubmitting}
									className="group bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-3 transition-all duration-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-95 flex items-center justify-center"
								>
									{isSubmitting ? (
										"Submitting..."
									) : (
										<>
											Submit Application
											<svg
												className="ml-2 w-5 h-5 transition-all duration-300 ease-in-out group-hover:translate-x-2 group-hover:-translate-y-1 group-hover:opacity-60"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												viewBox="0 0 24 24"
											>
												<line
													x1="22"
													y1="2"
													x2="11"
													y2="13"
												/>
												<polygon points="22 2 15 22 11 13 2 9 22 2" />
											</svg>
										</>
									)}
								</Button>
							</div>
						</form>
					)}
				</div>
			</div>
		</div>
	);
}
