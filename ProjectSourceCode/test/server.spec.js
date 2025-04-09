const server = require('../src/index');
const chai = require('chai');
const chaiHttp = require('chai-http');
const bcrypt = require('bcryptjs');
const { Pool } = require("pg");

chai.use(chaiHttp);
chai.should();
const { expect } = chai;

const db = new Pool({
  host: "db",  
  user: "postgres",
  password: "postgres",
  database: "jobtracker",
  port: 5432,
});

describe('Server!', () => {
  it('Returns the default welcome message', (done) => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equal('success');
        expect(res.body.message).to.equal('Welcome!');
        done();
      });
  });
});

describe('Testing /register API', () => {
  it('Positive: should register user with valid input', (done) => {
    chai
      .request(server)
      .post('/register')
      .type('form')
      .send({
        first_name: 'TestUser',
        email: `testuser${Math.floor(Math.random() * 10000)}@example.com`,
        password: 'securepassword'
      })
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });

  it('Negative: should return 400 for missing fields', (done) => {
    chai
      .request(server)
      .post('/register')
      .type('form')
      .send({
        first_name: '',
        email: '',
        password: ''
      })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.text).to.include('Missing registration fields');
        done();
      });
  });
});

describe('Redirect testing', () => {
  it('GET /test should return login page with 200', (done) => {
    chai
      .request(server)
      .get('/test')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.html;
        done();
      });
  });
});

describe('Render testing', () => {
  it('GET /login should return HTML', (done) => {
    chai
      .request(server)
      .get('/login')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.html;
        done();
      });
  });
});

describe('GET /profile (authenticated vs unauthenticated)', () => {
  let agent;
  const testUser = {
    first_name: 'UATUser',
    email: `uat${Math.floor(Math.random() * 10000)}@example.com`,
    password: 'securepass'
  };

  before(async () => {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await db.query("INSERT INTO users (first_name, email, password) VALUES ($1, $2, $3)", [
      testUser.first_name,
      testUser.email,
      hashedPassword
    ]);
  });

  beforeEach(() => {
    agent = chai.request.agent(server);
  });

  afterEach(() => {
    agent.close();
  });

  it(' Should return 401 if not authenticated', (done) => {
    chai
      .request(server)
      .get('/profile')
      .end((err, res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.equal('Not authenticated');
        done();
      });
  });

  it('Should return profile data when authenticated', async () => {
    await agent.post('/login').type('form').send({
      email: testUser.email,
      password: testUser.password
    });

    const res = await agent.get('/profile');

    expect(res).to.have.status(200);
    expect(res.body).to.have.property('username', testUser.first_name);
    expect(res.body).to.have.property('email', testUser.email);
  });
});
