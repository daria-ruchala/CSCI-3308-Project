const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const { Pool } = require("pg");
const exphbs = require("express-handlebars");

const app = express();

// -------------------- View Engine Setup --------------------
app.engine("hbs", exphbs.engine({
  extname: "hbs",
  defaultLayout: "main",
  layoutsDir: path.join(__dirname, "views/layouts"),
  partialsDir: path.join(__dirname, "views/partials"),
}));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// -------------------- Middleware --------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "supersecretkey",
  resave: false,
  saveUninitialized: true,
}));

app.use(express.static(path.join(__dirname, "public")));
app.use('/static', express.static(path.join(__dirname, 'recources')));

// -------------------- DB Connection --------------------
const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "jobtracker",
  port: process.env.DB_PORT || 5432,
});

// -------------------- Test Routes --------------------
app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});

app.get('/test', (req, res) => {
  res.redirect('/login');
});

// -------------------- Page Routes --------------------
app.get("/login", (req, res) => {
  res.render("pages/login");
});

app.get("/register", (req, res) => {
  res.render("pages/register");
});

app.get("/", async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  try {
    const result = await db.query("SELECT first_name FROM users WHERE id = $1", [req.session.userId]);
    const user = result.rows[0];
    res.render("pages/home", { first_name: user.first_name });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load home page.");
  }
});

app.get('/profile', async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  try {
    const result = await db.query("SELECT first_name, email FROM users WHERE id = $1", [req.session.userId]);
    const user = result.rows[0];

    if (!user) return res.status(404).send("User not found.");

    res.render("pages/profile", {
      first_name: user.first_name,
      email: user.email
    });
  } catch (err) {
    console.error("Profile route error:", err);
    res.status(500).send("Failed to load profile page.");
  }
});

app.get('/pin/new', (req, res) => {
  res.render('pages/newPin');
});

app.get('/friends/add', (req, res) => {
  res.render('pages/addFriend');
});

// -------------------- Auth Routes --------------------
app.post("/register", async (req, res) => {
  const { first_name, email, password } = req.body;

  if (!first_name || !email || !password) {
    return res.status(400).send("Missing registration fields");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (first_name, email, password) VALUES ($1, $2, $3) RETURNING id",
      [first_name, email, hashedPassword]
    );

    req.session.userId = result.rows[0].id;
    res.redirect("/");
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).send("Registration failed.");
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).send("Invalid credentials");
    }

    req.session.userId = user.id;
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Login failed.");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// -------------------- Server Start --------------------
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
} else {
  module.exports = app; // for testing
}
