const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const { Pool } = require("pg");

const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

const app = express();
const hbs = require("hbs");
hbs.registerPartials(path.join(__dirname, "views/partials"));

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



// DB connection
const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "jobtracker",
  port: process.env.DB_PORT || 5432,
});

// 🔽 Your routes (register/login/logout) go here 🔽
// Show login page
app.get("/login", (req, res) => {
    res.render("pages/login");
  });
  
  // Show register page
  app.get("/register", (req, res) => {
    res.render("pages/register");
  });
  // Show home page (only if logged in)
app.get("/", (req, res) => {
    if (!req.session.userId) {
      return res.redirect("/login");
    }
    res.render("pages/home", { userId: req.session.userId });
  });
  
  // Handle registration
  app.post("/register", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send("Missing credentials");
  
    const hashedPassword = await bcrypt.hash(password, 10);
  
    try {
      const result = await db.query(
        "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id",
        [email, hashedPassword]
      );
      req.session.userId = result.rows[0].id;
      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.status(500).send("User registration failed.");
    }
  });
  
  // Handle login
  app.post("/login", async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      const user = result.rows[0];
      if (!user) return res.status(400).send("Invalid credentials");
  
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).send("Invalid credentials");
  
      req.session.userId = user.id;
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
  
// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


