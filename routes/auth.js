import { Router } from "express";
import bcrypt from "bcryptjs";
// import db from "../db/db.js"; // This line will be removed
import { loginUserSchema, RegisterUserSchema } from "../validators/auth_validate.js";

// Export a function that accepts db as an argument
export default function(dbInstance) {
  const router = Router();

  /* REGISTER PAGE */
  router.get("/register", (req, res) => {
    res.render("register", { error: null, success: null });
  });

  /* LOGIN PAGE */
  router.get("/login", (req, res) => {
    res.render("login", { error: null, message: null });
  });

  /* VIEW ALL USERS (optional) */
  router.get("/all-users", async (req, res) => {
    try {
      if (!dbInstance) return res.json([]); // Use dbInstance
      const [rows] = await dbInstance.execute("SELECT * FROM users"); // Use dbInstance
      res.json(rows || []);
    } catch (err) {
      console.error(err);
      res.json([]);
    }
  });

  /* FORGOT PASSWORD PAGE */
  router.get("/forgot-password", (req, res) => {
    res.render("forgot-password", { error: null });
  });

  /* FORGOT PASSWORD (CHECK EMAIL) */
  router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
      if (!dbInstance) {
        return res.render("forgot-password", { error: "Database connection error" });
      }

      const [rows] = await dbInstance.execute("SELECT * FROM users WHERE email = ?", [email]);

      if (!rows || rows.length === 0) {
        return res.render("forgot-password", { 
          error: "This email is not registered. Please register first." 
        });
      }

      // encode email for safety
      res.redirect(`/reset-password/${encodeURIComponent(email)}`);

    } catch (err) {
      console.error(err);
      res.render("forgot-password", { error: "Something went wrong" });
    }
  });

  /* RESET PASSWORD PAGE */
  router.get("/reset-password/:email", (req, res) => {
    const email = req.params.email ? decodeURIComponent(req.params.email) : "";
    res.render("reset-password", { email, error: null });
  });

  /* RESET PASSWORD (UPDATE DB) */
  router.post("/reset-password", async (req, res) => {
    const { email, password } = req.body;

    try {
      if (!dbInstance) {
        return res.render("reset-password", { email, error: "Database connection error" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await dbInstance.execute(
        "UPDATE users SET password = ? WHERE email = ?",
        [hashedPassword, email]
      );

      res.render("login", { 
        error: null,
        message: "Password has been reset successfully. Please login." 
      });

    } catch (err) {
      console.error(err);
      res.send("Error updating password.");
    }
  });

  /* REGISTER USER */
  router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    // Validate input with Zod
    const result = RegisterUserSchema.safeParse(req.body);

    if (!result.success) {
      const errorMessage = result.error.issues && result.error.issues.length > 0 
        ? result.error.issues[0].message 
        : "Invalid input provided. Please check your fields.";
      return res.render("register", {
        error: errorMessage,
        success: null
      });
    }

    try {
      if (!dbInstance) {
        return res.render("register", { error: "Database connection error", success: null });
      }

      // Check if email already exists
      const [existing] = await dbInstance.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (existing && existing.length > 0) {
        return res.render("register", {
          error: "Email already registered!",
          success: null
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      await dbInstance.execute(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        [username, email, hashedPassword]
      );

      // Fetch user's todos safely (likely none for a new user)
      let todos = [];
      try {
        if (dbInstance) {
          const [rows] = await dbInstance.execute("SELECT * FROM todos WHERE email = ?", [email]);
          todos = rows || [];
        } else {
          todos = [];
        }
      } catch (err) {
        todos = [];
      }

      // Render success page
      return res.render("success", { username, userEmail: email, todos });

    } catch (err) {
      console.error("Registration error:", err);
      return res.status(500).send("Error registering user.");
    }
  });

  /* LOGIN USER */
  router.post("/login", async (req, res) => {
    const result = loginUserSchema.safeParse(req.body);

    if (!result.success) {
      const errorMessage = result.error.issues && result.error.issues.length > 0 
        ? result.error.issues[0].message 
        : "Invalid input provided. Please check your fields.";
      return res.render("login", {
        error: errorMessage,
        message: null
      });
    }

    const { email, password } = req.body;

    if (!email || !password) {
    return res.render("login", {
      error: "Email and password are required.",
      message: null
    });
    }

    try {
      if (!dbInstance) {
        return res.render("login", { error: "Database connection error", message: null });
      }

      const [rows] = await dbInstance.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (!rows || rows.length === 0) {
        return res.render("login", { error: "Email not registered", message: null });
      }

      const user = rows[0];

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.render("login", { error: "Incorrect password", message: null });
      }

      // Fetch todos for this user
      let todos = [];
      try {
        if (dbInstance) {
          const [trows] = await dbInstance.execute("SELECT * FROM todos WHERE email = ?", [user.email]);
          todos = trows || [];
        } else {
          todos = [];
        }
      } catch (err) {
        todos = [];
      }

      // Render success page
      return res.render("success", { username: user.username, userEmail: user.email, todos });

    } catch (err) {
      return res.status(500).send("Error during login.");
    }
  });

  /* ADD TODO ITEM */
  router.post("/add-todo", async (req, res) => {
    const { email, todo } = req.body;

    try {
      if (!dbInstance) {
        return res.status(500).json({ success: false, message: "Database connection error" });
      }

      // 1) Insert new todo
      const [result] = await dbInstance.execute(
        "INSERT INTO todos (email, todo_text) VALUES (?, ?)",
        [email, todo]
      );

      // Get the ID of the newly inserted todo
      const newTodoId = result.insertId; // Access insertId from the result of the execute call

      res.json({ success: true, message: "Todo added successfully", id: newTodoId, todo_text: todo });
    } catch (err) {
      console.error("Add todo error:", err);
      res.status(500).json({ success: false, message: "Error adding todo." });
    }
  });

  /* EDIT TODO ITEM */
  router.post("/edit-todo", async (req, res) => {
    const { id, todo_text } = req.body;

    try {
      if (!dbInstance) {
        return res.status(500).json({ success: false, message: "Database connection error" });
      }

      await dbInstance.execute(
        "UPDATE todos SET todo_text = ? WHERE id = ?",
        [todo_text, id]
      );

      res.json({ success: true, message: "Todo updated successfully" });
    } catch (err) {
      console.error("Edit todo error:", err);
      res.status(500).json({ success: false, message: "Error updating todo." });
    }
  });

  /* DELETE TODO ITEM */
  router.post("/delete-todo", async (req, res) => {
    const { id } = req.body;

    try {
      if (!dbInstance) {
        return res.status(500).json({ success: false, message: "Database connection error" });
      }

      await dbInstance.execute("DELETE FROM todos WHERE id = ?", [id]);

      res.json({ success: true, message: "Todo deleted successfully" });
    } catch (err) {
      console.error("Delete todo error:", err);
      res.status(500).json({ success: false, message: "Error deleting todo." });
    }
  });

  return router;
}
