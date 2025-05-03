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

async function updateSettingsTable() {
	const client = await pool.connect();
	try {
		// Add google_id column if it doesn't exist
		await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'user_settings' 
          AND column_name = 'google_id'
        ) THEN 
          ALTER TABLE user_settings ADD COLUMN google_id VARCHAR(255);
        END IF;
      END $$;
    `);

		// Update existing settings with google_id from users table
		await client.query(`
      UPDATE user_settings us
      SET google_id = u.google_id
      FROM users u
      WHERE us.user_id = u.id
      AND us.google_id IS NULL;
    `);

		// Make google_id unique and not null
		await client.query(`
      ALTER TABLE user_settings 
      ADD CONSTRAINT user_settings_google_id_unique UNIQUE (google_id);
    `);

		console.log("Successfully updated user_settings table");
	} catch (error) {
		console.error("Error updating user_settings table:", error);
	} finally {
		client.release();
		pool.end();
	}
}

updateSettingsTable();
