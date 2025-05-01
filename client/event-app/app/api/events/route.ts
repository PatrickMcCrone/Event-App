import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/events
export async function GET() {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Fetch events from your database
		const events = await prisma.event.findMany({
			orderBy: {
				date: "asc",
			},
		});

		return NextResponse.json(events);
	} catch (error) {
		console.error("Error fetching events:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}

// POST /api/events
export async function POST(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session || !session.user.admin) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const body = await request.json();
		const { title, description, date, location } = body;

		// Create event in your database
		const event = await prisma.event.create({
			data: {
				title,
				description,
				date: new Date(date),
				location,
				createdBy: session.user.email,
			},
		});

		return NextResponse.json(event);
	} catch (error) {
		console.error("Error creating event:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
