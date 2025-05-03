import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
	try {
		const { name, email, reason, userId } = await request.json();

		// Send email to admin
		const { data, error } = await resend.emails.send({
			from: "onboarding@resend.dev",
			to: process.env.ADMIN_EMAIL || "your_email@example.com",
			subject: "New Admin Application",
			html: `
        <h2>New Admin Application</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Reason:</strong> ${reason}</p>
      `,
		});

		if (error) {
			console.error("Error sending email:", error);
			return NextResponse.json(
				{ error: "Failed to send email" },
				{ status: 500 }
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Error processing admin application:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
