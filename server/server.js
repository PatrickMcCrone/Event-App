const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const cors = require("cors");
const PORT = 3001;
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");
const resend = require("resend");

// Configure CORS
app.use(
	cors({
		origin: "http://localhost:3000",
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	})
);

app.use(express.json());

// Add response headers middleware
app.use((req, res, next) => {
	res.setHeader("Content-Type", "application/json");
	next();
});

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: true,
	},
});

// Middleware to verify JWT token
const verifyJWT = async (req, res, next) => {
	const token = req.headers.authorization?.split(" ")[1];
	console.log("Received token:", token);
	console.log("Authorization header:", req.headers.authorization);

	if (!token) {
		console.log("No token provided");
		return res.status(401).json({ error: "No token provided" });
	}

	try {
		// Try Google token verification first
		const googleResponse = await fetch(
			`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`
		);
		if (googleResponse.ok) {
			const googleData = await googleResponse.json();
			console.log("Google token verification successful:", googleData);
			// Find the user in our database using the Google ID
			const client = await pool.connect();
			try {
				const userResult = await client.query(
					"SELECT * FROM users WHERE google_id = $1",
					[googleData.sub]
				);
				if (userResult.rows.length > 0) {
					req.user = userResult.rows[0];
					return next();
				} else {
					console.log("User not found in database");
					return res.status(401).json({ error: "User not found" });
				}
			} finally {
				client.release();
			}
		} else {
			console.log("Google token verification failed, trying JWT");
			// If Google token verification fails, try JWT
			try {
				const decoded = jwt.verify(token, process.env.JWT_SECRET);
				console.log("JWT verification successful:", decoded);
				req.user = decoded;
				return next();
			} catch (jwtError) {
				console.log("JWT verification failed:", jwtError.message);
				throw new Error("Invalid token");
			}
		}
	} catch (error) {
		console.error("Token verification error:", error);
		return res.status(401).json({ error: "Invalid token" });
	}
};

app.get("/", (req, res) => {
	res.json({ message: "Event App" });
});

// Helper function for timezone conversion
const convertTimeToTimezone = (time, fromTimezone, toTimezone) => {
	// Create a date object for today with the time in the source timezone
	const date = new Date();
	date.setHours(time.hours, time.minutes, 0, 0);

	// Format the time in the target timezone
	const formatter = new Intl.DateTimeFormat("en-US", {
		timeZone: toTimezone,
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
		timeZoneName: "short",
	});

	const formatted = formatter.format(date);
	const timezoneMatch = formatted.match(/\s([A-Z]{3,4})$/);
	const timezoneAbbr = timezoneMatch ? timezoneMatch[1] : "";

	return {
		formatted: formatted.replace(/\s[A-Z]{3,4}$/, ""),
		timezoneAbbr,
	};
};

// Helper function to parse time strings
const parseTime = (timeStr) => {
	if (!timeStr) return { hours: 0, minutes: 0 };
	const [hours, minutes] = timeStr.split(":").map(Number);
	return { hours, minutes };
};

// Helper function to create event dates
const createEventDate = (dateStr, timeStr) => {
	const date = new Date(dateStr);
	const { hours, minutes } = parseTime(timeStr);
	date.setHours(hours, minutes, 0, 0);
	return date;
};

// Get all events
app.get("/events", async (req, res) => {
	const client = await pool.connect();
	const targetTimezone = req.query.timezone || "America/New_York";

	try {
		const result = await client.query(`
			SELECT 
				e.*,
				u.name as creator_name,
				u.email as creator_email
			FROM events e
			LEFT JOIN users u ON e.created_by = u.id
			ORDER BY e.start_date, e.start_time
		`);

		// Convert times to user's timezone
		const events = await Promise.all(
			result.rows.map(async (event) => {
				try {
					// Ensure timezone is set
					const eventTimezone = event.timezone || "America/New_York";

					// Parse the time string
					const startTime = parseTime(event.start_time);
					const endTime = parseTime(event.end_time);

					const startResult = convertTimeToTimezone(
						startTime,
						eventTimezone,
						targetTimezone
					);
					const endResult = convertTimeToTimezone(
						endTime,
						eventTimezone,
						targetTimezone
					);

					// Map IANA timezone names to abbreviations
					const timezoneAbbreviations = {
						"America/New_York": "EST",
						"America/Chicago": "CST",
						"America/Denver": "MST",
						"America/Los_Angeles": "PST",
					};

					const userStartTime = {
						formatted: startResult.formatted,
						hours: startTime.hours,
						minutes: startTime.minutes,
						timezone: startResult.timezoneAbbr,
						rawTimezone: targetTimezone,
					};

					const userEndTime = {
						formatted: endResult.formatted,
						hours: endTime.hours,
						minutes: endTime.minutes,
						timezone: endResult.timezoneAbbr,
						rawTimezone: targetTimezone,
					};

					let status = "upcoming";
					const now = new Date();

					// Use the timezone-aware date objects we created
					if (now > endResult.date) {
						status = "completed";
					} else if (
						now >= startResult.date &&
						now <= endResult.date
					) {
						status = "ongoing";
					}

					// Get participants count
					const participantsResult = await client.query(
						`SELECT COUNT(*) FROM event_participants WHERE event_id = $1`,
						[event.id]
					);

					return {
						...event,
						status,
						attendees: parseInt(participantsResult.rows[0].count),
						start_time: userStartTime,
						end_time: userEndTime,
						original_timezone: eventTimezone,
						display_timezone:
							timezoneAbbreviations[targetTimezone] ||
							targetTimezone.split("/")[1],
					};
				} catch (error) {
					console.error(
						"Error converting timezone for event:",
						event.id,
						error
					);
					return event;
				}
			})
		);

		res.json(events);
	} catch (error) {
		console.error("Error fetching events:", error);
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
	}
});

