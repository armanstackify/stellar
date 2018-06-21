var express = require('express');
var router = express.Router();

var StellarSdk = require('stellar-sdk');
// Uncomment the following line to build transactions for the live network.
// Be sure to also change the horizon hostname.
// StellarSdk.Network.usePublicNetwork();
StellarSdk.Network.useTestNetwork();

/*
Example jsondata for Body:
{"publicKey":"GC2Z2FOKECRK7SDDJNSZ6J6F5L32JJSED6WTSWXMRV6JVG77UTDKGT3M"}
*/
router.post('/create', function(req, res, next) {
  // create a completely new and unique pair of keys
  // see more about KeyPair objects: https://stellar.github.io/js-stellar-sdk/Keypair.html
  var pair = StellarSdk.Keypair.random();
  // pair.secret();
  // SBIHHPJGUDSI7DHD7GQUZLTZR7ABIX5GQCMVL54G5ZIZUBH5KX4GFGOM
  // var publicKey = pair.publicKey();
  // console.log('public:', publicKey);
  // GC2Z2FOKECRK7SDDJNSZ6J6F5L32JJSED6WTSWXMRV6JVG77UTDKGT3M

  var publicKey = req.body.publicKey;
  var request = require('request');
  console.log('============================================================================');
  console.log('CREATE ACCOUNT');
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
      var server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

      // the JS SDK uses promises for most actions, such as retrieving an account
      server.loadAccount(publicKey).then(function(account) {
        console.log('Balances for account: ' + publicKey);
        var balanceAry = [];
        account.balances.forEach(function(balance) {
          var bal = {
            'type': balance.asset_type,
            'balance': balance.balance
          };
          balanceAry.push(bal);
          console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
        });

        console.log('balanceAry:',balanceAry);
        res.json({'balances': balanceAry, 'body': body});
      });
    }
  });

});

module.exports = router;
