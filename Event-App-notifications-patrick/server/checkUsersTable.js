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

async function checkUsersTable() {
	const client = await pool.connect();
	try {
		// Check if users table exists
		const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

		if (!tableCheck.rows[0].exists) {
			console.log("Users table does not exist. Creating it...");
			await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255),
          email VARCHAR(255) UNIQUE NOT NULL,
          picture VARCHAR(255),
          google_id VARCHAR(255) UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
			console.log("Users table created successfully.");
		} else {
			console.log("Users table exists. Checking structure...");
			const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users';
      `);
			console.log("Table structure:");
			columns.rows.forEach((col) => {
				console.log(
					`${col.column_name}: ${col.data_type} (${
						col.is_nullable === "YES" ? "nullable" : "not null"
					})`
				);
			});
		}
	} catch (error) {
		console.error("Error checking users table:", error);
	} finally {
		client.release();
		pool.end();
	}
}

checkUsersTable();