// Get a single event
app.get("/events/:id", verifyJWT, async (req, res) => {
	const eventId = req.params.id;
	const targetTimezone = req.query.timezone || "America/New_York";

	try {
		// Get event details
		const eventResult = await pool.query(
			"SELECT * FROM events WHERE id = $1",
			[eventId]
		);

		if (eventResult.rows.length === 0) {
			return res.status(404).json({ error: "Event not found" });
		}

		const event = eventResult.rows[0];

		// Calculate event status
		const now = new Date();
		const eventStart = createEventDate(event.start_date, event.start_time);
		const eventEnd = createEventDate(event.end_date, event.end_time);

		const nowMs = now.getTime();
		const startMs = eventStart.getTime();
		const endMs = eventEnd.getTime();

		let status = "upcoming";
		if (nowMs > endMs) {
			status = "completed";
		} else if (nowMs >= startMs && nowMs <= endMs) {
			status = "ongoing";
		}

		// Get user's timezone from settings
		const settingsResult = await pool.query(
			"SELECT timezone FROM user_settings WHERE user_id = $1",
			[req.user.id]
		);

		const finalTimezone =
			settingsResult.rows[0]?.timezone || targetTimezone;

		const startTime = parseTime(event.start_time);
		const endTime = parseTime(event.end_time);

		const startResult = convertTimeToTimezone(
			startTime,
			event.timezone,
			finalTimezone
		);
		const endResult = convertTimeToTimezone(
			endTime,
			event.timezone,
			finalTimezone
		);

		// Get participant details
		const participantsResult = await pool.query(
			"SELECT u.name, u.email FROM event_participants ep JOIN users u ON ep.user_id = u.id WHERE ep.event_id = $1",
			[eventId]
		);

		// Prepare response
		const response = {
			...event,
			start_time: startResult.formatted,
			end_time: endResult.formatted,
			display_timezone: startResult.timezoneAbbr,
			participants: participantsResult.rows,
			status,
		};

		res.json(response);
	} catch (error) {
		console.error("Error fetching event details:", error);
		res.status(500).json({ error: "Failed to fetch event details" });
	}
});

// Get subscribers for an event
app.get("/events/:id/subscribers", async (req, res) => {
	const { id } = req.params;
	const client = await pool.connect();

	try {
		const result = await client.query(
			`
			SELECT 
				ep.*,
				u.name,
				u.email
			FROM event_participants ep
			JOIN users u ON ep.user_id = u.id
			WHERE ep.event_id = $1
			ORDER BY u.name
		`,
			[id]
		);

		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching subscribers:", error);
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
	}
});

// Create a new event
app.post("/events", verifyJWT, async (req, res) => {
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
	} = req.body;

	if (
		!title ||
		!start_date ||
		!end_date ||
		!start_time ||
		!end_time ||
		!location
	) {
		return res.status(400).json({
			error: "Title, dates, times, and location are required fields",
		});
	}

	const client = await pool.connect();

	try {
		// Start a transaction
		await client.query("BEGIN");

		// Normalize timezone value
		const normalizedTimezone =
			timezone === "EST"
				? "America/New_York"
				: timezone || "America/New_York";

		// Format times to HH:MM:SS
		const formatTime = (timeStr) => {
			if (!timeStr) return "00:00:00";
			const [hours, minutes] = timeStr.split(":");
			return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
		};

		const formattedStartTime = formatTime(start_time);
		const formattedEndTime = formatTime(end_time);

		// Create the event
		const result = await client.query(
			`INSERT INTO events 
				(title, description, start_date, end_date, start_time, end_time, location, type, created_by, timezone) 
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
				RETURNING *`,
			[
				title,
				description,
				start_date,
				end_date,
				formattedStartTime,
				formattedEndTime,
				location,
				type || "conference",
				req.user.id,
				normalizedTimezone,
			]
		);

		const event = result.rows[0];

		// Create admin record for the event creator
		await client.query(
			`INSERT INTO event_admins 
				(event_id, user_id, role) 
				VALUES ($1, $2, $3)`,
			[event.id, req.user.id, "creator"]
		);

		// Commit the transaction
		await client.query("COMMIT");

		res.status(201).json(event);
	} catch (error) {
		// Rollback the transaction on error
		await client.query("ROLLBACK");
		console.error("Error creating event:", error);
		res.status(500).json({
			error: "Internal Server Error",
			details: error.message,
		});
	} finally {
		client.release();
	}
});

// Subscribe to an event
app.post("/events/:id/subscribe", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id: eventId } = req.params;
		const userId = req.user.id;

		// Check if event exists
		const eventResult = await client.query(
			"SELECT * FROM events WHERE id = $1",
			[eventId]
		);
		if (eventResult.rows.length === 0) {
			return res.status(404).json({ error: "Event not found" });
		}

		// Start a transaction
		await client.query("BEGIN");

		// Create subscription
		await client.query(
			"INSERT INTO event_subscriptions (user_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
			[userId, eventId]
		);

		// Create participant record
		await client.query(
			"INSERT INTO event_participants (user_id, event_id, status) VALUES ($1, $2, 'confirmed') ON CONFLICT DO NOTHING",
			[userId, eventId]
		);

		// Commit the transaction
		await client.query("COMMIT");

		res.json({ message: "Subscribed successfully" });
	} catch (error) {
		// Rollback on error
		await client.query("ROLLBACK");
		console.error("Error subscribing:", error);
		res.status(500).json({ error: "Failed to subscribe" });
	} finally {
		client.release();
	}
});

