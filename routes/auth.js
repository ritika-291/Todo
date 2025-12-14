import { Router } from "express";
import bcrypt from "bcryptjs";
import { loginUserSchema, RegisterUserSchema } from "../validators/auth_validate.js";
import { createAcessToken } from "../utils/jwt.js";
import requireAuth from "../middleware/requireAuth.js";
import { generateCode } from "../utils/generateCode.js";
import { sendVerificationEmail } from "../utils/sendEmail.js";

export default function (dbInstance) {
  const router = Router();

  /* REGISTER PAGE */
  router.get("/register", (req, res) => {
    res.render("register", { error: null, success: null });
  });

  /* LOGIN PAGE */
  router.get("/login", (req, res) => {
    res.render("login", { error: null, message: null });
  });

  /* LOGOUT */
  router.get("/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/login");
    });
  });

  /* FORGOT PASSWORD PAGE */
  router.get("/forgot-password", (req, res) => {
    res.render("forgot-password", { error: null });
  });

  /* FORGOT PASSWORD → CHECK EMAIL */
  router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
      const [rows] = await dbInstance.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (!rows || rows.length === 0) {
        return res.render("forgot-password", {
          error: "This email is not registered."
        });
      }

      res.redirect(`/reset-password/${encodeURIComponent(email)}`);
    } catch (err) {
      console.error(err);
      res.render("forgot-password", { error: "Something went wrong" });
    }
  });

  /* RESET PASSWORD PAGE */
  router.get("/reset-password/:email", (req, res) => {
    const email = decodeURIComponent(req.params.email);
    res.render("reset-password", { email, error: null });
  });

/* profile page */

router.get("/profile",requireAuth,async(req, res)=>{
  const email=req.session.user.email;

  const [todos] =await dbInstance.execute(
    "SELECT * FROM todos WHERE email = ?",
    [email]
  );

  const totalTodos = todos.length;

  //last active(fake)
  const lastActive = totalTodos > 0? "today":"no activity";

  res.render("profile",{
    username:req.session.user.username,
    email,
    memberSince:"2025",
    totalTodos,
    lastActive,
    isVerified: req.session.user.is_verified 
  })

});

/* verify email */
router.get("/verify-email", requireAuth, (req, res) => {
  res.render("verify-email", {
    email: req.session.user.email,
    message: null,
    error: null
  });
});


/* edit profile */
router.get("/edit-profile", requireAuth, (req, res) => {
  res.render("edit-profile", {
    username: req.session.user.username,
    email: req.session.user.email,
    error: null,
    success: null
  });
});



/* edit post*/
router.post("/edit-profile", requireAuth, async (req, res) => {
  const { username } = req.body;
  const email = req.session.user.email;  // constant

  try {
    // Update only username
    await dbInstance.execute(
      "UPDATE users SET username = ? WHERE email = ?",
      [username, email]
    );

    req.session.user.username = username; // update session

    return res.render("edit-profile", {
      username,
      email,
      error: null,
      success: "Profile updated successfully!"
    });

  } catch (err) {
    console.error(err);
    return res.render("edit-profile", {
      username,
      email,
      error: "Error updating profile.",
      success: null
    });
  }
});

/* verify email → send code */
router.post("/resend-code", requireAuth, async (req, res) => {
  const email = req.session.user.email;
  const code = generateCode();

  await dbInstance.execute(
    "UPDATE users SET verification_code = ? WHERE email = ?",
    [code, email]
  );

  await sendVerificationEmail(email, code);

  res.render("verify-email", {
    email,
    message: "Verification link sent!",
    error: null
  });
});

