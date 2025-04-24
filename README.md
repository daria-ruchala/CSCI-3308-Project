# CSCI-3308-Project

## Application Description:
Fotos4Family is an interactive travel map designed for users to document and share their experiences with family and friends visually. Instead of just listing past trips, users can pin locations on a dynamic map, attaching images, notes, and personal stories to each spot. When a user clicks on a pinned location, they can view photos and details of the experience, creating a visual travel diary that is both engaging and easy to navigate. This allows travelers to relive their memories while providing their close circle with authentic recommendations and insights about places they’ve visited. This will also allow users to share photos from the same event instead of making something like a drive.

Unlike public social media platforms, Fotos4Family is designed for private sharing, ensuring users can securely share their travel experiences only with family and friends. Whether it’s a breathtaking hike, a favorite café, or a hidden gem discovered on vacation, users can build a personalized travel history that remains interactive, visual, and meaningful. The app enhances social connectivity by allowing users to explore each other’s journeys, fostering conversations around shared experiences and future travel plans. With an intuitive design and real-time updates, Fotos4Family makes travel memories more than just photos, they become interactive experiences.


## Contributors:
1. Emiliano Medina Gonzalez - Github: Emilianomedina10
2. Daria Ruchala - Github: Daria-ruchala
3. Brandon Muhlenbruch- Github: brandonMuhlenbruch
4. Christian Vandenburg- Github: christianvandenburg
5. Vijay Khatri - Github: VKH2004


## Tools used:
Bootstrap + css, Mapbox, Docker, GitHub, VSCode, PostgreSQL, Node.js, Render, Mocha/Chai, Handlebars, Multer, Zoom

## Prerequisites to run the application:
There is no extra software htat needs to be installed for this application to work. Everything is inclused in the repository.


## How to run Fotos4Family on your local device:

1. navigate yourself to CSCI-3308-Projects/ProjectSourceCode.

2. run "docker compose up --build" in your terminal.

3. go to localhost:3000 on your web browser.


## How to run tests:
RUN TESTS: docker compose exec web npx mocha test/server.spec.js

Feature 1: User Login
Test Cases:
1. Successful login with valid credentials
   - Input: Registered email and correct password
   - Expected Result: Redirect to home page

2. Login failure with incorrect credentials
   - Input: Incorrect email or password
   - Expected Result: User stays on login page, sees error message

3. Login failure with empty fields
   - Input: Blank email/password
   - Expected Result: Error message shown, user not logged in

Test Data:
{
  "email": "emiliano@gmail.com",
  "password": "emiliano123"
}

Environment:
- localhost:3000 in Docker container

Testers:
- All team members

Observed Results:
- System behaves as expected on all inputs, redirects or displays errors appropriately.


Feature 2: User Registration
Test Cases:
1. Successful registration with valid fields
   - Input: Valid name, email, password
   - Expected Result: Account is created, user redirected to home page

2. Registration failure with missing fields
   - Input: Missing name/email/password
   - Expected Result: Error message shown

3. Registration failure with duplicate email
   - Input: Email already exists in database
   - Expected Result: Error message shown

Test Data:
{
  "first_name": "emiliano",
  "email": "medinagzz03@gmail.com,
  "password": "emi"
}

Environment:
- localhost:3000 in Docker

Testers:
- All team members

Observed Results:
- All error conditions were triggered and handled as expected.


Feature 3: User Profile Page
Test Cases:
1. Access profile when logged in
   - Input: Click "Profile" in nav after login
   - Expected Result: Profile page with name/email shown

2. Try to access profile without login
   - Input: Go directly to /profile without logging in
   - Expected Result: Redirect to login page

Test Data:
- Logged-in session with valid user ID

Environment:
- localhost:3000

Testers:
- All team members

Observed Results:
- Users see their profile or are redirected correctly.


Risks
-----
Type:               Description                                                                 
Organizational:     Some teammates may not be available to test full flows during busy weeks.   
Technical:          New features added late may not be fully tested.                           
Business:           If hosting is needed for demo, downtime may block acceptance testing.       


## Deployed application link:
https://csci-3308-project-dblu.onrender.com/
