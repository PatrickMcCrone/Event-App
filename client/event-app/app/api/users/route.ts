import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			console.log("No session found in users API route");
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, ""); // Remove trailing slash if present
		const requestUrl = `${apiUrl}/users`;

		console.log("Session found, making request to:", requestUrl);
		console.log(
			"Using access token:",
			session.user.accessToken ? "Token present" : "No token"
		);

		const response = await fetch(requestUrl, {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${session.user.accessToken}`,
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				"Failed to fetch users. Status:",
				response.status,
				"Response:",
				errorText
			);
			throw new Error(
				`Failed to fetch users: ${response.status} ${errorText}`
			);
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error in users API route:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch users",
			},
			{ status: 500 }
		);
	}
}
