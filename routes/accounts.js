var express = require('express');
var router = express.Router();
var config = require('../settings');
var StellarSdk = require('stellar-sdk');
var defaultBalance = config.startingBalance;
var logger = require('../winston');
var server = new StellarSdk.Server(config.stellarServer);

if (config.stellarNetwork === "test") {
  StellarSdk.Network.useTestNetwork();
} else {
  StellarSdk.Network.usePublicNetwork();
}
// console.log('config variables:');
// console.log(config);

router.post('/create', function(req, res, next) {
  var request = require('request');
  logger.log('debug', '============================================================================');
  logger.log('debug', 'CREATE ACCOUNT');
  var pairIssuer;
  var pairDistrib;
  var issuingKeys;
  var sourcePublicKey;
  var sourceSecretKey;
  var receiverPublicKey;
  var receiverSecretKey;
  if (config.stellarNetwork === "test") {
    logger.log('debug', 'Use Test Network');
    // create a completely new and unique pair of keys
    // see more about KeyPair objects: https://stellar.github.io/js-stellar-sdk/Keypair.html
    pairIssuer = StellarSdk.Keypair.random();
    sourcePublicKey = pairIssuer.publicKey();
    sourceSecretKey = pairIssuer.secret();
    issuingKeys = StellarSdk.Keypair.fromSecret(sourceSecretKey);
    
    pairDistrib = StellarSdk.Keypair.random();
    receiverPublicKey = pairDistrib.publicKey();
    receiverSecretKey = pairDistrib.secret();
    logger.log('debug', 'sourceSecretKey: ' + sourceSecretKey);
    logger.log('debug', 'sourcePublicKey: ' + sourcePublicKey);
    // Now, lets funded the account using the friendbot
    request.get({
      url: 'https://friendbot.stellar.org',
      qs: { addr: sourcePublicKey },
      json: true
    }, function(error, response, body) {
      if (error || response.statusCode !== 200) {
        logger.log('debug', 'Friendbot error:', error || body);
        res.json({'error': error || body});
      }
      else {
        console.log('SUCCESS! You have a new account :)\n', body);
        server.loadAccount(sourcePublicKey)
          .then(function(account) { // validate the account
            console.log('Balances for source account: ' + sourcePublicKey);
            logger.log('debug', 'Balances for source account: ' + sourcePublicKey);
            account.balances.forEach(function(balance) {
              logger.log('debug', 'Code: '+balance.asset_code+', Type: '+balance.asset_type+', Balance: '+balance.balance);
            });
            var startingBalance = req.body.startingBalance || defaultBalance;
            console.log('receiverPublicKey:', receiverPublicKey);
            console.log('receiverSecretKey:', receiverSecretKey);
            console.log('startingBalance:', startingBalance);
            logger.log('debug', 'receiverPublicKey: ' + receiverPublicKey);
            logger.log('debug', 'startingBalance: ' + startingBalance);
            var transaction = new StellarSdk.TransactionBuilder(account)
              .addOperation(StellarSdk.Operation.createAccount({ // create account operation
                destination: receiverPublicKey,
                startingBalance: startingBalance // in XLM e.g, 100.0000000 (7 decimal places)
              }))
            .build();
            transaction.sign(issuingKeys);
            var createAccountResult = server.submitTransaction(transaction);
            return createAccountResult;
          })
          .then(function(createAccountResult){
            res.json({
              'createAccountResult': createAccountResult, 
              'receiverPublicKey': receiverPublicKey,
              'receiverSecretKey': receiverSecretKey
            });
          })
          .catch(function(error){
            if (error.response && error.response.data) {
              logger.log('debug','Error in loadAccount() in #accounts/create: ' + JSON.stringify(error.response.data));
              res.status(400).json({'error': error.response.data});
            } else {
              logger.log('debug','Error in loadAccount() in #accounts/create: ' + error.toString());
              res.status(400).json({'error': error.toString()});
            }
          });
      }
    });
  } else {
    var request = require('request');
    logger.log('debug', '============================================================================');
    logger.log('debug','CREATE ACCOUNT');
    logger.log('debug','Use Public Network');
    try {
      // Keys for source account
      sourcePublicKey = config.sourcePublicKey;
      sourceSecretKey = config.sourceSecretKey;
      issuingKeys = StellarSdk.Keypair.fromSecret(sourceSecretKey);
      // create a completely new and unique pair of keys
      pair = StellarSdk.Keypair.random();
      receiverPublicKey = pair.publicKey();
      receiverSecretKey = pair.secret();
      var startingBalance = defaultBalance;
      logger.log('debug', 'sourcePublicKey: ' + sourcePublicKey);
      logger.log('debug', 'receiverPublicKey: ' + receiverPublicKey);
      logger.log('debug', 'startingBalance: ' + startingBalance);

      server.loadAccount(sourcePublicKey)
        .then(function(account) { // validate the account
          console.log('Balances for source account: ' + sourcePublicKey);
          account.balances.forEach(function(balance) {
            logger.log('debug', 'Code: '+balance.asset_code+', Type: '+balance.asset_type+', Balance: '+balance.balance);
          });
          var transaction = new StellarSdk.TransactionBuilder(account)
            .addOperation(StellarSdk.Operation.createAccount({ // create account operation
              destination: receiverPublicKey,
              startingBalance: startingBalance // in XLM e.g, 100.0000000 (7 decimal places)
            }))
          .build();
          transaction.sign(issuingKeys);
          var createAccountResult = server.submitTransaction(transaction);
          return createAccountResult;
        })
        .then(function(createAccountResult){
          res.json({
            'createAccountResult': createAccountResult, 
            'receiverPublicKey': receiverPublicKey,
            'receiverSecretKey': receiverSecretKey
          });
        })
        .catch(function(error){
          if (error.response && error.response.data) {
            logger.log('debug', 'Error in loadAccount() in #accounts/create: ' + JSON.stringify(error.response.data));
            res.status(400).json({'error': error.response.data});
          } else {
            logger.log('debug', 'Error in loadAccount() in #accounts/create: ' + error.toString());
            res.status(400).json({'error': error.toString()});
          }
        });
    } catch(error) {
      if (error.response && error.response.data) {
        logger.log('debug', 'Error A in #accounts/create: ' + JSON.stringify(error.response.data));
        res.status(400).json({'error': error.response.data});
      } else {
        logger.log('debug', 'Error B in #accounts/create: ' + error.toString());
        res.status(400).json({'error': error.toString()});
      }
    }
  }
});

