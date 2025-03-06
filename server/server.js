const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const cors = require("cors");
const PORT = 3001;
const { Pool } = require("pg");

app.use(cors());
app.use(express.json());

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

app.post("/conferences", async (req, res) => {
	const { title, description, date, time } = req.body;

	if (!title || !date || !time) {
		return res
			.status(400)
			.json({ error: "Title, date, and time are required fields" });
	}

	const client = await pool.connect();

	try {
		const result = await client.query(
			"INSERT INTO conferences (title, description, date, time) VALUES ($1, $2, $3, $4) RETURNING *",
			[title, description, date, time]
		);

		res.status(201).json(result.rows[0]);
	} catch (error) {
		console.error("Error creating conference:", error);
		res.status(500).json({ error: "Internal Server Error" });
	} finally {
		client.release();
	}
});

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