router.post("/verify-code", requireAuth, async (req, res) => {
  const email = req.session.user.email;
  const { code } = req.body;

  const [rows] = await dbInstance.execute(
    "SELECT verification_code FROM users WHERE email = ?",
    [email]
  );

  if (!rows.length || rows[0].verification_code !== code) {
    return res.render("verify-email", {
      email,
      message: null,
      error: "Invalid verification code."
    });
  }

  // success
  await dbInstance.execute(
    "UPDATE users SET is_verified = 1, verification_code = NULL WHERE email = ?",
    [email]
  );

  req.session.user.is_verified = true;

  return res.render("verify-email", {
    email,
    message: "Your email has been verified!",
    error: null
  });
});


  /* RESET PASSWORD → UPDATE DB */
  router.post("/reset-password", async (req, res) => {
    const { email, password } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      await dbInstance.execute(
        "UPDATE users SET password = ? WHERE email = ?",
        [hashedPassword, email]
      );

      res.render("login", {
        error: null,
        message: "Password updated successfully. Please login."
      });
    } catch (err) {
      console.error(err);
      res.send("Error updating password.");
    }
  });

  /* REGISTER USER */
  router.post("/register", async (req, res) => {
    const { username, email, password } = req.body;

    const result = RegisterUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.render("register", {
        error: result.error.issues?.[0]?.message || "Invalid input",
        success: null
      });
    }

    try {
      const [existing] = await dbInstance.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (existing.length > 0) {
        return res.render("register", {
          error: "Email is already registered!",
          success: null
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await dbInstance.execute(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
        [username, email, hashedPassword]
      );

      res.render("login", {
        error: null,
        message: "Registration successful! Please login."
      });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).send("Error registering user.");
    }
  });

  /* LOGIN USER */
  router.post("/login", async (req, res) => {
    const result = loginUserSchema.safeParse(req.body);

    if (!result.success) {
      return res.render("login", {
        error: result.error.issues?.[0]?.message || "Invalid input",
        message: null
      });
    }

    const { email, password } = req.body;

    try {
      const [rows] = await dbInstance.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (!rows || rows.length === 0) {
        return res.render("login", { error: "Email does not exist", message: null });
      }

      const user = rows[0];

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.render("login", { error: "Incorrect password", message: null });
      }

      // ⭐ HYBRID AUTH STEP ⭐
      const token = createAcessToken(user);

      req.session.user = {
        email: user.email,
        username: user.username,
        is_verified: user.is_verified,
        token
      };

      return res.redirect("/success");
    } catch (err) {
      console.error(err);
      res.status(500).send("Login error");
    }
  });

  /* PROTECTED SUCCESS DASHBOARD */
  router.get("/success", requireAuth, async (req, res) => {
    const email = req.session.user.email;

    const [todos] = await dbInstance.execute(
      "SELECT * FROM todos WHERE email = ?",
      [email]
    );

    res.render("success", {
      username: req.session.user.username,
      userEmail: email,
      todos
    });
  });

  /* ADD TODO */
  router.post("/add-todo", requireAuth, async (req, res) => {
    const email = req.session.user.email;
    const { todo } = req.body;

    try {
      const [result] = await dbInstance.execute(
        "INSERT INTO todos (email, todo_text) VALUES (?, ?)",
        [email, todo]
      );

      res.json({
        success: true,
        id: result.insertId,
        todo_text: todo
      });
    } catch (err) {
      console.error("Add todo error:", err);
      res.status(500).json({ success: false });
    }
  });

  /* EDIT TODO */
  router.post("/edit-todo", requireAuth, async (req, res) => {
    const { id, todo_text } = req.body;

    try {
      await dbInstance.execute(
        "UPDATE todos SET todo_text = ? WHERE id = ?",
        [todo_text, id]
      );

      res.json({ success: true });
    } catch (err) {
      console.error("Edit todo error:", err);
      res.status(500).json({ success: false });
    }
  });

  /* DELETE TODO */
  router.post("/delete-todo", requireAuth, async (req, res) => {
    const { id } = req.body;

    try {
      await dbInstance.execute("DELETE FROM todos WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete todo error:", err);
      res.status(500).json({ success: false });
    }
  });

  return router;
}
