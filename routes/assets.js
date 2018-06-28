var express = require('express');
var router = express.Router();
var config = require('../settings');
var StellarSdk = require('stellar-sdk');
var defaultBalance = '5.0000000';

var server = new StellarSdk.Server(config.stellarServer);

if (config.stellarNetwork === "test") {
  StellarSdk.Network.useTestNetwork();
} else {
  StellarSdk.Network.usePublicNetwork();
}


/*
Asset creation
Example data:
Method: POST
Headers: Content-type: application/json
Body:
{
"receiverId":"SAA3T6YQVRIEFO5SFTTNR3G74GQFLYCRVV6C4FBW7EXEC7AYQ6SZSAIK",
"assetCode":"AstroDollar"
}
asset_code - a short identifier of 1–12 alphanumeric
receiverId - secret key of the distribution account
*/
router.post('/create', function(req, res, next) {
  console.log('============================================================================');
  console.log('CREATE ASSET');
  if (!req.body.assetCode || !req.body.assetCode.trim()) {
    res.status(400).json({'error': 'Asset Code is required.'});
    return;
  }
  try {
    // Example of assetCode: BTC, USD, AstroDollars, 1-12 alphanumberic chars
    var assetCodeParam = req.body.assetCode;
    // the issuer account that created the asset
    var issuerPublicKey = config.sourcePublicKey;
    var issuerSecretKey = config.sourceSecretKey;
    var issuingKeys = StellarSdk.Keypair.fromSecret(issuerSecretKey);

    // creating an Asset object
    var assetObj = new StellarSdk.Asset(assetCodeParam, issuingKeys.publicKey());
    var receiverSecretKey = req.body.receiverId;
    var receivingKeys = StellarSdk.Keypair.fromSecret(receiverSecretKey);

    // var source = new StellarSdk.Account(distribPublicKey, "41747816556527617");
    console.log('issuerPublicKey:', issuerPublicKey);
    console.log('receiverSecretKey:', receiverSecretKey);
    console.log('getAssetType:',assetObj.getAssetType());
    console.log('assetObj:',assetObj);
    server.loadAccount(receivingKeys.publicKey())
      .then(function(receiver){
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
      .then(function(transactionResult){
        console.log('transactionResult:',transactionResult);
        res.json({'transactionResult': transactionResult});
      })
      .catch(function(error) {
        if (error.response && error.response.data) {
          console.log('Error #1:', error.response.data);
          res.json({'error': error.response.data});
        } else {
          console.log('Error #2:', error);
          res.json({'error': error.toString()});
        }
      });
  } catch(error) {
    if (error.response && error.response.data) {
      console.log('Error #3:', error.response.data);
      res.status(400).json({'error': error.response.data});
    } else {
      console.log('Error #4:', error);
      res.status(400).json({'error': error.toString()});
    }
  }
});

/*
Example data:
Method: POST
Headers: Content-type: application/json
Body:
{
"receiverId":"SDFWRQD4H5IPJ4UCPRWKTFTY6TW363XHRDQTTTB7VWRZUPAP3FDUJ6JM",
"assetCode":"USD",
"amount":"1.0000000"
}
asset_code - a short identifier of 1–12 alphanumeric
receiverId - secret key of the distribution account
amount - number of units of credit issued
*/

// issuing an asset
router.post('/issue', function(req, res, next) {
  console.log('============================================================================');
  console.log('ISSUE ASSET');
  var issuingKeys;  // issuing account
  var receivingKeys;  // distribution account
  var issuingPublicKey;
  var issuerSecretKey;
  var receiverPublicKey;

  try {
    // if (!req.body.issuerId || !req.body.issuerId.trim()) {
    //   res.status(400).json({'error': 'Asset Issuer ID is required.'});
    //   return;
    // }
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
    // var issuerIdParam = req.body.issuerId.trim();
    var receiverIdParam = req.body.receiverId.trim();
    var assetCodeParam = req.body.assetCode.trim();
    var assetAmtParam = req.body.amount.trim(); // e.g., '1.0000000'
    // Keys for accounts to issue and receive the new asset
    receivingKeys = StellarSdk.Keypair.fromSecret(receiverIdParam);

    // the issuer account that created the asset
    issuingPublicKey = config.sourcePublicKey;
    issuerSecretKey = config.sourceSecretKey;
    issuingKeys = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    if (req.body.issuerId) {
      issuingKeys = StellarSdk.Keypair.fromSecret(req.body.issuerId);
      issuingPublicKey = issuingKeys.publicKey();
    }

    receiverPublicKey = receivingKeys.publicKey();
    console.log('receiverPublicKey:', receiverPublicKey);
    console.log('issuerPublicKey:', issuingPublicKey);
    // Create an object to represent the new asset
    var assetObj = new StellarSdk.Asset(assetCodeParam, issuingPublicKey);
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
      // Second, the issuing account sends a payment/transfer operation using the asset
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
        if (error.response && error.response.data) {
          console.log('Error #1:', error.response.data);
          res.json({'error': error.response.data});
        } else {
          console.log('Error #2:', error);
          res.json({'error': error.toString()});
        }
      });
  } catch(error) {
    if (error.response && error.response.data) {
      console.log('Error #3:', error.response.data);
      res.json({'error': error.response.data});
    } else {
      console.log('Error #4:', error);
      res.json({'error': error.toString()});
    }
  }
});

module.exports = router;
