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

async function createUser() {
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
			// Create users table if it doesn't exist
			await client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
			console.log("Users table created");
		}

		// Check if user already exists
		const userCheck = await client.query(
			"SELECT * FROM users WHERE email = $1",
			["admin@example.com"]
		);

		if (userCheck.rows.length === 0) {
			// Insert a new user
			await client.query(
				"INSERT INTO users (name, email, password) VALUES ($1, $2, $3)",
				["Admin", "admin@example.com", "password123"]
			);
			console.log("User created successfully");
		} else {
			console.log("User already exists");
		}
	} catch (error) {
		console.error("Error creating user:", error);
	} finally {
		client.release();
		pool.end();
	}
}

createUser();
