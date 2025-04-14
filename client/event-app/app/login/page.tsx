"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
	const [isLoading, setIsLoading] = useState(false);
	const searchParams = useSearchParams();
	const error = searchParams.get("error");

	const handleGoogleSignIn = async () => {
		try {
			setIsLoading(true);
			const result = await signIn("google", {
				callbackUrl: "/",
				redirect: true,
				prompt: "select_account",
				access_type: "offline",
				response_type: "code",
			});
		} catch (error) {
			console.error("Sign in error:", error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
						Sign in to your account
					</h2>
					<p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
						Please sign in to access your events and settings
					</p>
				</div>

				{error && (
					<div
						className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-100 px-4 py-3 rounded relative"
						role="alert"
					>
						<strong className="font-bold">Error: </strong>
						<span className="block sm:inline">
							{error === "AccessDenied"
								? "Access denied. Please try again."
								: error === "Configuration"
								? "There is a problem with the server configuration."
								: error === "Verification"
								? "The verification token has expired or has already been used."
								: "An error occurred during sign in. Please try again."}
						</span>
					</div>
				)}

				<div className="mt-8 space-y-6">
					<button
						onClick={handleGoogleSignIn}
						disabled={isLoading}
						className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? (
							<span className="flex items-center">
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
								Signing in...
							</span>
						) : (
							<span className="flex items-center">
								<svg
									className="w-5 h-5 mr-2"
									viewBox="0 0 24 24"
								>
									<path
										fill="currentColor"
										d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
									/>
								</svg>
								Sign in with Google
							</span>
						)}
					</button>
				</div>

				<div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
					<p>If you're having trouble signing in, try:</p>
					<ul className="mt-2 list-disc list-inside">
						<li>Using a different browser</li>
						<li>Disabling any ad blockers or privacy extensions</li>
						<li>Clearing your browser cache and cookies</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
