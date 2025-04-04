// ********************** Initialize server **********************************

const server = require('../src/index');

// ********************** Import Libraries ***********************************

const chai = require('chai');
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const { assert, expect } = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************

describe('Server!', () => {
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// ***********************  UNIT TEST CASES FOR /register **************************

describe('Testing /register API', () => {
  // ✅ Positive test case
  it('Positive: should register user with valid input', done => {
    chai
      .request(server)
      .post('/register')
      .type('form') // because you are using express.urlencoded
      .send({
        first_name: 'TestUser',
        email: 'testuser' + Math.floor(Math.random() * 10000) + '@example.com', // make unique
        password: 'securepassword'
      })
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });

  // ❌ Negative test case
  it('Negative: should return 400 for missing fields', done => {
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

// *********************** REDIRECT TEST **************************

describe('Redirect testing', () => {
    it('/test route should redirect to /login with 302 HTTP status code', done => {
      chai
        .request(server)
        .get('/test')
        .end((err, res) => {
          res.should.have.status(302); // 302 Redirect
          res.should.redirectTo(/\/login$/); // redirect to /login (works with localhost too)
          done();
        });
    });
  });
  
  // ***********************  RENDER TEST **************************
  
  describe('Render testing', () => {
    it('"/login" route should render with an HTML response', done => {
      chai
        .request(server)
        .get('/login')
        .end((err, res) => {
          res.should.have.status(200); // Success
          res.should.be.html;         // Rendered HTML
          done();
        });
    });
  });
