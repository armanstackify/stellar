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
      console.log('Error A:', error.response.data);
      res.status(400).json({'error': error.response.data});
    } else {
      console.log('Error B:', error);
      res.status(400).json({'error': error.toString()});
    }
  }
});

// sending lumens to another account
router.post('/send', function(req, res, next){
  console.log('============================================================================');
  console.log('SEND ASSET');
  // the issuer account that created the asset
  var issuingPublicKey = config.sourcePublicKey;
  var issuerSecretKey = config.sourceSecretKey;
  var receiverIdParam = req.body.receiverId;
  var assetAmtParam = req.body.amount.trim(); // e.g., '1.0000000'
  var issuingKeys = StellarSdk.Keypair.fromSecret(issuerSecretKey);
  if (req.body.distributorId && (req.body.distributorId.trim() !== "")) {
    issuerSecretKey = req.body.distributorId.trim();
    issuingKeys = StellarSdk.Keypair.fromSecret(issuerSecretKey);
    issuingPublicKey = issuingKeys.publicKey();
  }
  if (req.body.receiverId && (req.body.receiverId.trim() !== "")) {
    receivingKeys = StellarSdk.Keypair.fromSecret(req.body.receiverId.trim());
    receivingPublicKey = receivingKeys.publicKey();
  }
  var assetCodeParam = req.body.assetCode.trim();
  // Transaction will hold a built transaction we can resubmit if the result is unknown.
  var transaction;
  console.log('receiverPublicKey:', receivingPublicKey);
  console.log('issuerPublicKey:', issuingPublicKey);
  // First, check to make sure that the destination account exists.
  server.loadAccount(receivingPublicKey)
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
      console.log('Balances for distribution account: ' + issuingPublicKey);
      sourceAccount.balances.forEach(function(balance) {
        console.log('Code:',balance.asset_code,'Type:',balance.asset_type,',Balance:',balance.balance);
      });

      var trusted = sourceAccount.balances.some(function(balance) { // lets validate the account
        return balance.asset_code === assetCodeParam &&
               balance.asset_issuer === issuingPublicKey;
      });
      objErr = {};
      console.log('Is trusted:',trusted);
      // Create an object to represent the new asset
      var assetObj = new StellarSdk.Asset(assetCodeParam, issuingPublicKey);
      // Start building the transaction.
      transaction = new StellarSdk.TransactionBuilder(sourceAccount)
        .addOperation(StellarSdk.Operation.payment({
          destination: receivingPublicKey,
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
        console.log('Error A:', JSON.stringify(error.response.data));
        res.status(400).json({'error': error.response.data});
      } else {
        console.log('Error B:', JSON.stringify(error));
        res.status(400).json({'error': error.toString()});
      }
    });
});

