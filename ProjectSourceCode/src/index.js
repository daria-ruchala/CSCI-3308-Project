const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const { Pool } = require("pg");
const exphbs = require("express-handlebars");
const app = express();
// const hbs = handlebars.create({
//   extname: 'hbs',
//   layoutsDir: __dirname + '/views/layouts',
//   partialsDir: __dirname + '/views/partials',
// });
app.engine("hbs", exphbs.engine({
    extname: "hbs",
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "views/layouts"),
    partialsDir: path.join(__dirname, "views/partials")
  }));
  
  app.set("view engine", "hbs");
  app.set("views", path.join(__dirname, "views"));


//hbs.registerPartials(path.join(__dirname, "views/partials"));

// Parse body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || "supersecretkey",
  resave: false,
  saveUninitialized: true,
}));

// View engine
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use('/static', express.static(path.join(__dirname, 'recources')));





// DB connection
const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "jobtracker",
  port: process.env.DB_PORT || 5432,
});
//Your routes (register/login/logout) go here 
// Show login page
app.get("/login", (req, res) => {
    res.render("pages/login");
  });
  
  // Show register page
  app.get("/register", (req, res) => {
    res.render("pages/register");
  });

  // Show home page (only if logged in)
  app.get("/", async (req, res) => {
    if (!req.session.userId) {
      return res.redirect("/login");
    }
  
    try {
      const result = await db.query("SELECT first_name FROM users WHERE id = $1", [req.session.userId]);
      const user = result.rows[0];
  
      res.render("pages/home", {
        first_name: user.first_name
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Failed to load home page.");
    }
  });
  
  // Handle registration
  
  app.post("/register", async (req, res) => {
    const { first_name, email, password } = req.body;
  
    if (!first_name || !email || !password) {
      return res.render("pages/register", {
        error: "All fields are required.",
      });
    }
  
    try {
      const existing = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      if (existing.rows.length > 0) {
        return res.render("pages/register", {
          error: "An account with that email already exists.",
        });
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const result = await db.query(
        "INSERT INTO users (first_name, email, password) VALUES ($1, $2, $3) RETURNING id",
        [first_name, email, hashedPassword]
      );
  
      req.session.userId = result.rows[0].id;
      res.redirect("/");
    } catch (err) {
      console.error("Registration error:", err);
      res.render("pages/register", {
        error: "Registration failed. Please try again.",
      });
    }
  });
  
  
  // Handle login
  app.post("/login", async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      const user = result.rows[0];
  
      if (!user) {
        return res.render("pages/login", { error: "No account found with that email." });
      }
  
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.render("pages/login", { error: "Incorrect password." });
      }
  
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.first_name = user.first_name;
      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.status(500).send("Login failed.");
    }
  });
  
  // Handle logout
  app.get("/logout", (req, res) => {
    req.session.destroy(() => {
      res.redirect("/login");
    });
  });

  // -------------------------------------  ROUTES for logout.hbs   ----------------------------------------------

app.get('/logout', (req, res) => {
  req.session.destroy(function(err) {
    res.render('pages/logout');
  });
});
app.get("/", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {
    const result = await db.query("SELECT first_name FROM users WHERE id = $1", [req.session.userId]);
    const user = result.rows[0];

    res.render("pages/home", {
      first_name: user.first_name
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load home page.");
  }
});
  
  // -------------------------------------  ROUTES for profile.hbs   ----------------------------------------------
  app.get('/profile', async (req, res) => {
    if (!req.session.userId) {
      return res.redirect("/login");
  }

  try {
    const result = await db.query("SELECT first_name, email FROM users WHERE id = $1", [req.session.userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).send("User not found.");
    }

    res.render("pages/profile", {
      first_name: user.first_name,
      email: user.email
    });
  } catch (err) {
    console.error(" Profile route error:", err);
    res.status(500).send("Failed to load profile page.");
  }
});

  // -------------------------------------  ROUTES for editProfile.hbs   ----------------------------------------------

app.get('/editProfile', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
}
try {
  const result = await db.query("SELECT first_name, email, password FROM users WHERE id = $1", [req.session.userId]);
  const user = result.rows[0];

  if (!user) {
    return res.status(404).send("User not found.");
  }

  res.render("pages/editProfile", {
    first_name: user.first_name,
    email: user.email,
    password: user.password
  });
} catch (err) {
  console.error(" Profile route error:", err);
  res.status(500).send("Failed to load profile page.");
}
})

app.post("/editProfile", async (req, res) => {
  try {
    console.log("Received form data:", req.body); // Log incoming data

    const { firstName, password, email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required!" });
    }

    let query = "UPDATE users SET";
    let values = [];
    let index = 1;

    if (firstName) {
      query += ` first_name = $${index},`;
      values.push(firstName);
      index++;
    }
    if (password) {
      // **Hash new password before storing it**
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ` password = $${index},`;
      values.push(hashedPassword);
      index++;
    }

    query = query.replace(/,$/, " WHERE email = $" + index);
    values.push(email);

    console.log("Executing query:", query, values); // Log SQL query before running

    await db.query(query, values);

    res.redirect("/profile"); // Redirect after successful update
  } catch (error) {
    console.error("Detailed error log:", error); // Log full error details
    res.status(500).json({ message: "Failed to update profile.", error: error.message });
  }
});

app.post("/deleteAccount", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!password || !email) {
      return res.status(400).json({ message: "Missing password or email." });
    }

    // Retrieve stored hashed password
    const result = await db.query("SELECT password FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const storedHashedPassword = result.rows[0].password;
    const isMatch = await bcrypt.compare(password, storedHashedPassword);

    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    // Password is correct → Delete account
    await db.query("DELETE FROM users WHERE email = $1", [email]);

    // Destroy session and redirect user to registration page
    req.session.destroy(() => {
      res.redirect("/login");
    });

  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Server error." });
  }
});

const uploadedData = [];

// Routes
// New pin page with image form
app.get("/pin/new", (req, res) => {
  res.render("pages/newPin", { uploads: uploadedData });
});

// Handle upload from pin page
// app.post("/pin/upload", upload.single("image"), (req, res) => {
//   const imagePath = "/uploads/" + req.file.filename;
//   const comment = req.body.comment || "";

//   uploadedData.push({ imagePath, comment });
//   res.redirect("/pin/new");
// });

  app.get('/pin/new', (req, res) => {
    res.render('pages/newPin');
  });
  
  app.get('/friends/add', (req, res) => {
    res.render('pages/friends');
  });
  
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});