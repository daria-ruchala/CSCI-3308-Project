CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  friend_code TEXT UNIQUE NOT NULL
);

-- DROP TABLE IF EXISTS users;
-- CREATE TABLE users (
--     user_id SERIAL PRIMARY KEY,
--     username VARCHAR(50) NOT NULL,
--     email VARCHAR(100) NOT NULL,
--     password_hash VARCHAR(255) NOT NULL,
--     first_name VARCHAR(50),
--     last_name VARCHAR(50)
-- );


DROP TABLE IF EXISTS friends;
CREATE TABLE friends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, friend_id)
);

DROP TABLE IF EXISTS locations;
CREATE TABLE locations (
    location_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255)
);

DROP TABLE IF EXISTS photos;
CREATE TABLE photos (
    photo_id SERIAL PRIMARY KEY,
    photo_url VARCHAR(255) NOT NULL,
    caption VARCHAR(255)
);

CREATE TABLE locations_to_photos (
    location_id INT NOT NULL,
    photo_id INT NOT NULL
);

CREATE TABLE users_to_locations (
    user_id INT NOT NULL,
    location_id INT NOT NULL
);

CREATE TABLE users_to_photos (
    user_id INT NOT NULL,
    photo_id INT NOT NULL
);

-- CREATE TABLE pins_map (
--     pin_id SERIAL PRIMARY KEY,
--     longitude DECIMAL NOT NULL,
--     latitude DECIMAL NOT NULL,
--     pin_caption TEXT
-- );

-- CREATE TABLE users_to_pins (
--     user_id INT NOT NULL,
--     pin_id INT NOT NULL
-- );

DROP TABLE IF EXISTS pins;
CREATE TABLE pins (
  id SERIAL PRIMARY KEY,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  label TEXT DEFAULT 'Pin! ',
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pin_comments (
  id SERIAL PRIMARY KEY,
  pin_id INTEGER REFERENCES pins(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pin_images (
  id SERIAL PRIMARY KEY,
  pin_id INTEGER REFERENCES pins(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