// Unsubscribe from an event
app.delete("/events/:id/subscribe", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id: eventId } = req.params;
		const { user_id } = req.body;
		const userId = user_id || req.user.id; // Use provided user_id or authenticated user's id

		// Check if user is admin or event creator
		const eventResult = await client.query(
			"SELECT created_by FROM events WHERE id = $1",
			[eventId]
		);

		if (eventResult.rows.length === 0) {
			return res.status(404).json({ error: "Event not found" });
		}

		const isEventCreator = eventResult.rows[0].created_by === req.user.id;
		const isAdmin = await client.query(
			"SELECT 1 FROM event_admins WHERE event_id = $1 AND user_id = $2",
			[eventId, req.user.id]
		);

		// Only allow if user is unsubscribing themselves, or if they are admin/creator
		if (
			userId !== req.user.id &&
			!isEventCreator &&
			isAdmin.rows.length === 0
		) {
			return res
				.status(403)
				.json({ error: "Not authorized to unsubscribe this user" });
		}

		// Start a transaction
		await client.query("BEGIN");

		// Remove from subscriptions
		await client.query(
			"DELETE FROM event_subscriptions WHERE user_id = $1 AND event_id = $2",
			[userId, eventId]
		);

		// Remove from participants
		await client.query(
			"DELETE FROM event_participants WHERE user_id = $1 AND event_id = $2",
			[userId, eventId]
		);

		// Commit the transaction
		await client.query("COMMIT");

		res.json({ message: "Unsubscribed successfully" });
	} catch (error) {
		// Rollback on error
		await client.query("ROLLBACK");
		console.error("Error unsubscribing:", error);
		res.status(500).json({ error: "Failed to unsubscribe" });
	} finally {
		client.release();
	}
});

// Get user's subscriptions
app.get("/users/:id/subscriptions", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const userId = req.user.id;

		// Verify the requested user ID matches the authenticated user
		if (userId !== parseInt(req.params.id)) {
			return res
				.status(403)
				.json({ error: "Not authorized to view these subscriptions" });
		}

		const result = await client.query(
			`
			SELECT 
				es.*, 
				e.title, 
				e.description, 
				e.start_date, 
				e.end_date,
				e.start_time,
				e.end_time,
				e.location,
				e.type,
				u.name as creator_name,
				u.email as creator_email
			FROM event_subscriptions es
			JOIN events e ON es.event_id = e.id
			LEFT JOIN users u ON e.created_by = u.id
			WHERE es.user_id = $1
			ORDER BY e.start_date, e.start_time
		`,
			[userId]
		);

		// Ensure created_at is always an ISO string
		const subscriptions = result.rows.map((s) => ({
			...s,
			created_at:
				s.created_at instanceof Date
					? s.created_at.toISOString()
					: s.created_at,
		}));

		res.json(subscriptions);
	} catch (error) {
		console.error("Error fetching subscriptions:", error);
		res.status(500).json({ error: "Failed to fetch subscriptions" });
	} finally {
		client.release();
	}
});

// Get notifications for a user
app.get("/notifications", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		// First check if the notifications table exists
		const tableCheck = await client.query(`
			SELECT EXISTS (
				SELECT FROM information_schema.tables 
				WHERE table_schema = 'public' 
				AND table_name = 'notifications'
			);
		`);

		if (!tableCheck.rows[0].exists) {
			await initializeDatabase();
		}

		// Get user's timezone from settings
		const settingsResult = await client.query(
			"SELECT timezone FROM user_settings WHERE user_id = $1",
			[req.user.id]
		);
		const userTimezone =
			settingsResult.rows[0]?.timezone || "America/New_York";

		const result = await client.query(
			`
			SELECT 
				n.id,
				n.message,
				n.created_at,
				n.read,
				n.announcement_id,
				n.event_id AS event_id,
				e.title as event_title,
				e.start_date as event_date,
				e.start_time as event_time,
				e.timezone as event_timezone,
				a.title as announcement_title,
				a.message as announcement_message,
				u.name as announcement_author_name,
				u.email as announcement_author_email
			FROM notifications n
			LEFT JOIN events e ON n.event_id = e.id
			LEFT JOIN announcements a ON n.announcement_id = a.id
			LEFT JOIN users u ON a.user_id = u.id
			WHERE n.user_id = $1
			ORDER BY n.created_at DESC
		`,
			[req.user.id]
		);

		// Convert times to user's timezone
		const notifications = result.rows.map((n) => {
			// Convert created_at to user's timezone
			const createdDate = new Date(n.created_at);
			const formatter = new Intl.DateTimeFormat("en-US", {
				timeZone: userTimezone,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			});
			const formattedCreatedAt = formatter.format(createdDate);

			// Convert event time if it exists
			let formattedEventTime = null;
			if (n.event_time) {
				const { hours, minutes } = parseTime(n.event_time);
				const timeResult = convertTimeToTimezone(
					{ hours, minutes },
					n.event_timezone || "America/New_York",
					userTimezone
				);
				formattedEventTime = timeResult.formatted;
			}

			// Get timezone abbreviation
			const timezoneFormatter = new Intl.DateTimeFormat("en-US", {
				timeZone: userTimezone,
				timeZoneName: "short",
			});
			const timezoneAbbr = timezoneFormatter
				.format(createdDate)
				.split(" ")
				.pop();

			return {
				...n,
				created_at: formattedCreatedAt,
				event_time: formattedEventTime,
				display_timezone: timezoneAbbr,
			};
		});

		res.json(notifications);
	} catch (error) {
		console.error("Error fetching notifications:", error);
		res.status(500).json({
			error: "Internal Server Error",
			details: error.message,
		});
	} finally {
		client.release();
	}
});

