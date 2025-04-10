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

	// Only redirect to login if the user is trying to access protected routes
	useEffect(() => {
		const protectedRoutes = ["/create-event", "/settings"];
		const isProtectedRoute = protectedRoutes.some((route) =>
			pathname.startsWith(route)
		);

		if (status === "unauthenticated" && isProtectedRoute) {
			router.push("/login");
		}
	}, [status, router, pathname]);

	if (status === "loading") {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
			</div>
		);
	}

	return <>{children}</>;
}
