import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import getAuthRoutes from "./routes/auth.js"; // Corrected import name
import { fileURLToPath } from "url";
import { initializeDatabase } from "./db/db.js"; // Corrected import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

// Initialize database and start server
async function startServer() {
  const dbInstance = await initializeDatabase(); // Call initializeDatabase

  // Pass the db instance to routes
  app.use("/", getAuthRoutes(dbInstance)); // Pass dbInstance to the function

  app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
  });
}

startServer();