// Mark notification as read
app.put("/notifications/:id/read", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id: notificationId } = req.params;
		const userId = req.user.id;

		// Update the notification directly in the database
		const result = await client.query(
			"UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *",
			[notificationId, userId]
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Notification not found" });
		}

		res.json({ message: "Notification marked as read" });
	} catch (error) {
		console.error("Error marking notification as read:", error);
		res.status(500).json({ error: "Failed to mark notification as read" });
	} finally {
		client.release();
	}
});

// Check subscription status
app.get("/events/:id/subscription", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id: eventId } = req.params;
		const userId = req.user.id;

		const result = await client.query(
			"SELECT * FROM event_subscriptions WHERE user_id = $1 AND event_id = $2",
			[userId, eventId]
		);

		res.json({ isSubscribed: result.rows.length > 0 });
	} catch (error) {
		console.error("Error checking subscription:", error);
		res.status(500).json({ error: "Failed to check subscription status" });
	} finally {
		client.release();
	}
});

// Login endpoint
app.post("/auth/login", async (req, res) => {
	const { email, password } = req.body;
	const client = await pool.connect();

	try {
		// Check if user exists
		const result = await client.query(
			"SELECT * FROM users WHERE email = $1",
			[email]
		);

		if (result.rows.length === 0) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		const user = result.rows[0];

		// In a real app, you would hash the password and compare it
		// For this example, we'll just check if it matches
		if (password !== user.password) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		// Create JWT token
		const token = jwt.sign(
			{ id: user.id, email: user.email },
			process.env.JWT_SECRET || "your-secret-key",
			{ expiresIn: "1d" }
		);

		// Return user data and token
		res.json({
			id: user.id,
			email: user.email,
			name: user.name,
			token,
		});
	} catch (error) {
		console.error("Login error:", error);
		res.status(500).json({ error: "Internal server error" });
	} finally {
		client.release();
	}
});

// Google OAuth callback
app.post("/auth/google", async (req, res) => {
	const { name, email, picture, googleId } = req.body;
	const client = await pool.connect();

	try {
		// Check if user exists
		let userResult = await client.query(
			"SELECT * FROM users WHERE email = $1",
			[email]
		);

		let user;
		if (userResult.rows.length === 0) {
			// Create new user
			const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
			const isAdmin = adminEmails.includes(email);

			userResult = await client.query(
				"INSERT INTO users (name, email, picture, google_id, admin) VALUES ($1, $2, $3, $4, $5) RETURNING *",
				[name, email, picture, googleId, isAdmin]
			);
			user = userResult.rows[0];
		} else {
			user = userResult.rows[0];
		}

		// Generate JWT token
		const token = jwt.sign(
			{
				id: user.id,
				email: user.email,
				admin: user.admin,
			},
			process.env.JWT_SECRET,
			{ expiresIn: "1d" }
		);

		res.json({
			id: user.id,
			name: user.name,
			email: user.email,
			picture: user.picture,
			admin: user.admin,
			token,
			accessToken: token,
		});
	} catch (error) {
		console.error("Error in Google auth:", error);
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
	}
});

// Users count endpoint
app.get("/users/active-count", async (req, res) => {
	const client = await pool.connect();
	try {
		// Get the total count of users in the users table
		const result = await client.query(`
			SELECT COUNT(*) as total_users
			FROM users
		`);

		res.json({ totalUsers: parseInt(result.rows[0].total_users) });
	} catch (error) {
		console.error("Error fetching users count:", error);
		res.status(500).json({ error: "Internal server error" });
	} finally {
		client.release();
	}
});

// Settings endpoints
app.get("/settings/reminders/:userId", async (req, res) => {
	const client = await pool.connect();
	try {
		const { userId } = req.params;
		console.log("Fetching settings for User ID:", userId);

		// Get user settings directly using user_id
		const settingsResult = await client.query(
			"SELECT * FROM user_settings WHERE user_id = $1",
			[userId]
		);

		if (settingsResult.rows.length === 0) {
			console.log("No settings found for User ID:", userId);
			// Return default settings if none exist
			res.json({
				eventReminders: true,
				timezone: "America/New_York", // Default to Eastern time
			});
		} else {
			console.log("Found existing settings for User ID:", userId);
			// Return existing settings
			const settings = settingsResult.rows[0];
			res.json({
				eventReminders: settings.event_reminders,
				timezone: settings.timezone || "America/New_York",
			});
		}
	} catch (error) {
		console.error("Error fetching settings:", error);
		res.status(500).json({ error: "Internal server error" });
	} finally {
		client.release();
	}
});

app.post("/settings/reminders", async (req, res) => {
	const client = await pool.connect();
	try {
		const { userId, eventReminders, timezone } = req.body;
		console.log("Saving settings for User ID:", userId);

		// Check if settings exist for this user_id
		const settingsResult = await client.query(
			"SELECT * FROM user_settings WHERE user_id = $1",
			[userId]
		);

		if (settingsResult.rows.length === 0) {
			console.log("Creating new settings for User ID:", userId);
			// Insert new settings
			await client.query(
				"INSERT INTO user_settings (user_id, event_reminders, timezone) VALUES ($1, $2, $3)",
				[userId, eventReminders, timezone || "America/New_York"]
			);
		} else {
			console.log("Updating existing settings for User ID:", userId);
			// Update existing settings
			await client.query(
				"UPDATE user_settings SET event_reminders = $1, timezone = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3",
				[eventReminders, timezone || "America/New_York", userId]
			);
		}

		res.json({ success: true, message: "Settings saved successfully" });
	} catch (error) {
		console.error("Error saving settings:", error);
		res.status(500).json({ error: "Internal server error" });
	} finally {
		client.release();
	}
});

