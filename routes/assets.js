var express = require('express');
var router = express.Router();
var config = require('../settings');
var StellarSdk = require('stellar-sdk');

if (config.useTestNetwork) {
  StellarSdk.Network.useTestNetwork();
} else {
  StellarSdk.Network.usePublicNetwork();
}

/*
Example data:
Headers: Content-type: application/json
Body: {"assetCode":"AstroDollars","issuerId":"SCZANGBA5YHTNYVVV4C3U252E2B6P6F5T3U6MM63WBSBZATAQI3EBTQ4"}
*/
router.post('/create', function(req, res, next) {
  console.log('============================================================================');
  console.log('CREATE ASSET');
  // console.log('body', req.body);
  var assetCodeParam = req.body.assetCode;
  var issueKeyParam = req.body.issuerId;
  var assetTypeParam = req.body.assetType;
  // var receivingKeyParam = req.body.receivingKey;

  var issuingKeys = StellarSdk.Keypair.fromSecret(issueKeyParam);

  // creating an Asset
  var asset = new StellarSdk.Asset(assetCodeParam, issuingKeys.publicKey());

  res.json({'asset': asset});

});

/*
@parameters: Secret key
Example data:
Headers: Content-type: application/json
Body: {"issuerId":"SCZANGBA5YHTNYVVV4C3U252E2B6P6F5T3U6MM63WBSBZATAQI3EBTQ4"}
*/
router.post('/issue1', function(req, res, next) {
  console.log('============================================================================');
  console.log('ISSUE ASSET');
  var issueKeyParam = req.body.issuerId;
  
  // Keys for issuing account
  var issuingKeys = StellarSdk.Keypair.fromSecret(issueKeyParam);

  var receivingKeys = StellarSdk.Keypair
    .fromSecret('SDSAVCRE5JRAI7UFAVLE5IMIZRD6N6WOJUWKY4GFN34LOBEEUS4W2T2D');

  // Create an object to represent the new asset
  var astroDollar = new StellarSdk.Asset('AstroDollar', issuingKeys.publicKey());

  var server = new StellarSdk.Server(config.stellarServer);
  server.loadAccount(issuingKeys.publicKey())
    .then(function(issuer){
      var transaction = new StellarSdk.TransactionBuilder(issuer)
        // The `changeTrust` operation creates (or alters) a trustline
        // The `limit` parameter below is optional
        .addOperation(StellarSdk.Operation.changeTrust({
          asset: astroDollar
        }))
        .addOperation(StellarSdk.Operation.payment({
          destination: receivingKeys.publicKey(),
          asset: astroDollar,
          amount: '10'
        }))
        // .addOperation(StellarSdk.Operation.setOptions({
        //   setFlags: StellarSdk.AuthRevocableFlag | StellarSdk.AuthRequiredFlag
        // }))
        .build();
        transaction.sign(issuingKeys);
        var transactionResult = server.submitTransaction(transaction);
        return transactionResult;
    })
    .then(function(transactionResult){
      console.log('transactionResult:',transactionResult);
      res.json({'transactionResult': transactionResult});
    })
    .catch(function(error){
      console.error('Error!', error.response.data);
      res.json({'error': error.response.data});
    });

});

router.post('/issue', function(req, res, next) {
  console.log('============================================================================');
  console.log('ISSUE ASSET');
  var issueKeyParam = req.body.issuerId;
  var receiverKeyParam = req.body.receiverId;
  var assetCodeParam = req.body.assetCode || 'AstroDollar';
  var assetAmtParam = req.body.amount || '1.0000000';

  // Keys for accounts to issue and receive the new asset
  var issuingKeys = StellarSdk.Keypair
    .fromSecret('SCZANGBA5YHTNYVVV4C3U252E2B6P6F5T3U6MM63WBSBZATAQI3EBTQ4');
  var receivingKeys = StellarSdk.Keypair
    .fromSecret('SDSAVCRE5JRAI7UFAVLE5IMIZRD6N6WOJUWKY4GFN34LOBEEUS4W2T2D');

  var issuingPublicKey = issuingKeys.publicKey();
  var receivingPublicKey  = receivingKeys.publicKey();

  // Create an object to represent the new asset
  var assetObj = new StellarSdk.Asset(assetCodeParam, issuingPublicKey);
  var server = new StellarSdk.Server(config.stellarServer);
  // First, the receiving account must trust the asset
  server.loadAccount(receivingPublicKey)
    .then(function(receiver) {
      var transaction = new StellarSdk.TransactionBuilder(receiver)
        // The `changeTrust` operation creates (or alters) a trustline
        // The `limit` parameter below is optional
        .addOperation(StellarSdk.Operation.changeTrust({
          asset: assetObj
        }))
        .build();
      transaction.sign(receivingKeys);
      return server.submitTransaction(transaction);
    })
    // Second, the issuing account actually sends a payment using the asset
    .then(function() {
      return server.loadAccount(issuingPublicKey)
    })
    .then(function(issuer) {
      var transaction = new StellarSdk.TransactionBuilder(issuer)
        .addOperation(StellarSdk.Operation.payment({
          destination: receivingPublicKey,
          asset: assetObj,
          amount: assetAmtParam
        }))
        .build();
      transaction.sign(issuingKeys);
      return server.submitTransaction(transaction);
    })
    .then(function(transactionResult){
      console.log('transactionResult:',transactionResult);
      res.json({'transactionResult': transactionResult});
    })
    .catch(function(error) {
      console.log('error:', error);
      res.json({'error': error});
    });

});

router.post('/moveAssets', function(req, res, next) {
  console.log('============================================================================');
  console.log('MOVE ASSET');
});

module.exports = router;
