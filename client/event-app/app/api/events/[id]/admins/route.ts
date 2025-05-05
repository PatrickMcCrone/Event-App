import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(
	request: Request,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			console.log("No session found in admins API route");
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		console.log(
			"Session found, making request to:",
			`${process.env.NEXT_PUBLIC_API_URL}/events/${params.id}/admins`
		);
		console.log(
			"Using access token:",
			session.user.accessToken ? "Token present" : "No token"
		);

		const response = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL}/events/${params.id}/admins`,
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
			}
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				"Failed to fetch admins. Status:",
				response.status,
				"Response:",
				errorText
			);
			throw new Error(
				`Failed to fetch admins: ${response.status} ${errorText}`
			);
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error in admins API route:", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to fetch admins",
			},
			{ status: 500 }
		);
	}
}

export async function POST(
	request: Request,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const body = await request.json();
		const response = await fetch(
			`${process.env.NEXT_PUBLIC_API_URL}/events/${params.id}/admins`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${session.user.accessToken}`,
				},
				body: JSON.stringify(body),
			}
		);

		if (!response.ok) {
			throw new Error("Failed to add admin");
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error adding admin:", error);
		return NextResponse.json(
			{ error: "Failed to add admin" },
			{ status: 500 }
		);
	}
}
