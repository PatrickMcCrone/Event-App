const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const cors = require("cors");
const PORT = 3001;
const { Pool } = require("pg");

app.use(cors());
app.use(express.json());

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const pool = new Pool({
	host: PGHOST,
	database: PGDATABASE,
	user: PGUSER,
	password: PGPASSWORD,
	port: 5432,
	ssl: {
		rejectUnauthorized: false,
	},
});

app.get("/", (req, res) => {
	res.json({ message: "Event App" });
});

app.get("/conferences", async (req, res) => {
	const client = await pool.connect();

	try {
		const result = await client.query("SELECT * FROM conferences");
		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching conferences:", error);
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
	}
});

app.get("/conferences/:id", async (req, res) => {
	const { id } = req.params;
	const client = await pool.connect();

	try {
		const result = await client.query(
			"SELECT * FROM conferences WHERE id = $1",
			[id]
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Conference not found" });
		}

		// Calculate status based on date
		const event = result.rows[0];
		const eventDate = new Date(event.date);
		const now = new Date();
		const diffTime = eventDate.getTime() - now.getTime();
		const diffDays = diffTime / (1000 * 60 * 60 * 24);

		let status = "upcoming";
		if (diffDays < 0) status = "completed";
		else if (diffDays <= 1) status = "ongoing";

		// Add status and other required fields
		const eventWithStatus = {
			...event,
			status,
			organizer: "organizerName", // Default organizer
			attendees: 0, // Default attendees count
		};

		res.json(eventWithStatus);
	} catch (error) {
		console.error("Error fetching conference:", error);
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
	}
});

app.post("/conferences", async (req, res) => {
	const { title, description, date, time, location } = req.body;

	if (!title || !date || !time || !location) {
		return res.status(400).json({
			error: "Title, date, time, and location are required fields",
		});
	}

	const client = await pool.connect();

	try {
		const result = await client.query(
			"INSERT INTO conferences (title, description, date, time, location) VALUES ($1, $2, $3, $4, $5) RETURNING *",
			[title, description, date, time, location]
		);

		res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error("Error creating conference:", error);
		res.status(500).json({
			error: "Internal Server Error",
			details: error.message,
		});
	} finally {
		client.release();
	}
});

// Add new endpoint for saving reminder settings
app.post("/settings/reminders", async (req, res) => {
	const { userId, eventReminders, emailNotifications } = req.body;
	const client = await pool.connect();

	try {
		// For now, we'll just store the preferences in a simple way
		// In a real app, you'd want to store these in a user_preferences table
		await client.query(
			"INSERT INTO user_reminders (user_id, event_id, reminder_time) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
			[userId, 1, new Date()] // Example values
		);

		res.json({
			success: true,
			message: "Reminder preferences saved successfully",
			preferences: {
				eventReminders,
				emailNotifications,
			},
		});
	} catch (error) {
		console.error("Error saving reminder preferences:", error);
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
	}
});

// Add endpoint to get active users count
app.get("/users/active-count", async (req, res) => {
	const client = await pool.connect();

	try {
		// For now, we'll count unique attendees from the conferences table
		// In a real app, you'd have a separate users table
		const result = await client.query(`
			SELECT COUNT(DISTINCT attendees) as active_users 
			FROM conferences 
			WHERE date >= CURRENT_DATE - INTERVAL '30 days'
		`);

		res.json({ activeUsers: parseInt(result.rows[0].active_users) || 0 });
	} catch (error) {
		console.error("Error fetching active users count:", error);
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
	}
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
