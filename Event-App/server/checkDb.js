const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: {
		rejectUnauthorized: false,
	},
});

async function checkTables() {
	try {
		const { rows } = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
		console.log("Existing tables:", rows);

		// For each table, get its structure
		for (const row of rows) {
			const { rows: columns } = await pool.query(
				`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = $1
      `,
				[row.table_name]
			);
			console.log(`\nStructure of ${row.table_name}:`, columns);
		}
	} catch (err) {
		console.error("Error:", err);
	} finally {
		await pool.end();
	}
}

checkTables();
