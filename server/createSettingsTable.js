const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
	host: process.env.PGHOST,
	database: process.env.PGDATABASE,
	user: process.env.PGUSER,
	password: process.env.PGPASSWORD,
	port: 5432,
	ssl: {
		rejectUnauthorized: false,
	},
});

async function createSettingsTable() {
	const client = await pool.connect();
	try {
		// Create user_settings table
		await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE,
        event_reminders BOOLEAN DEFAULT true,
        email_notifications BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
		console.log("Successfully created user_settings table");
	} catch (error) {
		console.error("Error creating user_settings table:", error);
	} finally {
		client.release();
		pool.end();
	}
}

createSettingsTable();
