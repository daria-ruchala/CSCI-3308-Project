// ********************** Initialize server **********************************
const server = require('../src/index');

// ********************** Import Libraries ***********************************
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
chai.should();
const { expect, assert } = chai;

// ********************** DEFAULT WELCOME TESTCASE ****************************
describe('Server!', () => {
  it('Returns the default welcome message', done => {
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

// *********************** UNIT TEST CASES FOR /register **************************
describe('Testing /register API', () => {
  it('✅ Positive: should register user with valid input', done => {
    chai
      .request(server)
      .post('/register')
      .type('form') // Because express uses urlencoded
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

  it('❌ Negative: should return 400 for missing fields', done => {
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
  it('GET /test should redirect to /login with 302', done => {
    chai
      .request(server)
      .get('/test')
      .end((err, res) => {
        res.should.have.status(302);
        res.should.redirectTo(/\/login$/); // Regex for /login
        done();
      });
  });
});

// *********************** RENDER TEST **************************
describe('Render testing', () => {
  it('GET /login should return HTML', done => {
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
