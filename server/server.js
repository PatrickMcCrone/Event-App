const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const cors = require("cors");
const PORT = 3001;
const { Pool } = require("pg");
const jwt = require("jsonwebtoken");

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
const verifyJWT = (req, res, next) => {
	const token = req.headers.authorization?.split(" ")[1];
	if (!token) {
		return res.status(401).json({ error: "No token provided" });
	}
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		req.user = decoded;
		next();
	} catch (error) {
		return res.status(401).json({ error: "Invalid token" });
	}
};

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

// Subscribe to a conference
app.post("/conferences/:id/subscribe", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id: conferenceId } = req.params;
		const userId = req.user.id;

		// Check if conference exists
		const conferenceResult = await client.query(
			"SELECT * FROM conferences WHERE id = $1",
			[conferenceId]
		);
		if (conferenceResult.rows.length === 0) {
			return res.status(404).json({ error: "Conference not found" });
		}

		// Create subscription
		await client.query(
			"INSERT INTO event_subscriptions (user_id, conference_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
			[userId, conferenceId]
		);

		res.json({ message: "Subscribed successfully" });
	} catch (error) {
		console.error("Error subscribing:", error);
		res.status(500).json({ error: "Failed to subscribe" });
	} finally {
		client.release();
	}
});

// Unsubscribe from a conference
app.delete("/conferences/:id/subscribe", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id: conferenceId } = req.params;
		const userId = req.user.id;

		await client.query(
			"DELETE FROM event_subscriptions WHERE user_id = $1 AND conference_id = $2",
			[userId, conferenceId]
		);

		res.json({ message: "Unsubscribed successfully" });
	} catch (error) {
		console.error("Error unsubscribing:", error);
		res.status(500).json({ error: "Failed to unsubscribe" });
	} finally {
		client.release();
	}
});

// Get user's notifications
app.get("/notifications", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const userId = req.user.id;

		const result = await client.query(
			`SELECT n.*, c.title as conference_title 
			 FROM notifications n 
			 JOIN conferences c ON n.conference_id = c.id 
			 WHERE n.user_id = $1 
			 ORDER BY n.created_at DESC`,
			[userId]
		);

		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching notifications:", error);
		res.status(500).json({ error: "Failed to fetch notifications" });
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

		await client.query(
			"UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2",
			[notificationId, userId]
		);

		res.json({ message: "Notification marked as read" });
	} catch (error) {
		console.error("Error marking notification as read:", error);
		res.status(500).json({ error: "Failed to mark notification as read" });
	} finally {
		client.release();
	}
});

// Helper function to create notifications for subscribers
async function notifySubscribers(conferenceId, message) {
	const client = await pool.connect();
	try {
		const subscribers = await client.query(
			"SELECT user_id FROM event_subscriptions WHERE conference_id = $1",
			[conferenceId]
		);

		for (const subscriber of subscribers.rows) {
			await client.query(
				"INSERT INTO notifications (user_id, conference_id, message) VALUES ($1, $2, $3)",
				[subscriber.user_id, conferenceId, message]
			);
		}
	} catch (error) {
		console.error("Error notifying subscribers:", error);
	} finally {
		client.release();
	}
}

// Update conference endpoint - now with notifications
app.put("/conferences/:id", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id } = req.params;
		const { title, description, date, time, location } = req.body;
		const userId = req.user.id;

		// Check if user owns the conference
		const conferenceResult = await client.query(
			"SELECT * FROM conferences WHERE id = $1 AND user_id = $2",
			[id, userId]
		);
		if (conferenceResult.rows.length === 0) {
			return res
				.status(403)
				.json({ error: "Not authorized to update this conference" });
		}

		// Update conference
		await client.query(
			`UPDATE conferences 
			 SET title = $1, description = $2, date = $3, time = $4, location = $5, updated_at = CURRENT_TIMESTAMP
			 WHERE id = $6`,
			[title, description, date, time, location, id]
		);

		// Notify subscribers about the update
		await notifySubscribers(id, `Conference "${title}" has been updated`);

		res.json({ message: "Conference updated successfully" });
	} catch (error) {
		console.error("Error updating conference:", error);
		res.status(500).json({ error: "Failed to update conference" });
	} finally {
		client.release();
	}
});

// Check subscription status
app.get("/conferences/:id/subscription", verifyJWT, async (req, res) => {
	const client = await pool.connect();
	try {
		const { id: conferenceId } = req.params;
		const userId = req.user.id;

		const result = await client.query(
			"SELECT * FROM event_subscriptions WHERE user_id = $1 AND conference_id = $2",
			[userId, conferenceId]
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
app.get("/settings/reminders/:googleId", async (req, res) => {
	const client = await pool.connect();
	try {
		const { googleId } = req.params;
		console.log("Fetching settings for Google ID:", googleId);

		// Get user settings directly using google_id
		const settingsResult = await client.query(
			"SELECT * FROM user_settings WHERE google_id = $1",
			[googleId]
		);

		if (settingsResult.rows.length === 0) {
			console.log("No settings found for Google ID:", googleId);
			// Return default settings if none exist
			res.json({
				eventReminders: true,
				emailNotifications: true,
			});
		} else {
			console.log("Found existing settings for Google ID:", googleId);
			// Return existing settings
			const settings = settingsResult.rows[0];
			res.json({
				eventReminders: settings.event_reminders,
				emailNotifications: settings.email_notifications,
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
		const { googleId, eventReminders, emailNotifications } = req.body;
		console.log("Saving settings for Google ID:", googleId);

		// Check if settings exist for this google_id
		const settingsResult = await client.query(
			"SELECT * FROM user_settings WHERE google_id = $1",
			[googleId]
		);

		if (settingsResult.rows.length === 0) {
			console.log("Creating new settings for Google ID:", googleId);
			// Insert new settings
			await client.query(
				"INSERT INTO user_settings (google_id, event_reminders, email_notifications) VALUES ($1, $2, $3)",
				[googleId, eventReminders, emailNotifications]
			);
		} else {
			console.log("Updating existing settings for Google ID:", googleId);
			// Update existing settings
			await client.query(
				"UPDATE user_settings SET event_reminders = $1, email_notifications = $2, updated_at = CURRENT_TIMESTAMP WHERE google_id = $3",
				[eventReminders, emailNotifications, googleId]
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
			`SELECT es.*, c.title, c.description, c.date, c.location 
			 FROM event_subscriptions es
			 JOIN conferences c ON es.conference_id = c.id
			 WHERE es.user_id = $1`,
			[userId]
		);

		res.json(result.rows);
	} catch (error) {
		console.error("Error fetching subscriptions:", error);
		res.status(500).json({ error: "Failed to fetch subscriptions" });
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
				role VARCHAR(50) DEFAULT 'user',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// ... rest of the initialization code ...
	} catch (error) {
		console.error("Error initializing database:", error);
	} finally {
		client.release();
	}
}

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