// Update event
app.put("/events/:id", verifyJWT, async (req, res) => {
	const { id } = req.params;
	const {
		title,
		description,
		start_date,
		end_date,
		start_time,
		end_time,
		location,
		type,
	} = req.body;

	const client = await pool.connect();
	try {
		// Check if user owns the event or is an admin
		const eventResult = await client.query(
			`SELECT * FROM events WHERE id = $1 AND created_by = $2`,
			[id, req.user.id]
		);
		const adminResult = await client.query(
			`SELECT 1 FROM event_admins WHERE event_id = $1 AND user_id = $2`,
			[id, req.user.id]
		);
		if (eventResult.rows.length === 0 && adminResult.rows.length === 0) {
			return res
				.status(403)
				.json({ error: "Not authorized to update this event" });
		}

		// Store times as provided (no conversion)
		const formatTimeForStorage = (timeStr) => {
			if (!timeStr) return null;
			const parts = timeStr.split(":");
			if (parts.length < 2) return null;
			const hours = parseInt(parts[0], 10);
			const minutes = parseInt(parts[1], 10);
			if (isNaN(hours) || isNaN(minutes)) return null;
			return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00`;
		};

		const formattedStartTime = start_time
			? formatTimeForStorage(start_time)
			: undefined;
		const formattedEndTime = end_time
			? formatTimeForStorage(end_time)
			: undefined;
		const finalStartTime =
			formattedStartTime || eventResult.rows[0]?.start_time;
		const finalEndTime = formattedEndTime || eventResult.rows[0]?.end_time;

		const result = await client.query(
			`
			UPDATE events 
			SET 
				title = COALESCE($1, title),
				description = COALESCE($2, description),
				start_date = COALESCE($3, start_date),
				end_date = COALESCE($4, end_date),
				start_time = COALESCE($5, start_time),
				end_time = COALESCE($6, end_time),
				location = COALESCE($7, location),
				type = COALESCE($8, type),
				updated_at = CURRENT_TIMESTAMP
			WHERE id = $9
			RETURNING *
		`,
			[
				title,
				description,
				start_date,
				end_date,
				finalStartTime,
				finalEndTime,
				location,
				type,
				id,
			]
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Event not found" });
		}

		const event = result.rows[0];

		// Calculate event status
		const now = new Date();
		const eventStart = createEventDate(event.start_date, event.start_time);
		const eventEnd = createEventDate(event.end_date, event.end_time);
		const nowMs = now.getTime();
		const startMs = eventStart.getTime();
		const endMs = eventEnd.getTime();
		let status = "upcoming";
		if (nowMs > endMs) {
			status = "completed";
		} else if (nowMs >= startMs && nowMs <= endMs) {
			status = "ongoing";
		}

		// Get user's timezone from settings
		const settingsResult = await client.query(
			"SELECT timezone FROM user_settings WHERE user_id = $1",
			[req.user.id]
		);
		const finalTimezone =
			settingsResult.rows[0]?.timezone || "America/New_York";

		const startTime = parseTime(event.start_time);
		const endTime = parseTime(event.end_time);
		const startResult = convertTimeToTimezone(
			startTime,
			event.timezone,
			finalTimezone
		);
		const endResult = convertTimeToTimezone(
			endTime,
			event.timezone,
			finalTimezone
		);

		// Prepare response (formatted, like GET /events/:id)
		res.json({
			...event,
			start_time: startResult.formatted, // e.g., 08:00 AM
			end_time: endResult.formatted, // e.g., 08:01 AM
			display_timezone: startResult.timezoneAbbr,
			status,
		});
	} catch (error) {
		console.error("Error updating event:", error);
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
	}
});

// Delete event
app.delete("/events/:id", verifyJWT, async (req, res) => {
	const { id } = req.params;
	const client = await pool.connect();
	try {
		// Check if user owns the event or is an admin
		const eventResult = await client.query(
			"SELECT * FROM events WHERE id = $1 AND created_by = $2",
			[id, req.user.id]
		);
		const adminResult = await client.query(
			"SELECT 1 FROM event_admins WHERE event_id = $1 AND user_id = $2",
			[id, req.user.id]
		);
		if (eventResult.rows.length === 0 && adminResult.rows.length === 0) {
			return res
				.status(403)
				.json({ error: "Not authorized to delete this event" });
		}

		await client.query("DELETE FROM events WHERE id = $1", [id]);
		res.json({ message: "Event deleted successfully" });
	} catch (error) {
		console.error("Error deleting event:", error);
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
	}
});

// Initialize database tables
async function initializeDatabase() {
	const client = await pool.connect();
	try {
		// Create users table
		await client.query(`
			CREATE TABLE IF NOT EXISTS users (
				id SERIAL PRIMARY KEY,
				name VARCHAR(255),
				email VARCHAR(255) UNIQUE NOT NULL,
				picture VARCHAR(255),
				google_id VARCHAR(255) UNIQUE,
				admin BOOLEAN DEFAULT FALSE,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Create user_settings table
		await client.query(`
			CREATE TABLE IF NOT EXISTS user_settings (
				id SERIAL PRIMARY KEY,
				user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				event_reminders BOOLEAN DEFAULT TRUE,
				timezone VARCHAR(50) DEFAULT 'America/New_York',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(user_id)
			)
		`);

		// Create events table
		await client.query(`
			CREATE TABLE IF NOT EXISTS events (
				id SERIAL PRIMARY KEY,
				title VARCHAR(255) NOT NULL,
				description TEXT,
				start_date DATE NOT NULL,
				end_date DATE NOT NULL,
				start_time TIME NOT NULL,
				end_time TIME NOT NULL,
				location VARCHAR(255) NOT NULL,
				type VARCHAR(50) NOT NULL DEFAULT 'conference',
				timezone VARCHAR(50) NOT NULL DEFAULT 'America/New_York',
				created_by INTEGER REFERENCES users(id),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				CHECK (end_date >= start_date),
				CHECK (
					(end_date > start_date) OR 
					(end_date = start_date AND end_time > start_time)
				)
			);

			CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
			CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, start_time);
		`);

		// Create event_admins table
		await client.query(`
			CREATE TABLE IF NOT EXISTS event_admins (
				id SERIAL PRIMARY KEY,
				event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
				user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				role VARCHAR(50) NOT NULL DEFAULT 'admin',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(event_id, user_id)
			)
		`);

		// Create event_participants table
		await client.query(`
			CREATE TABLE IF NOT EXISTS event_participants (
				id SERIAL PRIMARY KEY,
				event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
				user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				status VARCHAR(50) NOT NULL DEFAULT 'pending',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(event_id, user_id)
			)
		`);

		// Create event_subscriptions table
		await client.query(`
			CREATE TABLE IF NOT EXISTS event_subscriptions (
				id SERIAL PRIMARY KEY,
				user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
				created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(user_id, event_id)
			)
		`);

		// Create announcements table
		await client.query(`
			CREATE TABLE IF NOT EXISTS announcements (
				id SERIAL PRIMARY KEY,
				event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
				user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				title VARCHAR(255) NOT NULL,
				message TEXT NOT NULL,
				created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Create notifications table
		await client.query(`
			CREATE TABLE IF NOT EXISTS notifications (
				id SERIAL PRIMARY KEY,
				user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
				announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
				message TEXT NOT NULL,
				read BOOLEAN NOT NULL DEFAULT FALSE,
				created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Remove old migration code for conferences table
	} catch (error) {
		console.error("Error initializing database:", error);
	} finally {
		client.release();
	}
}

// Helper function to send email notifications
async function sendEmailNotification(userEmail, subject, message) {
	try {
		const resend = new Resend(process.env.RESEND_API_KEY);
		await resend.emails.send({
			from: "notifications@event-app.com",
			to: "onboarding@resend.dev", // This is the correct test address
			subject: subject,
			html: message,
		});
	} catch (error) {
		console.error("Error sending email notification:", error);
	}
}

// Create announcement
app.post("/events/:id/announcements", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		// Start transaction
		await client.query("BEGIN");

		const eventId = req.params.id;
		const { title, message, recipientType } = req.body;
		const userId = req.user.id;

		// Verify user is event admin or creator
		const adminCheck = await client.query(
			`SELECT 1 FROM event_admins WHERE event_id = $1 AND user_id = $2
			UNION
			SELECT 1 FROM events WHERE id = $1 AND created_by = $2`,
			[eventId, userId]
		);

		if (adminCheck.rows.length === 0) {
			return res
				.status(403)
				.json({ error: "Only event admins can create announcements" });
		}

		// Create announcement
		const announcementResult = await client.query(
			`INSERT INTO announcements (event_id, user_id, title, message, created_at)
			VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
			RETURNING *`,
			[eventId, userId, title, message]
		);
		const announcement = announcementResult.rows[0];

		// Get recipient user IDs based on recipientType
		let recipientUserIds = [];
		if (recipientType === "all") {
			const allUsersResult = await client.query(
				`SELECT user_id FROM event_participants WHERE event_id = $1`,
				[eventId]
			);
			recipientUserIds = allUsersResult.rows.map((row) => row.user_id);
		} else if (recipientType === "confirmed") {
			const confirmedUsersResult = await client.query(
				`SELECT user_id FROM event_participants 
				WHERE event_id = $1 AND status = 'confirmed'`,
				[eventId]
			);
			recipientUserIds = confirmedUsersResult.rows.map(
				(row) => row.user_id
			);
		}

		// Create notifications for recipients
		if (recipientUserIds.length > 0) {
			const notificationValues = recipientUserIds
				.map(
					(userId) =>
						`(${userId}, ${eventId}, ${announcement.id}, 'New announcement: ${title}', false, CURRENT_TIMESTAMP)`
				)
				.join(",");
			await client.query(
				`INSERT INTO notifications (user_id, event_id, announcement_id, message, read, created_at)
				VALUES ${notificationValues}`
			);
		}

		// Commit the transaction
		await client.query("COMMIT");

		res.status(201).json(announcement);
	} catch (error) {
		// Rollback on error
		await client.query("ROLLBACK");
		console.error("Error creating announcement:", error);
		res.status(500).json({ error: "Failed to create announcement" });
	} finally {
		client.release();
	}
});

// Get announcements for an event
app.get("/events/:id/announcements", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id: eventId } = req.params;

		const result = await client.query(
			`SELECT 
				a.*,
				u.name as author_name,
				u.email as author_email
			FROM announcements a
			JOIN users u ON a.user_id = u.id
			WHERE a.event_id = $1
			ORDER BY a.created_at DESC`,
			[eventId]
		);

		// Ensure created_at is always an ISO string with UTC timezone
		const announcements = result.rows.map((a) => {
			const isoString =
				a.created_at instanceof Date
					? a.created_at.toISOString()
					: new Date(a.created_at).toISOString();

			return {
				...a,
				created_at: isoString,
			};
		});

		res.json(announcements);
	} catch (error) {
		console.error("Error fetching announcements:", error);
		res.status(500).json({ error: "Failed to fetch announcements" });
	} finally {
		client.release();
	}
});

