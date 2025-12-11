import mysql from 'mysql2/promise';

let db = null;

export async function initializeDatabase() {
    const DB_NAME = process.env.DB_NAME;

    try {
        // connect to MySQL server (no DB selected)
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        console.log(" MySQL connected (server only)");

        // ensure database exists
        await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);

        // connect to the specific database
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: DB_NAME,
        });

        console.log("📦 Connected to DB:", DB_NAME);

        // create users table if missing
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50),
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL
            );
        `);

        console.log("✔ Users table ready");

        // create todos table only if db connected
        await db.execute(`
            CREATE TABLE IF NOT EXISTS todos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(100) NOT NULL,
                todo_text VARCHAR(255)
            );
        `);
        console.log("📝 Todos table ready");

        return db; // Return the connected database instance

    } catch (err) {
        console.error("FATAL: Database connection or setup error:", err);
        process.exit(1); // Exit if DB connection fails
    }
}

// The 'db' variable is now managed internally or passed. It's not directly exported.
