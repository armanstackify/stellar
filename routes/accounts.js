var express = require('express');
var router = express.Router();

var StellarSdk = require('stellar-sdk');
// Uncomment the following line to build transactions for the live network. Be
// sure to also change the horizon hostname.
// StellarSdk.Network.usePublicNetwork();
StellarSdk.Network.useTestNetwork();

console.log('Account..');
// create a completely new and unique pair of keys
// see more about KeyPair objects: https://stellar.github.io/js-stellar-sdk/Keypair.html
var pair = StellarSdk.Keypair.random();

var s = pair.secret();
// console.log('secret:', s);
// SBIHHPJGUDSI7DHD7GQUZLTZR7ABIX5GQCMVL54G5ZIZUBH5KX4GFGOM

var p = pair.publicKey();
// console.log('public:', p);
// GC2Z2FOKECRK7SDDJNSZ6J6F5L32JJSED6WTSWXMRV6JVG77UTDKGT3M


router.get('/create', function(req, res, next) {
  // res.send('respond with a resource');

  var request = require('request');
  request.get({
    url: 'https://friendbot.stellar.org',
    qs: { addr: pair.publicKey() },
    json: true
  }, function(error, response, body) {
    if (error || response.statusCode !== 200) {
      console.error('ERROR!', error || body);
      res.json({'body': error || body});
    }
    else {
      console.log('SUCCESS! You have a new account :)\n', body);
      var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

      // the JS SDK uses promises for most actions, such as retrieving an account
      server.loadAccount(pair.publicKey()).then(function(account) {
        console.log('Balances for account: ' + pair.publicKey());
        account.balances.forEach(function(balance) {
          console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
        });

        res.json({ 'body': body});
      });
    }
  });

});




module.exports = router;