// Check if user is admin for an event
app.get("/events/:id/admin", verifyJWT, async (req, res) => {
	const { id: eventId } = req.params;
	const userId = req.user.id;
	const client = await pool.connect();
	try {
		const adminCheck = await client.query(
			"SELECT 1 FROM event_admins WHERE event_id = $1 AND user_id = $2",
			[eventId, userId]
		);
		if (adminCheck.rows.length > 0) {
			res.json({ isAdmin: true });
		} else {
			res.status(403).json({ isAdmin: false });
		}
	} catch (error) {
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
	}
});

// Delete a notification
app.delete("/notifications/:id", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id } = req.params;
		const userId = req.user.id;

		const result = await client.query(
			"DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *",
			[id, userId]
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Notification not found" });
		}

		res.json({ success: true });
	} catch (error) {
		console.error("Error deleting notification:", error);
		res.status(500).json({ error: "Failed to delete notification" });
	} finally {
		client.release();
	}
});

// Delete an announcement (admin only)
app.delete(
	"/events/:eventId/announcements/:announcementId",
	verifyJWT,
	async (req, res) => {
		const client = await pool.connect();
		try {
			const { eventId, announcementId } = req.params;
			const userId = req.user.id;

			// Check if user is an admin for this event
			const adminCheck = await client.query(
				`SELECT 1 FROM event_admins WHERE event_id = $1 AND user_id = $2`,
				[eventId, userId]
			);
			if (adminCheck.rows.length === 0) {
				return res.status(403).json({
					error: "Not authorized to delete announcements for this event",
				});
			}

			// Start a transaction
			await client.query("BEGIN");

			// Delete related notifications
			await client.query(
				`DELETE FROM notifications WHERE announcement_id = $1`,
				[announcementId]
			);

			// Delete the announcement
			const result = await client.query(
				`DELETE FROM announcements WHERE id = $1 AND event_id = $2 RETURNING *`,
				[announcementId, eventId]
			);

			if (result.rows.length === 0) {
				await client.query("ROLLBACK");
				return res
					.status(404)
					.json({ error: "Announcement not found" });
			}

			await client.query("COMMIT");
			res.json({ success: true });
		} catch (error) {
			await client.query("ROLLBACK");
			console.error("Error deleting announcement:", error);
			res.status(500).json({ error: "Failed to delete announcement" });
		} finally {
			client.release();
		}
	}
);

