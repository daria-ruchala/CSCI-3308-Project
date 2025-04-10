const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const { Pool } = require("pg");
const exphbs = require("express-handlebars");
const multer = require("multer");

const app = express();

// ------------------------------ Handlebars Setup ------------------------------
app.engine("hbs", exphbs.engine({
  extname: "hbs",
  defaultLayout: "main",
  layoutsDir: path.join(__dirname, "views/layouts"),
  partialsDir: path.join(__dirname, "views/partials")
}));
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// ------------------------------ Middleware ------------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/static", express.static(path.join(__dirname, "resources"))); // fixed typo

app.use(session({
  secret: process.env.SESSION_SECRET || "supersecretkey",
  resave: false,
  saveUninitialized: true,
}));

// ------------------------------ Multer Setup ------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "public/uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ------------------------------ Database ------------------------------
const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "jobtracker",
  port: process.env.DB_PORT || 5432,
});

// ------------------------------ Auth Middleware ------------------------------
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  next();
}

// ------------------------------ JSON File Setup ------------------------------
const initDataDir = path.join(__dirname, "src/init_data");

if (!fs.existsSync(initDataDir)) {
  fs.mkdirSync(initDataDir, { recursive: true });
}

const pinFile = path.join(initDataDir, "pinList.json");
const galleryFile = path.join(initDataDir, "pinGalleries.json");

// Initialize the JSON files if they don't exist
if (!fs.existsSync(pinFile)) {
  fs.writeFileSync(pinFile, "[]");
}
if (!fs.existsSync(galleryFile)) {
  fs.writeFileSync(galleryFile, "{}");
}

let pinList = JSON.parse(fs.readFileSync(pinFile));
let pinGalleries = JSON.parse(fs.readFileSync(galleryFile));

function savePins() {
  fs.writeFileSync(pinFile, JSON.stringify(pinList, null, 2));
}
function saveGalleries() {
  fs.writeFileSync(galleryFile, JSON.stringify(pinGalleries, null, 2));
}

// ------------------------------ Auth Routes ------------------------------
app.get("/login", (req, res) => res.render("pages/login"));
app.get("/register", (req, res) => res.render("pages/register"));

app.post("/register", async (req, res) => {
  const { first_name, email, password } = req.body;
  if (!first_name || !email || !password) return res.status(400).send("Missing registration fields");

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (first_name, email, password) VALUES ($1, $2, $3) RETURNING id",
      [first_name, email, hashedPassword]
    );
    req.session.userId = result.rows[0].id;
    res.redirect("/");
  } catch (err) {
    console.error("Registration error:", err);
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
  req.session.destroy(() => res.render("pages/logout"));
});

// ------------------------------ Main Pages ------------------------------
app.get("/", requireLogin, async (req, res) => {
  try {
    const result = await db.query("SELECT first_name FROM users WHERE id = $1", [req.session.userId]);
    const user = result.rows[0];
    res.render("pages/home", { first_name: user.first_name });
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load home page.");
  }
});

app.get("/profile", requireLogin, async (req, res) => {
  try {
    const result = await db.query("SELECT first_name, email FROM users WHERE id = $1", [req.session.userId]);
    const user = result.rows[0];
    if (!user) return res.status(404).send("User not found.");
    res.render("pages/profile", { first_name: user.first_name, email: user.email });
  } catch (err) {
    console.error("Profile route error:", err);
    res.status(500).send("Failed to load profile page.");
  }
});

app.get("/friends/add", requireLogin, (req, res) => {
  res.render("pages/addFriend");
});

// ------------------------------ Pin API ------------------------------
app.get("/api/pins", (req, res) => {
  res.json(pinList);
});

app.post("/api/pin", (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ success: false, error: "Missing lat/lng" });

  const pinId = `pin-${Date.now()}`;
  const newPin = { id: pinId, lat, lng };

  pinList.push(newPin);
  savePins();

  res.json({ success: true, pinId });
});

// ------------------------------ Pin Gallery ------------------------------
app.get("/pin/:pinId", requireLogin, (req, res) => {
  const pinId = req.params.pinId;
  const gallery = pinGalleries[pinId] || [];

  res.render("pages/pinGallery", {
    pinId,
    gallery,
    isNew: gallery.length === 0
  });
});

app.post("/pin/:pinId/upload", requireLogin, upload.single("image"), (req, res) => {
  const pinId = req.params.pinId;
  const imagePath = "/uploads/" + req.file.filename;
  const comment = req.body.comment || "";

  if (!pinGalleries[pinId]) {
    pinGalleries[pinId] = [];
  }

  pinGalleries[pinId].push({ imagePath, comment });
  saveGalleries();

  res.redirect(`/pin/${pinId}`);
});

// ------------------------------ Start Server ------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