// Retrieve a single account
// @parameters: Public key
// Example:
// GET: curl http://localhost:3000/accounts/GDENVHWFX27V4FY6LXJP266PX4YMBWBLZFDAF3SV4XXKDUHBVF6GSP7C
router.get('/:publicKey', function(req, res, next) {
  var publicKey = req.params.publicKey;
  console.log('\nFetch single account');
  server.loadAccount(publicKey)
    .then(function(account) {  // validate the account
      console.log('Balances for account: ' + publicKey);
      account.balances.forEach(function(balance) {
        logger.log('debug', 'Code: '+balance.asset_code+', Type: '+balance.asset_type+', Balance: '+balance.balance);
      });
      res.json({'accountResult': account});
    })
    .catch(function(error){
      if (error.response && error.response.data) {
        console.log('Error:', error.response.data);
        res.status(400).json({'error': error.response.data});
      } else {
        console.log('Error:', error);
        res.status(400).json({'error': error.toString()});
      }
    });
});

router.post('/create2', function(req, res, next) {
  var request = require('request');
  logger.log('debug', '============================================================================');
  logger.log('debug', 'CREATE ACCOUNT');
  logger.log('debug', 'Use Public Network');
  try {
    var pair = StellarSdk.Keypair.random();
    var sourcePublicKey = config.sourcePublicKey;
    var sourceSecretKey = config.sourceSecretKey;
    // Keys for source account
    var issuingKeys = StellarSdk.Keypair.fromSecret(sourceSecretKey);
    if (req.body.sourceId && (req.body.sourceId.trim() !== "")) {
      sourceSecretKey = req.body.sourceId.trim();
      issuingKeys = StellarSdk.Keypair.fromSecret(sourceSecretKey);
      sourcePublicKey = issuingKeys.publicKey();
    }
    // if (!req.body.sourcePublicKey || !req.body.sourcePublicKey.trim()) {
    //   res.status(400).json({'error': 'Source Public Key is required.'});
    //   return;
    // }
    // if (!req.body.sourceSecretKey || !req.body.sourceSecretKey.trim()) {
    //   res.status(400).json({'error': 'Source Secret Key is required.'});
    //   return;
    // }
    // if (!req.body.receiverPublicKey || !req.body.receiverPublicKey.trim()) {
    //   res.status(400).json({'error': 'Receiver Public Key is required.'});
    //   return;
    // }
    // if (!req.body.startingBalance || !req.body.startingBalance.trim()) {
    //   res.status(400).json({'error': 'Starting balance is required.'});
    //   return;
    // }
    var receiverPublicKey = pair.publicKey();
    var receiverSecretKey = pair.secret();

    if (req.body.receiverPublicKey) {
      receiverPublicKey = req.body.receiverPublicKey.trim();
      receiverSecretKey = '';
    }
    var startingBalance = defaultBalance;
    console.log('sourcePublicKey:', sourcePublicKey);
    console.log('receiverPublicKey:', receiverPublicKey);
    console.log('receiverSecretKey:', receiverSecretKey);
    console.log('startingBalance:', startingBalance);
    logger.log('debug', 'sourcePublicKey: ' + sourcePublicKey);
    logger.log('debug', 'receiverPublicKey: ' + receiverPublicKey);
    logger.log('debug', 'startingBalance: ' + startingBalance);
    server.loadAccount(sourcePublicKey)
      .then(function(account) { // validate the account
        logger.log('debug', 'Balances for issuing account: ' + sourcePublicKey);
        account.balances.forEach(function(balance) {
          console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
          logger.log('debug', 'Code: '+balance.asset_code+', Type: '+balance.asset_type+', Balance: '+balance.balance);
        });
        var transaction = new StellarSdk.TransactionBuilder(account)
          .addOperation(StellarSdk.Operation.createAccount({ // create account operation
            destination: receiverPublicKey,
            startingBalance: startingBalance // in XLM e.g, 100.0000000 (7 decimal places)
          }))
        .build();
        transaction.sign(issuingKeys);
        var createAccountResult = server.submitTransaction(transaction);
        return createAccountResult;
      })
      .then(function(createAccountResult){
        res.json({
          'createAccountResult': createAccountResult, 
          'receiverPublicKey': receiverPublicKey,
          'receiverSecretKey': receiverSecretKey
        });
      })
      .catch(function(error){
        if (error.response && error.response.data) {
          console.log('Error A:', error.response.data);
          logger.log('debug', 'Error A: ' + JSON.stringify(error.response.data));
          res.status(400).json({'error': error.response.data});
        } else {
          console.log('Error B:', error);
          logger.log('debug', 'Error B: ' + error.toString());
          res.status(400).json({'error': error.toString()});
        }
      });
  } catch(error) {
    if (error.response && error.response.data) {
      console.log('Error C:', error.response.data);
      logger.log('debug', 'Error C: ' + JSON.stringify(error.response.data));
      res.status(400).json({'error': error.response.data});
    } else {
      console.log('Error D:', error.toString());
      logger.log('debug', 'Error D: ' + error.toString());
      res.status(400).json({'error': error.toString()});
    }
  }
});

module.exports = router;
