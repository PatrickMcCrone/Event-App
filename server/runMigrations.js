const { Pool } = require("pg");
const fs = require("fs").promises;
require("dotenv").config();

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false,
	},
});

async function runMigrations() {
	try {
		// Read the SQL file
		const sql = await fs.readFile("migrations.sql", "utf8");

		// Run the SQL commands
		await pool.query(sql);
		console.log("Migrations completed successfully");

		// Verify the new tables exist
		const { rows } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('event_subscriptions', 'notifications')
    `);
		console.log("New tables created:", rows);
	} catch (err) {
		console.error("Error running migrations:", err);
	} finally {
		await pool.end();
	}
}

runMigrations();
