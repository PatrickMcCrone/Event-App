"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function UserProfile() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const isLoading = status === "loading";
	const isAuthenticated = status === "authenticated";

	const handleSignIn = async () => {
		try {
			const result = await signIn("google", {
				callbackUrl: "/",
				redirect: true,
				prompt: "select_account",
				access_type: "offline",
				response_type: "code",
			});

			// If sign in was successful, force a reload of the page
			if (result?.ok) {
				window.location.href = "/";
			}
		} catch (error) {
			console.error("Sign in error:", error);
		}
	};

	return (
		<div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-200 dark:border-gray-700">
			{isLoading ? (
				<div className="flex items-center justify-center">
					<div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
				</div>
			) : isAuthenticated && session?.user ? (
				<div className="flex items-center space-x-3">
					<div className="relative w-10 h-10 rounded-full overflow-hidden">
						{session.user.image ? (
							<Image
								src={session.user.image}
								alt={session.user.name || "User"}
								fill
								className="object-cover"
							/>
						) : (
							<div className="w-full h-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
								<span className="text-gray-600 dark:text-gray-300 text-lg font-medium">
									{session.user.name?.charAt(0) || "U"}
								</span>
							</div>
						)}
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium text-gray-900 dark:text-white truncate">
							{session.user.name || "User"}
						</p>
						<p className="text-xs text-gray-500 dark:text-gray-400 truncate">
							{session.user.email || ""}
						</p>
					</div>
					<button
						onClick={() => signOut()}
						className="group text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-300 ease-in-out"
						title="Sign out"
					>
						<svg
							className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:translate-x-1 group-hover:scale-110"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
							/>
						</svg>
					</button>
				</div>
			) : (
				<button
					onClick={handleSignIn}
					className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
				>
					<svg
						className="w-5 h-5 mr-2"
						viewBox="0 0 24 24"
						fill="currentColor"
					>
						<path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
					</svg>
					Sign in with Google
				</button>
			)}
		</div>
	);
}
