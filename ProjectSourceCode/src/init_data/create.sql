CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
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
    user_id_1 INT NOT NULL,
    user_id_2 INT NOT NULL,
    friendship_status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
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

