"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../context/ThemeContext";
import { useSession } from "next-auth/react";

export default function CreateEvent() {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [date, setDate] = useState("");
	const [location, setLocation] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");
	const router = useRouter();
	const { theme } = useTheme();
	const { data: session, status } = useSession();
	const isLoading = status === "loading";
	const isAuthenticated = status === "authenticated";
	const isAdmin = session?.user?.admin === true;

	useEffect(() => {
		if (!isLoading && (!isAuthenticated || !isAdmin)) {
			router.push("/events");
		}
	}, [isLoading, isAuthenticated, isAdmin, router]);

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	if (!isAuthenticated || !isAdmin) {
		return null;
	}

	// ... rest of the component code ...
}
