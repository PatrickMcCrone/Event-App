const express = require("express");
const app = express();
const dotenv = require("dotenv").config();
const cors = require("cors");
const { Pool } = require("pg");

app.use(cors());
app.use(express.json());

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

// Connection data stuff for Neon DB. This will be changed to whatever is handed to us by
// DB guys when they pick a DB service to use and set up the actual DB that we will query
const pool = new Pool({
	host: PGHOST,
	database: PGDATABASE,
	username: PGUSER,
	password: PGPASSWORD,
	port: 5432,
	ssl: {
		require: true,
	},
});

// This GET request will simply display a message in the browser
// To run the API without errors, you need to cd (like in Systems Programming class) into the server folder and run "npm run dev" in the terminal
// To test this, go to http://localhost:5000/ in your browser after launching the API
// To shut down the API, you can press Ctrl+C in the terminal
app.get("/", (req, res) => {
	res.send("This is the start of the Event App!");
});

// This GET request will query the sample Neon DB for conferences and display them in the browser
// To run the API without errors, you need to cd (like in Systems Programming class) into the server folder and run "npm run dev" in the terminal
// To test this, go to http://localhost:5000/conferences in your browser after launching the API
// To shut down the API, you can press Ctrl+C in the terminal
app.get("/conferences", async (req, res) => {
	const client = await pool.connect();

	try {
		// Here is the actual query line below this comment. If you want to change the query, you can do so here,
		// but there really isn't much to query besides "select *" because I only have 5 records in the conferences table"
		const result = await client.query("SELECT * FROM conferences");
		res.json(result.rows);
	} catch (error) {
		console.error(error);
	} finally {
		client.release();
	}

	res.status(404);
});

// This listen command is just a success message to let you know the server is running
// It will display in the terminal after you run "npm run dev" in the server folder
app.listen(5000, () => {
	console.log("Server is running on port 5000");
});
