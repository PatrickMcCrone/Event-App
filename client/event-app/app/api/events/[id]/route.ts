import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET /api/events/[id]
export async function GET(
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

		const event = await prisma.event.findUnique({
			where: {
				id: parseInt(params.id),
			},
		});

		if (!event) {
			return NextResponse.json(
				{ error: "Event not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json(event);
	} catch (error) {
		console.error("Error fetching event:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}

// PUT /api/events/[id]
export async function PUT(
	request: Request,
	{ params }: { params: { id: string } }
) {
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

		const event = await prisma.event.update({
			where: {
				id: parseInt(params.id),
			},
			data: {
				title,
				description,
				date: new Date(date),
				location,
			},
		});

		return NextResponse.json(event);
	} catch (error) {
		console.error("Error updating event:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}

// DELETE /api/events/[id]
export async function DELETE(
	request: Request,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await getServerSession(authOptions);
		if (!session || !session.user.admin) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		await prisma.event.delete({
			where: {
				id: parseInt(params.id),
			},
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error deleting event:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 }
		);
	}
}
