const { Pool } = require("pg");
require("dotenv").config();

console.log("Environment variables:");
console.log("PGHOST:", process.env.PGHOST);
console.log("PGDATABASE:", process.env.PGDATABASE);
console.log("PGUSER:", process.env.PGUSER);
console.log("PGPASSWORD:", process.env.PGPASSWORD ? "***" : "not set");

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

async function updateSettingsTableToUserId() {
	const client = await pool.connect();
	try {
		// Add user_id column if it doesn't exist
		await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'user_settings' 
          AND column_name = 'user_id'
        ) THEN 
          ALTER TABLE user_settings ADD COLUMN user_id INTEGER;
        END IF;
      END $$;
    `);

		// Add timezone column if it doesn't exist
		await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'user_settings' 
          AND column_name = 'timezone'
        ) THEN 
          ALTER TABLE user_settings ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/New_York';
        END IF;
      END $$;
    `);

		// Update existing settings with user_id from users table
		await client.query(`
      UPDATE user_settings us
      SET user_id = u.id
      FROM users u
      WHERE us.google_id = u.google_id
      AND us.user_id IS NULL;
    `);

		// Make user_id unique and not null
		await client.query(`
      ALTER TABLE user_settings 
      ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);
    `);

		console.log(
			"Successfully updated user_settings table to use user_id and added timezone support"
		);
	} catch (error) {
		console.error("Error updating user_settings table:", error);
	} finally {
		client.release();
		pool.end();
	}
}

updateSettingsTableToUserId();