// Update the users endpoint to include admin status
app.get("/users", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const result = await client.query(
			"SELECT id, name, email, admin FROM users ORDER BY name"
		);
		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
	}
});

// Add admin to event
app.post("/events/:id/admins", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id: eventId } = req.params;
		const { user_id, role, subscribe } = req.body;
		const userId = req.user.id;

		// Check if user owns the event
		const eventResult = await client.query(
			"SELECT * FROM events WHERE id = $1 AND created_by = $2",
			[eventId, userId]
		);
		if (eventResult.rows.length === 0) {
			return res
				.status(403)
				.json({ error: "Not authorized to add admins to this event" });
		}

		// Start a transaction
		await client.query("BEGIN");

		// Add admin
		await client.query(
			"INSERT INTO event_admins (event_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
			[eventId, user_id, role]
		);

		// If subscribe flag is true, also subscribe the user
		if (subscribe) {
			await client.query(
				"INSERT INTO event_subscriptions (user_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
				[user_id, eventId]
			);
			await client.query(
				"INSERT INTO event_participants (user_id, event_id, status) VALUES ($1, $2, 'confirmed') ON CONFLICT DO NOTHING",
				[user_id, eventId]
			);
		}

		// Commit the transaction
		await client.query("COMMIT");

		res.json({ message: "Admin added successfully" });
	} catch (error) {
		// Rollback on error
		await client.query("ROLLBACK");
		console.error("Error adding admin:", error);
		res.status(500).json({ error: "Failed to add admin" });
	} finally {
		client.release();
	}
});

// Add participant to event
app.post("/events/:id/participants", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id: eventId } = req.params;
		const { user_id, role = "attendee", subscribe } = req.body;
		const userId = req.user.id;

		// Check if user owns the event
		const eventResult = await client.query(
			"SELECT * FROM events WHERE id = $1 AND created_by = $2",
			[eventId, userId]
		);
		if (eventResult.rows.length === 0) {
			return res.status(403).json({
				error: "Not authorized to add participants to this event",
			});
		}

		// Start a transaction
		await client.query("BEGIN");

		// Add participant with role and confirmed status
		await client.query(
			"INSERT INTO event_participants (event_id, user_id, status, role) VALUES ($1, $2, 'confirmed', $3) ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'confirmed', role = $3",
			[eventId, user_id, role]
		);

		// If subscribe flag is true, also subscribe the user
		if (subscribe) {
			await client.query(
				"INSERT INTO event_subscriptions (user_id, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
				[user_id, eventId]
			);
		}

		// Commit the transaction
		await client.query("COMMIT");

		res.json({ message: "Participant added successfully" });
	} catch (error) {
		// Rollback on error
		await client.query("ROLLBACK");
		console.error("Error adding participant:", error);
		res.status(500).json({ error: "Failed to add participant" });
	} finally {
		client.release();
	}
});

// Get event admins
app.get("/events/:id/admins", verifyJWT, async (req, res) => {
	const { id: eventId } = req.params;
	const client = await pool.connect();

	try {
		// First get the event creator
		const eventResult = await client.query(
			`SELECT 
				e.created_by,
				u.name,
				u.email
			FROM events e
			JOIN users u ON e.created_by = u.id
			WHERE e.id = $1`,
			[eventId]
		);

		if (eventResult.rows.length === 0) {
			return res.status(404).json({ error: "Event not found" });
		}

		const eventCreator = eventResult.rows[0];

		// Then get other admins
		const adminsResult = await client.query(
			`SELECT 
				ea.*,
				u.name,
				u.email
			FROM event_admins ea
			JOIN users u ON ea.user_id = u.id
			WHERE ea.event_id = $1
			ORDER BY ea.role, u.name`,
			[eventId]
		);

		// Combine event creator with other admins
		const allAdmins = [
			{
				id: eventCreator.created_by,
				user_id: eventCreator.created_by,
				name: eventCreator.name,
				email: eventCreator.email,
				role: "creator",
			},
			...adminsResult.rows,
		];

		res.json(allAdmins);
	} catch (error) {
		console.error("Error fetching admins:", error);
		res.status(500).json({ error: "Failed to fetch admins" });
	} finally {
		client.release();
	}
});