// distribute asset
router.post('/send1', function(req, res, next) {
  console.log('============================================================================');
  console.log('ISSUE ASSET');
  var issuingKeys;  // issuing account
  var receivingKeys;  // distribution account that holds any assets
  var issuingPublicKey;
  var issuerSecretKey;
  var receiverPublicKey;

  try {
    if (!req.body.distributorId || !req.body.distributorId.trim()) {
      res.status(400).json({'error': 'distributor ID is required.'});
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
    issuingKeys = StellarSdk.Keypair.fromSecret(req.body.distributorId.trim()); // the issuer account that created the asset
    issuingPublicKey = issuingKeys.publicKey();
    receivingKeys = StellarSdk.Keypair.fromSecret(req.body.receiverId.trim());
    receiverPublicKey = receivingKeys.publicKey();
    console.log('issuer PublicKey:', issuingPublicKey);
    console.log('receiver PublicKey:', receiverPublicKey);
    var assetObj = new StellarSdk.Asset(assetCodeParam, issuingPublicKey); // Create an object to represent the new asset
    var objErr;

    server.accounts()
      .accountId(receiverPublicKey)
      .call()
      .then(function(accountResult) {
        // First, check to make sure that the destination account exists.
        server.loadAccount(issuingPublicKey)
          .then(function(sourceAccount) {
            var trusted = sourceAccount.balances.some(function(balance) { // lets validate the account
              return balance.asset_code === assetCodeParam &&
                     balance.asset_issuer === issuingPublicKey;
            });
            objErr = {};
            console.log('Is trusted:',trusted);
              // sourceAccount.balances.forEach(function(balance) {
              //   console.log('Code:',balance.asset_code,'Type:',balance.asset_type,',Balance:',balance.balance);
              //   if (balance.asset_code === assetCodeParam) {
              //     if (balance.balance >= balance.limit || (assetAmtParam > balance.limit) ) {
              //       objErr.error = 'Balance limit exceed';
              //       return objErr;
              //     }

              //   }
              // });

            var transaction = new StellarSdk.TransactionBuilder(sourceAccount)
                .addOperation(StellarSdk.Operation.payment({
                  destination: receiverPublicKey,
                  // Because Stellar allows transaction in many currencies, you must
                  // specify the asset type. The special "native" asset represents Lumens.
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
            if (objErr && objErr.error) {
              res.status(400).json({'error': objErr.error});
            } else if (error.response && error.response.data) {
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
            res.json({'error': "Destination Account doesn't exist or inactivated."});
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

// send custom-asset to another account
/*
Example data:
Method: POST
Headers: Content-type: application/json
Body:
{
"assetCode":"ABC",
"amount": "1.0",
"issuerId":"GCX63KJNYZLL6AOXQ37EAV5Q2D2RD4XINS52CVF55FSJASJSJL7QSBTJ",
"distributorId":"SCQSL3RUV3BLN7JXXFIQDE5F2PMVVLFUY3546HY3HG6LTUYHBAI7F32C",
"receiverId":"SDXPFHOZ7INZP2PKJ6GV6SOKNWZZ55HDBUUL3NSQMI7HICYMFXG2OST7" 
}
issuerId – Secret key of the issuing account that issued the asset.
assetCode - Asset to send to the receiver account(a short identifier of 1–12 alphanumeric).
amount - Amount of the aforementioned asset to send.
receiverId - Account address that receives the payment(Secret Key).
distributorId - Account address that send the asset.
*/
router.post('/send2', function(req, res, next) {
  console.log('============================================================================');
  console.log('SEND ASSET');
  // the issuer account that created the asset
  var distributorKey = config.sourcePublicKey;
  var distributorSecretKey = config.sourceSecretKey;
  var receiverIdParam = req.body.receiverId;
  var assetAmtParam = req.body.amount.trim(); // e.g., '1.0000000'
  var distributorKeys = StellarSdk.Keypair.fromSecret(distributorSecretKey);

  if (!req.body.issuerId || !req.body.issuerId.trim()) {
    res.status(400).json({'error': 'Asset Issuer ID is required.'});
    return;
  }
  if (!req.body.distributorId || !req.body.distributorId.trim()) {
    res.status(400).json({'error': 'Distributor ID is required.'});
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
  if (req.body.issuerId && (req.body.issuerId.trim() !== "")) {
    var issuerPublicKey = req.body.issuerId.trim();
  }
  if (req.body.distributorId && (req.body.distributorId.trim() !== "")) {
    distributorSecretKey = req.body.distributorId.trim();
    distributorKeys = StellarSdk.Keypair.fromSecret(distributorSecretKey);
    distributorKey = distributorKeys.publicKey();
  }
  if (req.body.receiverId && (req.body.receiverId.trim() !== "")) {
    receivingKeys = StellarSdk.Keypair.fromSecret(req.body.receiverId.trim());
    receivingPublicKey = receivingKeys.publicKey();
  }
  var assetCodeParam = req.body.assetCode.trim();
  // Transaction will hold a built transaction we can resubmit if the result is unknown.
  var transaction;
  console.log('receiverPublicKey:', receivingPublicKey);
  console.log('distributorKey:', distributorKey);
  // First, check to make sure that the destination account exists.
  server.loadAccount(receivingPublicKey)
    // If the account is not found, surface a nicer error message for logging.
    .catch(StellarSdk.NotFoundError, function (error) {
      res.status(400).json({'error': 'The destination account does not exist!'});
      throw new Error('The destination account does not exist!');
    })
    // If there was no error, load up-to-date information on your account.
    .then(function() {
      return server.loadAccount(distributorKey);
    })
    .then(function(distributorAccount) {
      // console.log('Balances for distribution account: ' + distributorKey);
      // distributorAccount.balances.forEach(function(balance) {
      //   console.log('Code:',balance.asset_code,'Type:',balance.asset_type,',Balance:',balance.balance);
      // });
      var trusted = distributorAccount.balances.some(function(balance) { // lets validate the account
        return balance.asset_code === assetCodeParam &&
               balance.asset_issuer === issuerPublicKey;
      });
      objErr = {};
      console.log('Is trusted:',trusted);
      // Create an object to represent the new asset
      var assetObj = new StellarSdk.Asset(assetCodeParam, issuerPublicKey);
      // Start building the transaction.
      transaction = new StellarSdk.TransactionBuilder(distributorAccount)
        .addOperation(StellarSdk.Operation.payment({
          destination: receivingPublicKey,
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
      transaction.sign(distributorKeys);
      return server.submitTransaction(transaction);
    })
    .then(function(transactionResult) {
      console.log('Success! Results:', transactionResult);
      res.json({'transactionResult': transactionResult});
    })
    .catch(function(error) {
      if (error.response && error.response.data) {
        console.log('Error A:', error.response.data);
        res.status(400).json({'error': error.response.data});
      } else {
        console.log('Error B:', error);
        res.status(400).json({'error': error.toString()});
      }
    });
});

module.exports = router;
