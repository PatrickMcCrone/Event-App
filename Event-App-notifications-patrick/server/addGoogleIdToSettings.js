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

async function addGoogleIdToSettings() {
	const client = await pool.connect();
	try {
		// Check if google_id column exists
		const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_settings' 
      AND column_name = 'google_id'
    `);

		if (checkResult.rows.length === 0) {
			console.log("Adding google_id column to user_settings table...");
			await client.query(`
        ALTER TABLE user_settings 
        ADD COLUMN google_id VARCHAR(255) UNIQUE
      `);
			console.log("Successfully added google_id column");
		} else {
			console.log("google_id column already exists");
		}
	} catch (error) {
		console.error("Error adding google_id column:", error);
	} finally {
		client.release();
		pool.end();
	}
}

addGoogleIdToSettings();
