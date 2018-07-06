var express = require('express');
var router = express.Router();
var config = require('../settings');
var StellarSdk = require('stellar-sdk');

var server = new StellarSdk.Server(config.stellarServer);

if (config.stellarNetwork === "test") {
  StellarSdk.Network.useTestNetwork();
} else {
  StellarSdk.Network.usePublicNetwork();
}

/*
Asset creation
Method: POST
Headers: Content-type: application/json
Body:
{
"issuerId":"SATVM4BDCM43CKO3U3OJKIJRXRN3J4YVGVESM7NIEZAUFCCN66UOHZKK",
"receiverId":"SBALK4G6X6QKMMR7VNDKOAQNPQFUCULAC3V7FO5TIGSGR2BI2YLVFTGJ",
"assetCode":"AstroDollar"
}
assetCode - Asset to send to the distribution account(a short identifier of 1–12 alphanumeric).
issuerId - Secret key of the issuing account that issued the asset.
receiverId - Secret key of the distribution account that will hold the asset.
*/
router.post('/create', function(req, res, next) {
  console.log('============================================================================');
  console.log('CREATE ASSET');
  var issuingPublicKey;

  try {
    // assetCode: 1-12 alphanumberic chars. e.g., BTC, USD
    if (!req.body.assetCode || !req.body.assetCode.trim()) {
      res.status(400).json({'error': 'Asset Code is required.'});
      return;
    }
    // the issuer account that created the asset
    if (!req.body.issuerId || !req.body.issuerId.trim()) {
      res.status(400).json({'error': 'Issuer ID is required.'});
      return;
    }
    if (!req.body.receiverId || !req.body.receiverId.trim()) {
      res.status(400).json({'error': 'Receiver ID is required.'});
      return;
    }
    var issuingKeys = StellarSdk.Keypair.fromSecret(req.body.issuerId.trim());
    issuingPublicKey = issuingKeys.publicKey();
    var assetObj = new StellarSdk.Asset(req.body.assetCode.trim(), issuingPublicKey); // creating an Asset object
    var receivingKeys = StellarSdk.Keypair.fromSecret(req.body.receiverId.trim());
    console.log('issuer PublicKey:', issuingPublicKey);
    console.log('receiver PublicKey:', receivingKeys.publicKey());
    console.log('getAssetType:',assetObj.getAssetType());
    console.log('assetObj:',assetObj);
    
    server.accounts()
      .accountId(issuingPublicKey)
      .call()
      .then(function (accountResult) {
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
              console.log('Error in loadAccount(receiver):', error.response.data);
              if (error.response.status == 404) {
                res.json({'error': "Recipient Account doesn't exist or inactivated."});
              } else {
                res.json({'error': error.response.data});
              }
            } else {
              console.log('Error in loadAccount(receiver):', error);
              res.json({'error': error.toString()});
            }
          });
      })
      .catch(function(error) {
        if (error.response && error.response.data) {
          console.log('Error in loadAccount(issuer):', error.response.data);
          if (error.response.status == 404) {
            res.json({'error': "Issuing Account doesn't exist or inactivated."});
          } else {
            res.json({'error': error.response.data});
          }
        } else {
          console.log('Error in loadAccount(issuer):', error);
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
"issuerId":"SCTUKKPQNYOKG735BBAB7XZZW4JWOBBIE6PE6O4TH2FKV4QCFV7H6AVX",
"receiverId":"SDO65O5OJQ3PMUHT32RCAWTVXXFMOHDXXPL2CHJSIEWLNLXTWAKPD6U4",
"assetCode":"ABC",
"amount":"10.0000000"
}
assetCode - Asset to send to the destination account(a short identifier of 1–12 alphanumeric).
issuerId – Secret key of the issuing account that issued the asset.
receiverId - Account address that receives the payment(Secret Key).
amount - Amount of the aforementioned asset to send.
*/

// issuing an asset
router.post('/issue', function(req, res, next) {
  console.log('============================================================================');
  console.log('ISSUE ASSET');
  var issuingKeys;  // issuing account
  var receivingKeys;  // distribution account that holds any assets
  var issuingPublicKey;
  var issuerSecretKey;
  var receiverPublicKey;

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
    if (req.body.amount && (typeof (req.body.amount))=="number") {
      res.status(400).json({'error': 'Amount must be in string format with 7 decimal places.'});
      return;
    }
    if (!req.body.amount || !req.body.amount.trim()) {
      res.status(400).json({'error': 'Amount is required.'});
      return;
    }

    var assetCodeParam = req.body.assetCode.trim();
    var assetAmtParam = req.body.amount.trim();
    // Keys for accounts to issue and receive the asset
    issuingKeys = StellarSdk.Keypair.fromSecret(req.body.issuerId.trim()); // the issuer account that created the asset
    issuingPublicKey = issuingKeys.publicKey();
    receivingKeys = StellarSdk.Keypair.fromSecret(req.body.receiverId.trim());
    receiverPublicKey = receivingKeys.publicKey();
    console.log('issuer PublicKey:', issuingPublicKey);
    console.log('receiver PublicKey:', receiverPublicKey);
    var assetObj = new StellarSdk.Asset(assetCodeParam, issuingPublicKey); // Create an object to represent the new asset
    var objErr;

    server.accounts()
      .accountId(issuingPublicKey)
      .call()
      .then(function(accountResult) {
        // First, the receiving account must trust the asset
        server.loadAccount(receiverPublicKey)
          .then(function(receiver) {
            var trusted = receiver.balances.some(function(balance) { // lets validate the account
              return balance.asset_code === assetCodeParam &&
                     balance.asset_issuer === issuingPublicKey;
            });
            objErr = {};
            console.log('Is trusted:',trusted);
            if (trusted) {
              receiver.balances.forEach(function(balance) {
                console.log('Code:',balance.asset_code,'Type:',balance.asset_type,',Balance:',balance.balance);
                if (balance.asset_code === assetCodeParam) {
                  if (balance.balance >= balance.limit || (assetAmtParam > balance.limit) ) {
                    objErr.error = 'Balance limit exceed';
                    return objErr;
                  } else {
                    var transaction = new StellarSdk.TransactionBuilder(receiver)
                      // The `changeTrust` operation creates (or alters) a trustline
                      // The `limit` parameter is optional
                      .addOperation(StellarSdk.Operation.changeTrust({
                        asset: assetObj
                      }))
                      .addOperation(StellarSdk.Operation.setOptions({
                        setFlags: StellarSdk.AuthRevocableFlag | StellarSdk.AuthRequiredFlag
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
            if (objErr && objErr.error) {
              res.status(400).json({'error': objErr.error});
            }
            if (error.response && error.response.data) {
              console.log('Error in loadAccount(receiver):', error.response.data);
              res.status(400).json({'error': error.response.data});
            } else {
              console.log('Error in loadAccount(receiver):', error);
              res.status(400).json({'error': error.toString()});
            }
          });
      })
      .catch(function (error) {
        if (error.response && error.response.data) {
          console.log('Error in loadAccount(issuer):', error.response.data);
          if (error.response.status == 404) {
            res.json({'error': "Issuing Account doesn't exist or inactivated."});
          } else {
            res.json({'error': error.response.data});
          }
        } else {
          console.log('Error in loadAccount(issuer):', error);
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

module.exports = router;
