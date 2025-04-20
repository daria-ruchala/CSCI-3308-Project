const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const { Pool } = require("pg");
const exphbs = require("express-handlebars");
const multer = require("multer");

const app = express();

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/static', express.static(path.join(__dirname, 'recources')));

// View engine setup
app.engine("hbs", exphbs.engine({
  extname: "hbs",
  defaultLayout: "main",
  layoutsDir: path.join(__dirname, "views/layouts"),
  partialsDir: path.join(__dirname, "views/partials")
}));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || "supersecretkey",
  resave: false,
  saveUninitialized: true,
}));

// Local variables middleware
app.use((req, res, next) => {
  res.locals.first_name = req.session.first_name;
  res.locals.email = req.session.email;
  next();
});

// Database connection
const db = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
});

// Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only images are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

//to match comments with images
const hbs = exphbs.create({
  extname: "hbs",
  defaultLayout: "main",
  layoutsDir: path.join(__dirname, "views/layouts"),
  partialsDir: path.join(__dirname, "views/partials"),
  helpers: {
    eq: (a, b) => a === b
  }
});
app.engine("hbs", hbs.engine);

// Utility
function generateFriendCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i === 3) code += '-';
  }
  return code;
}

// Routes

// Auth pages
app.get("/login", (req, res) => {
  res.render("pages/login");
});

app.get("/register", (req, res) => {
  res.render("pages/register");
});

app.post("/register", async (req, res) => {
  const { first_name, email, password } = req.body;
  const friend_code = generateFriendCode();

  if (!first_name || !email || !password) {
    return res.render("pages/register", { error: "All fields are required." });
  }

  try {
    const existing = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.render("pages/register", { error: "An account with that email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (first_name, email, password, friend_code) VALUES ($1, $2, $3, $4) RETURNING id",
      [first_name, email, hashedPassword, friend_code]
    );

    req.session.userId = result.rows[0].id;
    res.redirect("/");
  } catch (err) {
    console.error("Registration error:", err);
    res.render("pages/register", { error: "Registration failed. Please try again." });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user) return res.render("pages/login", { error: "No account found with that email." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.render("pages/login", { error: "Incorrect password." });

    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.first_name = user.first_name;
    req.session.friend_code = user.friend_code;

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

// Home
app.get("/", async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  try {
    const userResult = await db.query("SELECT first_name FROM users WHERE id = $1", [req.session.userId]);
    const friendsResult = await db.query(`
      SELECT u.id, u.first_name
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = $1
    `, [req.session.userId]);

    res.render("pages/home", {
      first_name: userResult.rows[0].first_name,
      userId: req.session.userId,
      friends: friendsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load home page.");
  }
});

// Friends
app.get("/friends", async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  try {
    const result = await db.query("SELECT first_name FROM users WHERE id = $1", [req.session.userId]);
    res.render("pages/friends", { first_name: result.rows[0].first_name });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load friends page.");
  }
});

app.get('/friends-list', async (req, res) => {
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

app.post('/add-friend', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'Unauthorized' });

  const { friendCode } = req.body;

  try {
    const friendResult = await db.query('SELECT id, first_name FROM users WHERE friend_code = $1', [friendCode]);
    if (friendResult.rows.length === 0) return res.status(404).json({ message: 'Friend code not found.' });

    const friendId = friendResult.rows[0].id;
    const userId = req.session.userId;

    if (friendId === userId) return res.status(400).json({ message: 'You cannot add yourself.' });

    const exists = await db.query('SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2', [userId, friendId]);
    if (exists.rows.length > 0) return res.status(400).json({ message: 'Already friends.' });

    await db.query('INSERT INTO friends (user_id, friend_id) VALUES ($1, $2)', [userId, friendId]);
    res.json({ username: friendResult.rows[0].first_name });
  } catch (err) {
    console.error("Add friend error:", err);
    res.status(500).json({ message: "Error adding friend" });
  }
});

// Profile
app.get('/profile', async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");

  try {
    const result = await db.query("SELECT first_name, email, friend_code FROM users WHERE id = $1", [req.session.userId]);
    res.render("pages/profile", result.rows[0]);
  } catch (err) {
    console.error("Profile route error:", err);
    res.status(500).send("Failed to load profile page.");
  }
});

// Pins
app.get("/api/pins", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await db.query("SELECT * FROM pins WHERE user_id = $1", [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error loading pins:", err);
    res.status(500).json({ error: "Failed to load pins." });
  }
});

app.post("/api/pins", async (req, res) => {
  const { latitude, longitude, label } = req.body;
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await db.query(
      "INSERT INTO pins (latitude, longitude, label, user_id) VALUES ($1, $2, $3, $4) RETURNING id",
      [latitude, longitude, label || "New Pin", userId]
    );
    res.json({ id: result.rows[0].id });
  } catch (err) {
    console.error("Error saving pin:", err);
    res.status(500).json({ error: "Failed to save pin." });
  }
});

app.get("/api/all-pins", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const result = await db.query(`
      SELECT p.*, u.first_name 
      FROM pins p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
      OR p.user_id IN (SELECT friend_id FROM friends WHERE user_id = $1)
    `, [userId]);

    res.json(result.rows);
  } catch (err) {
    console.error("Failed to load all pins:", err);
    res.status(500).json({ error: "Error fetching pins" });
  }
});

app.get("/pin/:id", async (req, res) => {
  const pinId = req.params.id;
  try {
    const comments = await db.query("SELECT * FROM pin_comments WHERE pin_id = $1", [pinId]);
    const images = await db.query("SELECT * FROM pin_images WHERE pin_id = $1", [pinId]);
    res.render("pages/pinDetail", {
      pinId,
      comments: comments.rows,
      images: images.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading pin detail.");
  }
});

app.post("/pin/:id/upload", upload.single("image"), async (req, res) => {
  const pinId = req.params.id;
  const imagePath = req.file.filename;
  const caption = req.body.caption;

  try {
    await db.query("INSERT INTO pin_images (pin_id, image_path) VALUES ($1, $2)", [pinId, imagePath]);
    if (caption) {
      await db.query("INSERT INTO pin_comments (pin_id, comment, image_path) VALUES ($1, $2, $3)", [pinId, caption, imagePath]);
    }
    res.redirect(`/pin/${pinId}`);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).send("Failed to upload image and comment.");
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
