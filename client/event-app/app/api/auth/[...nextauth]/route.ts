import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Define the session type to include the user ID and Google ID
declare module "next-auth" {
	interface Session {
		user: {
			id?: string;
			name?: string | null;
			email?: string | null;
			image?: string | null;
			googleId?: string;
		};
	}
}

const handler = NextAuth({
	providers: [
		GoogleProvider({
			clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
			clientSecret: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || "",
			authorization: {
				params: {
					prompt: "consent",
					access_type: "offline",
					response_type: "code",
				},
			},
		}),
	],
	callbacks: {
		async signIn({ user, account, profile }) {
			if (account?.provider === "google") {
				try {
					console.log("Google sign in attempt:", {
						name: user.name,
						email: user.email,
						picture: user.image,
						googleId: profile?.sub,
					});

					// Check if user exists in your database
					const response = await fetch(
						"http://localhost:3001/auth/google",
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Accept: "application/json",
							},
							body: JSON.stringify({
								name: user.name,
								email: user.email,
								picture: user.image,
								googleId: profile?.sub,
							}),
						}
					);

					if (!response.ok) {
						const errorData = await response.json().catch(() => ({
							error: "Failed to parse error response",
						}));
						console.error(
							"Failed to authenticate with server:",
							errorData
						);
						throw new Error(
							errorData.error ||
								"Failed to authenticate with server"
						);
					}

					const userData = await response.json().catch(() => null);
					if (!userData) {
						throw new Error(
							"Failed to parse user data from server"
						);
					}

					// Store both the database ID and Google ID
					user.id = userData.id;
					user.googleId = profile?.sub;
					return true;
				} catch (error) {
					console.error("Error during Google sign in:", error);
					return false;
				}
			}
			return true;
		},
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				token.googleId = user.googleId;
			}
			return token;
		},
		async session({ session, token }) {
			if (token && session.user) {
				session.user.id = token.id as string;
				session.user.googleId = token.googleId as string;
			}
			return session;
		},
	},
	pages: {
		signIn: "/login",
		error: "/login", // Redirect to login page on error
	},
	debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };
