var express = require('express');
var router = express.Router();
var config = require('../settings');
var StellarSdk = require('stellar-sdk');

if (config.stellarNetwork === "test") {
  StellarSdk.Network.useTestNetwork();
} else {
  StellarSdk.Network.usePublicNetwork();
}
console.log('config variables:');
console.log(config);

router.post('/create', function(req, res, next) {
  var request = require('request');
  console.log('============================================================================');
  console.log('CREATE ACCOUNT');

  if (config.stellarNetwork === "test") {
    console.log('Use Test Network');
    // create a completely new and unique pair of keys
    // see more about KeyPair objects: https://stellar.github.io/js-stellar-sdk/Keypair.html
    var pair = StellarSdk.Keypair.random();
    var publicKey = pair.publicKey();
    console.log('secretKey:', pair.secret());
    console.log('publicKey:', publicKey);
    request.get({
      url: 'https://friendbot.stellar.org',
      qs: { addr: publicKey },
      json: true
    }, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        console.error('ERROR!', error || body);
        res.json({'body': error || body});
      }
      else {
        console.log('SUCCESS! You have a new account :)\n', body);
        var server = new StellarSdk.Server(config.stellarServer);
        // the JS SDK uses promises for most actions, such as retrieving an account
        server.loadAccount(publicKey)
          .then(function(account) { // validate the account
            // console.log('account:',account);
            console.log('Balances for account: ' + publicKey);
            account.balances.forEach(function(balance) {
              console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
            });
            res.json({'accountResult': account});
          })
          .catch(function(error){
            console.error('Error!', error.response.data);
            res.json({'error': error.response.data});
          });
      }
    });
  } else {
    /*
    @parameters: Public key
    Example data:
    Method: POST
    Headers: Content-type: application/json
    Body:
    {
    "sourcePublicKey":"GDIOKP5XAWOH37RKSRZV4RJFFIFSQVXDQ3O42X7FTLD3PMSWN63O2RIU",
    "sourceSecretKey":"SBDKTHVUJNTWTOIKVAB735ANCN4AXANMCCJRS3SYRGPBDKK5FR6EV7ZZ",
    "receiverPublicKey":"GBC4Q6SVT3U5FU27PPBUEPT7IEZ53MRNXOQLKFAOY67YI6XME5CW6FDH",
    "startingBalance": "100.0000000"
    }
    */
    console.log('Use Public Network');
    try {
      var server = new StellarSdk.Server(config.stellarServer);
      var sourcePublicKey = req.body.sourcePublicKey;
      var sourceSecretKey = req.body.sourceSecretKey;
      var receiverPublicKey = req.body.receiverPublicKey;
      var startingBalance = req.body.startingBalance || '100.0000000';
      console.log('sourcePublicKey:', sourcePublicKey);
      console.log('sourceSecretKey:', sourceSecretKey);
      console.log('receiverPublicKey:', receiverPublicKey);
      console.log('startingBalance:', startingBalance);
      // Keys for issuing account
      var issuingKeys = StellarSdk.Keypair.fromSecret(sourceSecretKey);
      server.loadAccount(sourcePublicKey)
        .then(function(account) {  // validate the account
          console.log('account:', account);
          var transaction = new StellarSdk.TransactionBuilder(account)
            .addOperation(StellarSdk.Operation.createAccount({
              destination: receiverPublicKey,
              startingBalance: startingBalance // in XLM
            }))
          .build();
          transaction.sign(issuingKeys);
          var createAccountResult = server.submitTransaction(transaction);
          return createAccountResult;
        })
        .then(function(createAccountResult){
          console.log('createAccountResult:',createAccountResult);
          res.json({'createAccountResult': createAccountResult});
        })
        .catch(function(error){
          if (error.response && error.response.data) {
            res.json({'error': error.response.data});
          } else {
            res.json({'error': error});
          }
        });
    } catch(error) {
      if (error.response && error.response.data) {
        console.error('Error:', error.response.data);
        res.json({'error': error.response.data});
      } else {
        console.error('Error:', error);
        res.json({'error': error});
      }
    }
  }
});

router.post('/create2', function(req, res, next) {
  /*
  @parameters: Public key
  Example data:
  Method: POST
  Headers: Content-type: application/json
  Body:
  {
  "sourcePublicKey":"GDIOKP5XAWOH37RKSRZV4RJFFIFSQVXDQ3O42X7FTLD3PMSWN63O2RIU",
  "sourceSecretKey":"SBDKTHVUJNTWTOIKVAB735ANCN4AXANMCCJRS3SYRGPBDKK5FR6EV7ZZ",
  "receiverPublicKey":"GBC4Q6SVT3U5FU27PPBUEPT7IEZ53MRNXOQLKFAOY67YI6XME5CW6FDH",
  "startingBalance": "100.0000000"
  }
  */
  var request = require('request');
  console.log('============================================================================');
  console.log('CREATE ACCOUNT');
  console.log('Use Public Network');
  try {
    var server = new StellarSdk.Server(config.stellarServer);
    var sourcePublicKey = req.body.sourcePublicKey;
    var sourceSecretKey = req.body.sourceSecretKey;
    var receiverPublicKey = req.body.receiverPublicKey;
    var startingBalance = req.body.startingBalance || '100.0000000';
    console.log('sourcePublicKey:', sourcePublicKey);
    console.log('sourceSecretKey:', sourceSecretKey);
    console.log('receiverPublicKey:', receiverPublicKey);
    console.log('startingBalance:', startingBalance);
    // Keys for issuing account
    var issuingKeys = StellarSdk.Keypair.fromSecret(sourceSecretKey);
    server.loadAccount(sourcePublicKey)
      .then(function(account) { // validate the account
        console.log('account:', account);
        var transaction = new StellarSdk.TransactionBuilder(account)
          .addOperation(StellarSdk.Operation.createAccount({
            destination: receiverPublicKey,
            startingBalance: startingBalance // in XLM
          }))
        .build();
        transaction.sign(issuingKeys);
        var createAccountResult = server.submitTransaction(transaction);
        return createAccountResult;
      })
      .then(function(createAccountResult){
        console.log('createAccountResult:',createAccountResult);
        res.json({'createAccountResult': createAccountResult});
      })
      .catch(function(error){
        if (error.response && error.response.data) {
          res.json({'error': error.response.data});
        } else {
          res.json({'error': error});
        }
      });
  } catch(error) {
    if (error.response && error.response.data) {
      console.error('Error:', error.response.data);
      res.json({'error': error.response.data});
    } else {
      console.error('Error:', error);
      res.json({'error': error});
    }
  }
});

// Retrieve a single account
// @parameters: Public key
// Example:
// curl http://localhost:3000/accounts/GDENVHWFX27V4FY6LXJP266PX4YMBWBLZFDAF3SV4XXKDUHBVF6GSP7C
router.get('/:publicKey', function(req, res, next) {
  var server = new StellarSdk.Server(config.stellarServer);
  var publicKey = req.params.publicKey;
  console.log('publicKey:', publicKey);
  server.loadAccount(publicKey)
    .then(function(account) {  // validate the account
      console.log('Get account details:',account);
      console.log('Balances for account: ' + publicKey);
      account.balances.forEach(function(balance) {
        console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
      });
      res.json({'accountResult': account});
    })
    .catch(function(error){
      console.error('Error!', error.response.data);
      res.json({'error': error.response.data});
    });
});

module.exports = router;
