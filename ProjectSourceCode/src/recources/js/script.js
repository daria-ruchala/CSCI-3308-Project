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

function generateFriendCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 3) code += '-';
  }
  return code;
}

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
    const result = await db.query("SELECT first_name, email, friend_code FROM users WHERE id = $1", [req.session.userId]);
    const user = result.rows[0];

    if (!user) return res.status(404).send("User not found.");

    res.render("pages/profile", {
      first_name: user.first_name,
      email: user.email,
      friend_code: user.friend_code

    });

  } catch (err) {
    console.error("Profile route error:", err);
    res.status(500).send("Failed to load profile page.");
  }
});

app.get('/pin/new', (req, res) => {
  res.render('pages/newPin');
});

// -------------------- Friends API --------------------
app.get("/friends", async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  try {
    const result = await db.query("SELECT first_name FROM users WHERE id = $1", [req.session.userId]);
    const user = result.rows[0];
    res.render("pages/friends", { first_name: user.first_name });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load friends page.");
  }
});

app.get('/api/friends', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const result = await db.query(`
      SELECT u.first_name AS username
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = $1
    `, [req.session.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching friends:", err);
    res.status(500).json({ message: "Failed to load friends" });
  }
});

app.post('/api/add-friend', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

  const { friendCode } = req.body;

  try {
    const friendResult = await db.query(
      'SELECT id, first_name FROM users WHERE friend_code = $1',
      [friendCode]
    );

    if (friendResult.rows.length === 0) {
      return res.status(404).json({ message: 'Friend code not found.' });
    }

    const friendId = friendResult.rows[0].id;
    const friendName = friendResult.rows[0].first_name;
    const userId = req.session.userId;

    if (friendId === userId) {
      return res.status(400).json({ message: 'You cannot add yourself.' });
    }

    const exists = await db.query(
      'SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2',
      [userId, friendId]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ message: 'Already friends.' });
    }

    await db.query(
      'INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)',
      [userId, friendId]
    );

    res.json({ username: friendName });
  } catch (err) {
    console.error("Add friend error:", err);
    res.status(500).json({ message: "Error adding friend" });
  }
});


// -------------------- Auth Routes --------------------
app.post("/register", async (req, res) => {
  const { first_name, email, password } = req.body;
  const friend_code = generateFriendCode();
  
  if (!first_name || !email || !password) {
    return res.status(400).send("Missing registration fields");
    


  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (first_name, email, password, friend_code) VALUES ($1, $2, $3, $4) RETURNING id",
      [first_name, email, hashedPassword, friend_code]
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