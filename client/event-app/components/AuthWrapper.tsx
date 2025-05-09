"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AuthWrapper({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: session, status } = useSession();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (status === "unauthenticated" && pathname !== "/login") {
			router.push("/login");
		}
	}, [status, router, pathname]);

	if (status === "loading") {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
			</div>
		);
	}

	// Allow access to login page without session
	if (pathname === "/login") {
		return <>{children}</>;
	}

	// For all other pages, require authentication
	if (!session?.user) {
		return null;
	}

	return <>{children}</>;
}
