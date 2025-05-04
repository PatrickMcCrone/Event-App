import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const response = await fetch('http://localhost:3001/events', {
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${session.user.accessToken}`,
			},
		});

		if (!response.ok) {
			throw new Error('Failed to fetch events');
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error('Error fetching events:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch events' },
			{ status: 500 }
		);
	}
}

export async function POST(request: Request) {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const body = await request.json();
		const { 
			title, 
			description, 
			start_date, 
			end_date, 
			start_time, 
			end_time, 
			location, 
			type, 
			timezone,
			selectedAdmins,
			selectedParticipants
		} = body;

		// First, create the event
		const eventResponse = await fetch('http://localhost:3001/events', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${session.user.accessToken}`,
			},
			body: JSON.stringify({
				title,
				description,
				start_date,
				end_date,
				start_time,
				end_time,
				location,
				type,
				timezone,
			}),
		});

		if (!eventResponse.ok) {
			throw new Error('Failed to create event');
		}

		const event = await eventResponse.json();

		// Then, add admins and subscribe them
		for (const admin of selectedAdmins) {
			// Add as admin and subscribe in one request
			await fetch(`http://localhost:3001/events/${event.id}/admins`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${session.user.accessToken}`,
				},
				body: JSON.stringify({
					user_id: admin.userId,
					role: admin.role,
					subscribe: true
				}),
			});
		}

		// Finally, add participants and subscribe them
		for (const participant of selectedParticipants) {
			// Add as participant and subscribe in one request
			await fetch(`http://localhost:3001/events/${event.id}/participants`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${session.user.accessToken}`,
				},
				body: JSON.stringify({
					user_id: participant.userId,
					subscribe: true
				}),
			});
		}

		return NextResponse.json(event);
	} catch (error) {
		console.error('Error creating event:', error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Failed to create event' },
			{ status: 500 }
		);
	}
}
