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
Body: {"assetCode":"AstroDollars"}
*/
// Alphanumeric 4-character maximum
// Alphanumeric 12-character maximum
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
    
    console.log('issuerPublicKey:', issuerPublicKey);
    var issuingKeys = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    // creating an Asset object
    var asset = new StellarSdk.Asset(assetCodeParam, issuingKeys.publicKey());
    console.log('getAssetType:',asset.getAssetType());
    console.log('asset:',asset);
    res.json({'asset': asset});
  } catch(error) {
    if (error.response && error.response.data) {
      console.log('Error:', error.response.data);
      res.status(400).json({'error': error.response.data});
    } else {
      console.log('Error:', error);
      res.status(400).json({'error': error.toString()});
    }
  }
});

/*
@parameters: Secret key
Example data:
Method: POST
Headers: Content-type: application/json
Body:
{
"receiverId":"SDFWRQD4H5IPJ4UCPRWKTFTY6TW363XHRDQTTTB7VWRZUPAP3FDUJ6JM",
"assetCode":"USD",
"amount":"1.0000000"
}
*/
router.post('/issue', function(req, res, next) {
  console.log('============================================================================');
  console.log('ISSUE ASSET');
  try {
    // if (!req.body.issuerId || !req.body.issuerId.trim()) {
    //   res.status(400).json({'error': 'Asset Issuer ID is required.'});
    //   return;
    // }
    // Secret key of the receiver
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
    // var issuingKeys = StellarSdk.Keypair
    //   .fromSecret('SCZANGBA5YHTNYVVV4C3U252E2B6P6F5T3U6MM63WBSBZATAQI3EBTQ4');
    // var receivingKeys = StellarSdk.Keypair
    //   .fromSecret('SDSAVCRE5JRAI7UFAVLE5IMIZRD6N6WOJUWKY4GFN34LOBEEUS4W2T2D');
    // var issuingKeys = StellarSdk.Keypair.fromSecret(issuerIdParam);
    var receivingKeys = StellarSdk.Keypair.fromSecret(receiverIdParam);

    // the issuer account that created the asset
    var issuingPublicKey = config.sourcePublicKey;
    var issuerSecretKey = config.sourceSecretKey;

    var issuingKeys = StellarSdk.Keypair.fromSecret(issuerSecretKey);

    // var issuingPublicKey = issuingKeys.publicKey();
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

router.post('/issue2', function(req, res, next) {
  console.log('============================================================================');
  console.log('ISSUE ASSET');
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
    // var issuingKeys = StellarSdk.Keypair
    //   .fromSecret('SCZANGBA5YHTNYVVV4C3U252E2B6P6F5T3U6MM63WBSBZATAQI3EBTQ4');
    // var receivingKeys = StellarSdk.Keypair
    //   .fromSecret('SDSAVCRE5JRAI7UFAVLE5IMIZRD6N6WOJUWKY4GFN34LOBEEUS4W2T2D');
    // var issuingKeys = StellarSdk.Keypair.fromSecret(issuerIdParam);
    var receivingKeys = StellarSdk.Keypair.fromSecret(receiverIdParam);

    // the issuer account that created the asset
    var issuingPublicKey = config.sourcePublicKey;
    var issuerSecretKey = config.sourceSecretKey;

    if (req.body.issuerId) {
      var issuingKeys = StellarSdk.Keypair.fromSecret(req.body.issuerId);
      issuingPublicKey = issuingKeys.publicKey();
    }

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

/*
{
"issuerId":"SA7DW25HNGU2EQVOF7NBVKJTURS6Y4TTRPIJ3ZMOR7XYHYCHVBI7OEUT",
"receiverId":"SDFWRQD4H5IPJ4UCPRWKTFTY6TW363XHRDQTTTB7VWRZUPAP3FDUJ6JM",
"assetCode":"USD",
"amount":"1.0000000"
}
*/
// sending lumens to another account
router.post('/issue3', function(req, res, next){
  console.log('============================================================================');
  console.log('ISSUE ASSET');
  var server = new StellarSdk.Server(config.stellarServer);
  // add validations here...
  // the issuer account that created the asset
  var issuingPublicKey = config.sourcePublicKey;
  var issuerSecretKey = config.sourceSecretKey;
  var receiverIdParam = req.body.receiverId.trim();
  var assetAmtParam = req.body.amount.trim(); // e.g., '1.0000000'
  var issuingKeys = StellarSdk.Keypair.fromSecret(issuerSecretKey);
  if (req.body.issuerId) {
    issuerSecretKey = req.body.issuerId.trim();
    issuingKeys = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    issuingPublicKey = issuingKeys.publicKey();
  }
  var assetCodeParam = req.body.assetCode.trim();
  // var sourceKeys = StellarSdk.Keypair.fromSecret(issuerSecretKey);
  // var destinationId = 'GA2C5RFPE6GCKMY3US5PAB6UZLKIGSPIUKSLRB6Q723BM2OARMDUYEJ5';
  // Transaction will hold a built transaction we can resubmit if the result is unknown.
  var transaction;
  console.log('receiverPublicKey:', receiverIdParam);
  console.log('issuerPublicKey:', issuingPublicKey);
  // First, check to make sure that the destination account exists.
  server.loadAccount(receiverIdParam)
    // If the account is not found, surface a nicer error message for logging.
    .catch(StellarSdk.NotFoundError, function (error) {
      res.status(400).json({'error': 'The destination account does not exist!'});
      throw new Error('The destination account does not exist!');
    })
    // If there was no error, load up-to-date information on your account.
    .then(function() {
      return server.loadAccount(issuingPublicKey);
    })
    .then(function(sourceAccount) {
      console.log('Balances for master account: ' + issuingPublicKey);
      sourceAccount.balances.forEach(function(balance) {
        console.log('Type:', balance.asset_type, ', Balance:', balance.balance);
      });
      // Create an object to represent the new asset
      var assetObj = new StellarSdk.Asset(assetCodeParam, issuingPublicKey);
      // Start building the transaction.
      transaction = new StellarSdk.TransactionBuilder(sourceAccount)
        .addOperation(StellarSdk.Operation.payment({
          destination: receiverIdParam,
          // Because Stellar allows transaction in many currencies, you must
          // specify the asset type. The special "native" asset represents Lumens.
          asset: assetObj,
          amount: assetAmtParam
        }))
        // A memo allows you to add your own metadata to a transaction. It's
        // optional and does not affect how Stellar treats the transaction.
        .addMemo(StellarSdk.Memo.text('Test Transaction'))
        .build();
      // Sign the transaction to prove you are actually the person sending it.
      transaction.sign(issuingKeys);
      // And finally, send it off to Stellar!
      return server.submitTransaction(transaction);
    })
    .then(function(transactionResult) {
      console.log('Success! Results:', transactionResult);
      res.json({'transactionResult': transactionResult});
    })
    .catch(function(error) {
        if (error.response && error.response.data) {
          console.log('Error #1:', error.response.data);
          res.status(400).json({'error': error.response.data});
        } else {
          console.log('Error #2:', error);
          res.status(400).json({'error': error.toString()});
        }

      // If the result is unknown (no response body, timeout etc.) we simply resubmit
      // already built transaction:
      // server.submitTransaction(transaction);
    });
});
module.exports = router;