// Get event participants
app.get("/events/:id/participants", verifyJWT, async (req, res) => {
	const { id: eventId } = req.params;
	const client = await pool.connect();

	try {
		const result = await client.query(
			`SELECT 
				ep.*,
				u.name,
				u.email
			FROM event_participants ep
			JOIN users u ON ep.user_id = u.id
			WHERE ep.event_id = $1
			ORDER BY ep.role, u.name`,
			[eventId]
		);

		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching participants:", error);
		res.status(500).json({ error: "Failed to fetch participants" });
	} finally {
		client.release();
	}
});

app.patch(
	"/events/:id/subscribers/:userId/status",
	verifyJWT,
	async (req, res) => {
		const client = await pool.connect();
		try {
			const { id: eventId, userId } = req.params;
			const { status } = req.body;

			// Validate status
			if (!["enabled", "disabled"].includes(status)) {
				return res.status(400).json({
					error: "Invalid status value. Must be 'enabled' or 'disabled'",
				});
			}

			// Start transaction
			await client.query("BEGIN");

			// Check if user is admin or speaker
			const adminResult = await client.query(
				"SELECT * FROM event_admins WHERE event_id = $1 AND user_id = $2",
				[eventId, req.user.id]
			);

			if (adminResult.rows.length === 0) {
				await client.query("ROLLBACK");
				return res.status(403).json({
					error: "Not authorized to modify subscriber status",
				});
			}

			// Check if event exists
			const eventResult = await client.query(
				"SELECT 1 FROM events WHERE id = $1",
				[eventId]
			);

			if (eventResult.rows.length === 0) {
				await client.query("ROLLBACK");
				return res.status(404).json({ error: "Event not found" });
			}

			// Check if subscriber exists
			const subscriberResult = await client.query(
				"SELECT 1 FROM event_participants WHERE event_id = $1 AND user_id = $2",
				[eventId, userId]
			);

			if (subscriberResult.rows.length === 0) {
				await client.query("ROLLBACK");
				return res.status(404).json({ error: "Subscriber not found" });
			}

			// Update subscriber status
			await client.query(
				"UPDATE event_participants SET status = $1 WHERE event_id = $2 AND user_id = $3",
				[status, eventId, userId]
			);

			// Commit transaction
			await client.query("COMMIT");

			res.json({ message: "Subscriber status updated successfully" });
		} catch (error) {
			await client.query("ROLLBACK");
			console.error("Error updating subscriber status:", error);
			res.status(500).json({
				error: "Failed to update subscriber status",
			});
		} finally {
			client.release();
		}
	}
);

// Helper function to send event reminders
async function sendEventReminders() {
	const client = await pool.connect();
	try {
		// Get all events that start in the next 24 hours
		const now = new Date();
		const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

		const eventsResult = await client.query(
			`SELECT e.id, e.title, e.start_date, e.start_time, e.location,
			ep.user_id, us.event_reminders
			FROM events e
			JOIN event_participants ep ON e.id = ep.event_id
			JOIN users u ON ep.user_id = u.id
			LEFT JOIN user_settings us ON u.id = us.user_id
			WHERE e.start_date BETWEEN $1 AND $2
			AND ep.status = 'confirmed'
			AND (us.event_reminders IS NULL OR us.event_reminders = true)`,
			[now, tomorrow]
		);

		for (const event of eventsResult.rows) {
			// Check if a notification for this event and user already exists in the last 24 hours
			const existingNotification = await client.query(
				`SELECT 1 FROM notifications 
				WHERE user_id = $1 AND event_id = $2 
				AND message LIKE $3 
				AND created_at > NOW() - INTERVAL '24 hours'`,
				[event.user_id, event.id, `Event Reminder: ${event.title}%`]
			);

			if (existingNotification.rows.length === 0) {
				console.log(`Processing reminder for event: ${event.title}`);

				// Create notification in the notification center
				await client.query(
					`INSERT INTO notifications (user_id, event_id, message, read, created_at)
					VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)`,
					[
						event.user_id,
						event.id,
						`Event Reminder: ${event.title} starts soon!`,
					]
				);
			}
		}
	} catch (error) {
		console.error("Error sending event reminders:", error);
	} finally {
		client.release();
	}
}

// Set up scheduled task to check for event reminders every hour
setInterval(sendEventReminders, 60 * 60 * 1000); // Run every hour

// Export the function for testing
module.exports = { sendEventReminders };

// Notify all subscribers of an event with an in-app notification
async function notifySubscribers(eventId, message) {
	const client = await pool.connect();
	try {
		// Get all user IDs subscribed to this event
		const result = await client.query(
			`SELECT user_id FROM event_subscriptions WHERE event_id = $1`,
			[eventId]
		);
		const userIds = result.rows.map((row) => row.user_id);

		// Insert a notification for each user
		for (const userId of userIds) {
			await client.query(
				`INSERT INTO notifications (user_id, event_id, message, read, created_at)
				 VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)`,
				[userId, eventId, message]
			);
		}
	} catch (error) {
		console.error("Error notifying subscribers:", error);
	} finally {
		client.release();
	}
}

app.listen(PORT, async () => {
	try {
		await initializeDatabase();
		console.log(`Server is running on port ${PORT}`);
	} catch (error) {
		console.error("Failed to initialize database:", error);
		process.exit(1);
	}
});

const formatDate = (dateString) => {
	if (!dateString) return "";
	const date = new Date(dateString);
	return isNaN(date.getTime()) ? String(dateString) : date.toLocaleString();
};
