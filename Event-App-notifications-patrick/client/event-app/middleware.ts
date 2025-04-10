import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
	function middleware(req) {
		// If the user is not authenticated and trying to access a protected route,
		// they will be automatically redirected to the login page
		return NextResponse.next();
	},
	{
		callbacks: {
			authorized: ({ token }) => !!token,
		},
		pages: {
			signIn: "/login",
		},
	}
);

// Specify which routes should be protected
export const config = {
	matcher: ["/events/:path*", "/profile/:path*", "/conferences/:path*", "/"],
};
