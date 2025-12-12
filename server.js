import dotenv from 'dotenv';
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import getAuthRoutes from "./routes/auth.js"; 
import { fileURLToPath } from "url";
import session from "express-session";
import { initializeDatabase } from "./db/db.js"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");

app.use(session({
  secret: process.env.SESSION_SECRET || "supersecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,       // Prevent JS access
    secure: process.env.NODE_ENV==="production",        // Set true if using HTTPS
    maxAge: 1000 * 60 * 60 // 1 hour
  }
}));

app.use((req, res, next) => {
  res.locals.session = req.session; // makes session available in EJS
  next();
})

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
