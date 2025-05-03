const { Pool } = require("pg");
const dotenv = require("dotenv").config();

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

async function addGoogleIdColumn() {
	const client = await pool.connect();
	try {
		// Check if google_id column exists
		const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'google_id'
      );
    `);

		if (!columnCheck.rows[0].exists) {
			console.log("Adding google_id column to users table...");
			await client.query(`
        ALTER TABLE users 
        ADD COLUMN google_id VARCHAR(255) UNIQUE;
      `);
			console.log("google_id column added successfully.");
		} else {
			console.log("google_id column already exists.");
		}
	} catch (error) {
		console.error("Error adding google_id column:", error);
	} finally {
		client.release();
		pool.end();
	}
}

addGoogleIdColumn();
