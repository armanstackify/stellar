var express = require('express');
var router = express.Router();
var config = require('../settings');
var StellarSdk = require('stellar-sdk');

if (config.stellarNetwork === "test") {
  StellarSdk.Network.useTestNetwork();
} else {
  StellarSdk.Network.usePublicNetwork();
}

/*
Example data:
Method: POST
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
  var issuingKeys = StellarSdk.Keypair.fromSecret(issueKeyParam);
  // creating an Asset
  var asset = new StellarSdk.Asset(assetCodeParam, issuingKeys.publicKey());
  res.json({'asset': asset});

});

/*
@parameters: Secret key
Example data:
Method: POST
Headers: Content-type: application/json
Body:
{
"issuerId":"SA7DW25HNGU2EQVOF7NBVKJTURS6Y4TTRPIJ3ZMOR7XYHYCHVBI7OEUT",
"receiverId":"SDFWRQD4H5IPJ4UCPRWKTFTY6TW363XHRDQTTTB7VWRZUPAP3FDUJ6JM",
"assetCode":"USD",
"amount":"1.0000000"
}
*/
router.post('/issue2', function(req, res, next) {
  console.log('============================================================================');
  console.log('ISSUE ASSET');
  try {
    if (!req.body.issuerId || !req.body.issuerId.trim()) {
      res.status(400).json({'error': 'Asset Issuer ID is required.'});
      return;
    }
    if (!req.body.receiverId || !req.body.receiverId.trim()) {
      res.status(400).json({'error': 'Receiver ID is required.'});
      return;
    }
    if (!req.body.assetCode || !req.body.assetCode.trim()) {
      res.status(400).json({'error': 'Asset Code is required.'});
      return;
    }
    if (!req.body.amount || !req.body.amount.trim()) {
      res.status(400).json({'error': 'Amount is required.'});
      return;
    }
    var issuerIdParam = req.body.issuerId.trim();
    var receiverIdParam = req.body.receiverId.trim();
    var assetCodeParam = req.body.assetCode.trim();
    var assetAmtParam = req.body.amount.trim(); // e.g., '1.0000000'
    // Keys for accounts to issue and receive the new asset
    // var issuingKeys = StellarSdk.Keypair
    //   .fromSecret('SCZANGBA5YHTNYVVV4C3U252E2B6P6F5T3U6MM63WBSBZATAQI3EBTQ4');
    // var receivingKeys = StellarSdk.Keypair
    //   .fromSecret('SDSAVCRE5JRAI7UFAVLE5IMIZRD6N6WOJUWKY4GFN34LOBEEUS4W2T2D');
    var issuingKeys = StellarSdk.Keypair.fromSecret(issuerIdParam);
    var receivingKeys = StellarSdk.Keypair.fromSecret(receiverIdParam);

    var issuingPublicKey = issuingKeys.publicKey();
    var receiverPublicKey  = receivingKeys.publicKey();
    console.log('receiverPublicKey:', receiverPublicKey);
    console.log('issuerPublicKey:', issuingPublicKey);

    // Create an object to represent the new asset
    var assetObj = new StellarSdk.Asset(assetCodeParam, issuingPublicKey);
    var server = new StellarSdk.Server(config.stellarServer);
    // First, the receiving account must trust the asset
    server.loadAccount(receiverPublicKey)
      .then(function(receiver) { // validate the account
        var transaction = new StellarSdk.TransactionBuilder(receiver)
          // The `changeTrust` operation creates (or alters) a trustline
          // The `limit` parameter is optional
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
            destination: receiverPublicKey,
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
        console.log('Error #1:', error);
        res.json({'error': error.toString()});
      });
  } catch(error) {
    if (error.response && error.response.data) {
      console.log('Error:', error.response.data);
      res.json({'error': error.response.data});
    } else {
      console.log('Error #2:', error);
      res.json({'error': error.toString()});
    }
  }
});

router.post('/issue', function(req, res, next) {
  console.log('============================================================================');
  console.log('ISSUE ASSET');
  var issuerIdParam = req.body.issuerId;
  var receiverIdParam = req.body.receiverId;
  var assetCodeParam = req.body.assetCode || 'AstroDollar';
  var assetAmtParam = req.body.amount || '1.0000000';
  try {
    // Keys for accounts to issue and receive the new asset
    // var issuingKeys = StellarSdk.Keypair
    //   .fromSecret('SCZANGBA5YHTNYVVV4C3U252E2B6P6F5T3U6MM63WBSBZATAQI3EBTQ4');
    // var receivingKeys = StellarSdk.Keypair
    //   .fromSecret('SDSAVCRE5JRAI7UFAVLE5IMIZRD6N6WOJUWKY4GFN34LOBEEUS4W2T2D');
    var issuingKeys = StellarSdk.Keypair.fromPublicKey(issuerIdParam);
    var receivingKeys = StellarSdk.Keypair.fromPublicKey(receiverIdParam);


    var issuingPublicKey = issuingKeys.publicKey();
    var receiverPublicKey  = receivingKeys.publicKey();

    console.log('receiverPublicKey:', receiverPublicKey);
    console.log('issuerPublicKey:', issuingPublicKey);

    // Create an object to represent the new asset
    var assetObj = new StellarSdk.Asset(assetCodeParam, issuingPublicKey);
    var server = new StellarSdk.Server(config.stellarServer);
    // First, the receiving account must trust the asset
    server.loadAccount(receiverPublicKey)
      .then(function(receiver) { // validate the account
        var transaction = new StellarSdk.TransactionBuilder(receiver)
          // The `changeTrust` operation creates (or alters) a trustline
          // The `limit` parameter is optional
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
            destination: receiverPublicKey,
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
        console.log('Error #1:', error);
        res.json({'error': error.toString()});
      });
  } catch(error) {
    if (error.response && error.response.data) {
      console.log('Error:', error.response.data);
      res.json({'error': error.response.data});
    } else {
      console.log('Error #2:', error);
      res.json({'error': error.toString()});
    }
  }
});

router.post('/moveAssets', function(req, res, next) {
  console.log('============================================================================');
  console.log('MOVE ASSET');
});

module.exports = router;
