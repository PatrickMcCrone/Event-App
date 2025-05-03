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
	host: PGHOST,
	database: PGDATABASE,
	user: PGUSER,
	password: PGPASSWORD,
	port: 5432,
	ssl: {
		rejectUnauthorized: false,
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
		// Try to verify as a JWT first
		try {
			console.log("Attempting JWT verification");
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			console.log("JWT verification successful:", decoded);
			req.user = decoded;
			return next();
		} catch (jwtError) {
			console.log("JWT verification failed:", jwtError.message);
			// If JWT verification fails, try Google token
			const googleResponse = await fetch(
				`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`
			);
			if (googleResponse.ok) {
				const googleData = await googleResponse.json();
				console.log(
					"Google token verification successful:",
					googleData
				);
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
						return res
							.status(401)
							.json({ error: "User not found" });
					}
				} finally {
					client.release();
				}
			} else {
				console.log("Google token verification failed");
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

// Get all events
app.get("/events", async (req, res) => {
	const client = await pool.connect();
	const userTimezone =
		req.query.timezone === "EST"
			? "America/New_York"
			: req.query.timezone === "CST"
				? "America/Chicago"
				: req.query.timezone || "America/New_York";

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
					const parseTime = (timeStr) => {
						if (!timeStr) return { hours: 0, minutes: 0 };
						const [hours, minutes] = timeStr.split(":");
						return {
							hours: parseInt(hours, 10),
							minutes: parseInt(minutes, 10),
						};
					};

					const startTime = parseTime(event.start_time);
					const endTime = parseTime(event.end_time);

					// Create date objects in the event's timezone
					const createDateInTimezone = (
						date,
						time,
						fromTimezone,
						toTimezone
					) => {
						const { hours, minutes } = time;

						// Create a date object in the event's original timezone
						const eventDate = new Date(date);
						eventDate.setHours(hours, minutes, 0, 0);

						// Format the time in the target timezone
						const formatter = new Intl.DateTimeFormat("en-US", {
							timeZone: toTimezone,
							hour: "numeric",
							minute: "2-digit",
							hour12: true,
						});

						// Get the formatted time in the target timezone
						const formattedTime = formatter.format(eventDate);

						return {
							date: eventDate,
							formatted: formattedTime,
						};
					};

					const startResult = createDateInTimezone(
						new Date(event.start_date),
						startTime,
						eventTimezone,
						userTimezone
					);

					const endResult = createDateInTimezone(
						new Date(event.end_date),
						endTime,
						eventTimezone,
						userTimezone
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
						timezone:
							timezoneAbbreviations[userTimezone] ||
							userTimezone.split("/")[1],
						rawTimezone: userTimezone,
					};

					const userEndTime = {
						formatted: endResult.formatted,
						hours: endTime.hours,
						minutes: endTime.minutes,
						timezone:
							timezoneAbbreviations[userTimezone] ||
							userTimezone.split("/")[1],
						rawTimezone: userTimezone,
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
							timezoneAbbreviations[userTimezone] ||
							userTimezone.split("/")[1],
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
app.get("/events/:id", async (req, res) => {
	const { id } = req.params;
	const client = await pool.connect();

	// Map timezone abbreviations to IANA timezone names
	const timezoneMap = {
		EST: "America/New_York",
		CST: "America/Chicago",
		MST: "America/Denver",
		PST: "America/Los_Angeles",
	};

	const userTimezone =
		timezoneMap[req.query.timezone] ||
		req.query.timezone ||
		"America/New_York";

	try {
		const result = await client.query(
			`
			SELECT 
				e.*,
				u.name as creator_name,
				u.email as creator_email
			FROM events e
			LEFT JOIN users u ON e.created_by = u.id
			WHERE e.id = $1
		`,
			[id]
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Event not found" });
		}

		const event = result.rows[0];

		const now = new Date();

		try {
			// Ensure timezone is set
			const eventTimezone = event.timezone || "America/New_York";

			// Parse the time string
			const parseTime = (timeStr) => {
				if (!timeStr) return { hours: 0, minutes: 0 };
				const [hours, minutes] = timeStr.split(":");
				return {
					hours: parseInt(hours, 10),
					minutes: parseInt(minutes, 10),
				};
			};

			const startTime = parseTime(event.start_time);
			const endTime = parseTime(event.end_time);

			// Create date objects in the event's timezone
			const createDateInTimezone = (
				date,
				time,
				fromTimezone,
				toTimezone
			) => {
				const { hours, minutes } = time;

				// Create a date object in the event's original timezone
				const eventDate = new Date(date);
				eventDate.setHours(hours, minutes, 0, 0);

				// Format the time in the target timezone
				const formatter = new Intl.DateTimeFormat("en-US", {
					timeZone: toTimezone,
					hour: "numeric",
					minute: "2-digit",
					hour12: true,
				});

				// Get the formatted time in the target timezone
				const formattedTime = formatter.format(eventDate);

				return {
					date: eventDate,
					formatted: formattedTime,
				};
			};

			const startResult = createDateInTimezone(
				new Date(event.start_date),
				startTime,
				eventTimezone,
				userTimezone
			);

			const endResult = createDateInTimezone(
				new Date(event.end_date),
				endTime,
				eventTimezone,
				userTimezone
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
				timezone:
					timezoneAbbreviations[userTimezone] ||
					userTimezone.split("/")[1],
				rawTimezone: userTimezone,
			};

			const userEndTime = {
				formatted: endResult.formatted,
				hours: endTime.hours,
				minutes: endTime.minutes,
				timezone:
					timezoneAbbreviations[userTimezone] ||
					userTimezone.split("/")[1],
				rawTimezone: userTimezone,
			};

			let status = "upcoming";
			const now = new Date();

			// Use the timezone-aware date objects we created
			if (now > endResult.date) {
				status = "completed";
			} else if (now >= startResult.date && now <= endResult.date) {
				status = "ongoing";
			}

			// Get participants count and list
			const participantsResult = await client.query(
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

			const eventWithStatus = {
				...event,
				status,
				attendees: participantsResult.rows.length,
				participants: participantsResult.rows,
				start_time: userStartTime,
				end_time: userEndTime,
				original_timezone: eventTimezone,
				display_timezone:
					timezoneAbbreviations[userTimezone] ||
					userTimezone.split("/")[1],
			};

			res.json(eventWithStatus);
		} catch (error) {
			console.error("Error converting timezone for event:", id, error);
			res.status(500).json({ error: "Error processing event timezone" });
		}
	} catch (error) {
		console.error("Error fetching event:", error);
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
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
		const userId = req.user.id;

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

		console.log("Raw notification rows:", result.rows);

		// Ensure created_at is always an ISO string
		const notifications = result.rows.map((n) => ({
			...n,
			created_at:
				n.created_at instanceof Date
					? n.created_at.toISOString()
					: n.created_at,
			event_date:
				n.event_date instanceof Date
					? n.event_date.toISOString()
					: n.event_date,
		}));

		console.log("Sending notifications:", notifications);
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
				emailNotifications: true,
				timezone: "America/New_York", // Default to Eastern time
			});
		} else {
			console.log("Found existing settings for User ID:", userId);
			// Return existing settings
			const settings = settingsResult.rows[0];
			res.json({
				eventReminders: settings.event_reminders,
				emailNotifications: settings.email_notifications,
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
		const { userId, eventReminders, emailNotifications, timezone } =
			req.body;
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
				"INSERT INTO user_settings (user_id, event_reminders, email_notifications, timezone) VALUES ($1, $2, $3, $4)",
				[
					userId,
					eventReminders,
					emailNotifications,
					timezone || "America/New_York",
				]
			);
		} else {
			console.log("Updating existing settings for User ID:", userId);
			// Update existing settings
			await client.query(
				"UPDATE user_settings SET event_reminders = $1, email_notifications = $2, timezone = $3, updated_at = CURRENT_TIMESTAMP WHERE user_id = $4",
				[
					eventReminders,
					emailNotifications,
					timezone || "America/New_York",
					userId,
				]
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
		// Check if user owns the event
		const eventResult = await client.query(
			"SELECT * FROM events WHERE id = $1 AND created_by = $2",
			[id, req.user.id]
		);
		if (eventResult.rows.length === 0) {
			return res
				.status(403)
				.json({ error: "Not authorized to update this event" });
		}

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
				start_time,
				end_time,
				location,
				type,
				id,
			]
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: "Event not found" });
		}

		// Notify subscribers about the update
		await notifySubscribers(id, `Event "${title}" has been updated`);

		res.json(result.rows[0]);
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
		// Check if user owns the event
		const eventResult = await client.query(
			"SELECT * FROM events WHERE id = $1 AND created_by = $2",
			[id, req.user.id]
		);
		if (eventResult.rows.length === 0) {
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

// Create announcement
app.post("/events/:id/announcements", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id: eventId } = req.params;
		const { title, message, recipientType, recipientIds } = req.body;
		const userId = req.user.id;

		// Check if user is an admin for this event
		const adminCheck = await client.query(
			`SELECT 1 FROM event_admins 
			WHERE event_id = $1 AND user_id = $2`,
			[eventId, userId]
		);

		if (adminCheck.rows.length === 0) {
			return res.status(403).json({
				error: "Not authorized to create announcements for this event",
			});
		}

		// Start a transaction
		await client.query("BEGIN");

		// Create the announcement
		const announcementResult = await client.query(
			`INSERT INTO announcements (event_id, user_id, title, message)
			VALUES ($1, $2, $3, $4)
			RETURNING *`,
			[eventId, userId, title, message]
		);

		const announcement = announcementResult.rows[0];

		console.log("created_at:", announcement.created_at);
		console.log("Date object:", new Date(announcement.created_at));

		// Get all subscribers for this event
		const subscribersResult = await client.query(
			`SELECT user_id FROM event_subscriptions WHERE event_id = $1`,
			[eventId]
		);

		// Determine recipients
		let recipientUserIds;
		if (
			recipientType === "selected" &&
			Array.isArray(recipientIds) &&
			recipientIds.length > 0
		) {
			recipientUserIds = recipientIds
				.map(Number)
				.filter((id) => id !== userId);
		} else {
			recipientUserIds = subscribersResult.rows
				.map((s) => s.user_id)
				.filter((id) => id !== userId);
		}

		// Filter out any invalid/undefined/null IDs
		recipientUserIds = recipientUserIds.filter(
			(id) => typeof id === "number" && !isNaN(id)
		);

		// Query users table for valid IDs
		let validRecipientUserIds = [];
		if (recipientUserIds.length > 0) {
			const validUsersResult = await client.query(
				"SELECT id FROM users WHERE id = ANY($1)",
				[recipientUserIds]
			);
			validRecipientUserIds = validUsersResult.rows.map((row) => row.id);
		}

		// Log for debugging
		console.log(
			"Valid recipient user IDs for notifications:",
			validRecipientUserIds
		);

		// Create notifications for recipients
		if (validRecipientUserIds.length > 0) {
			const notificationValues = validRecipientUserIds
				.map(
					(uid) =>
						`(${uid}, ${eventId}, ${announcement.id}, 'New announcement: ${title}', false, CURRENT_TIMESTAMP)`
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
