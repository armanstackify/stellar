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
receiverId - secret key of the distribution account that will HOLD the assets
*/
router.post('/create', function(req, res, next) {
  console.log('============================================================================');
  console.log('CREATE ASSET');
  var issuingPublicKey;
  if (!req.body.assetCode || !req.body.assetCode.trim()) {
    res.status(400).json({'error': 'Asset Code is required.'});
    return;
  }
  try {
    // assetCode: 1-12 alphanumberic chars. e.g., BTC, USD, AstroDollars, 
    var assetCodeParam = req.body.assetCode;
    // the issuer account that created the asset
    var issuerPublicKey = config.sourcePublicKey;
    var issuerSecretKey = config.sourceSecretKey;
    var issuingKeys = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    if (req.body.issuerId && (req.body.issuerId.trim() !== "")) {
      issuingKeys = StellarSdk.Keypair.fromSecret(req.body.issuerId);
      issuingPublicKey = issuingKeys.publicKey();
    }
    if (!req.body.receiverId || !req.body.receiverId.trim()) {
      res.status(400).json({'error': 'Receiver ID is required.'});
      return;
    }
    // creating an Asset object
    var assetObj = new StellarSdk.Asset(assetCodeParam, issuingPublicKey);
    var receiverSecretKey = req.body.receiverId;
    var receivingKeys = StellarSdk.Keypair.fromSecret(receiverSecretKey);
    console.log('issuerPublicKey:', issuingPublicKey);
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
          console.log('Error in loadAccount():', error.response.data);
          res.json({'error': error.response.data});
        } else {
          console.log('Error in loadAccount():', error);
          res.json({'error': error.toString()});
        }
      });
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
Example data:
Method: POST
Headers: Content-type: application/json
Body:
{
"receiverId":"SDFWRQD4H5IPJ4UCPRWKTFTY6TW363XHRDQTTTB7VWRZUPAP3FDUJ6JM",
"assetCode":"ASTRO",
"amount":"1.0000000"
}
assetCode - a short identifier of 1–12 alphanumeric
receiverId - secret key of the distribution account
amount - number of units of credit issued
*/

// issuing an asset
router.post('/issue', function(req, res, next) {
  console.log('============================================================================');
  console.log('ISSUE ASSET');
  var issuingKeys;  // issuing account
  var receivingKeys;  // distribution account that will HOLD the assets
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
    if (req.body.amount && (typeof (req.body.amount))=="number") {
      res.status(400).json({'error': 'Amount must be in string format with 7 decimal places.'});
      return;
    }
    if (!req.body.amount || !req.body.amount.trim()) {
      res.status(400).json({'error': 'Amount is required.'});
      return;
    }

    var assetCodeParam = req.body.assetCode.trim();
    var assetAmtParam = req.body.amount.trim(); // e.g., '1.0000000'
    // Keys for accounts to issue and receive the new asset
    if (req.body.issuerId && (req.body.issuerId.trim() !== "")) {
      issuingKeys = StellarSdk.Keypair.fromSecret(req.body.issuerId);
      issuingPublicKey = issuingKeys.publicKey();
    } else {
      // the issuer account that created the asset
      issuingPublicKey = config.sourcePublicKey;
      issuerSecretKey = config.sourceSecretKey;
      issuingKeys = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    }

    if (req.body.receiverId && (req.body.receiverId.trim() !== "")){
      var receiverIdParam = req.body.receiverId.trim();
      receivingKeys = StellarSdk.Keypair.fromSecret(receiverIdParam);
      receiverPublicKey = receivingKeys.publicKey();
    }
    console.log('receiverPublicKey:', receiverPublicKey);
    console.log('issuerPublicKey:', issuingPublicKey);
    // Create an object to represent the new asset
    var assetObj = new StellarSdk.Asset(assetCodeParam, issuingPublicKey);
    var objErr;
    // First, the receiving account must trust the asset
    server.loadAccount(receiverPublicKey)
      .then(function(receiver) { // validate the account
        var trusted = receiver.balances.some(function(balance) {
          return balance.asset_code === assetCodeParam &&
                 balance.asset_issuer === issuingPublicKey;
        });
        objErr = {};
        console.log('Trusted:',trusted);
        if (trusted) {
          receiver.balances.forEach(function(balance) {
            console.log('Code:',balance.asset_code,',Type:',balance.asset_type,',Balance:',balance.balance,',Limit:',balance.limit);
            if (balance.asset_code === assetCodeParam) {
              if (balance.balance >= balance.limit || (assetAmtParam > balance.limit) ) {
                objErr.error = 'Limit exceed';
                return objErr;
              } else {
                var transaction = new StellarSdk.TransactionBuilder(receiver)
                  // The `changeTrust` operation creates (or alters) a trustline
                  // The `limit` parameter is optional
                  .addOperation(StellarSdk.Operation.changeTrust({
                    asset: assetObj
                  }))
                  .build();
                transaction.sign(receivingKeys);
                return server.submitTransaction(transaction);
              }
            }
          });
        }
      })
      // Second, the issuing account sends a payment/transfer operation using the asset
      .then(function() {
        return server.loadAccount(issuingPublicKey)
      })
      .then(function(issuer) {
        if (objErr && objErr.error) {
          return objErr;
        } else {
          var transaction = new StellarSdk.TransactionBuilder(issuer)
            .addOperation(StellarSdk.Operation.payment({
              destination: receiverPublicKey,
              asset: assetObj,
              amount: assetAmtParam
            }))
            .build();
          transaction.sign(issuingKeys);
          return server.submitTransaction(transaction);
        }
      })
      .then(function(transactionResult){
        console.log('transactionResult:',transactionResult);
        res.json({'transactionResult': transactionResult});
      })
      .catch(function(error) {
        // console.log('err:',objErr.error);
        if (objErr && objErr.error) {
          res.status(400).json({'error': objErr.error});
        }
        if (error.response && error.response.data) {
          // console.log('Error #1:', error.response.data);
          res.status(400).json({'error': error.response.data});
        } else {
          // console.log('Error #2:', error);
          res.status(400).json({'error': error.toString()});
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

module.exports = router;
