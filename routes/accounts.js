var express = require('express');
var router = express.Router();
var config = require('../settings');
var StellarSdk = require('stellar-sdk');

if (config.useTestNetwork) {
  StellarSdk.Network.useTestNetwork();
} else {
  StellarSdk.Network.usePublicNetwork();
}
console.log('config ',config);

router.post('/create', function(req, res, next) {
  var request = require('request');
  console.log('============================================================================');
  console.log('CREATE ACCOUNT');

  if (config.useTestNetwork) {
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
    Headers: Content-type: application/json
    Body: {"publicKey":"GC2Z2FOKECRK7SDDJNSZ6J6F5L32JJSED6WTSWXMRV6JVG77UTDKGT3M"}
    */
    console.log('Use Public Network');
    var server = new StellarSdk.Server(config.stellarServer);
    var publicKey = req.body.publicKey;
    console.log('publicKey:', publicKey);
    // the JS SDK uses promises for most actions, such as retrieving an account
    server.loadAccount(publicKey)
      .then(function(account) {  // validate the account 
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
