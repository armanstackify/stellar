var express = require('express');
var router = express.Router();
var config = require('../settings');
var StellarSdk = require('stellar-sdk');
var _ = require('underscore');
var logger = require('../winston');
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
assetCode - Asset to send to the account(a short identifier of 1–12 alphanumeric).
issuerId - Secret key of the issuing account that issued the asset.
receiverId - Secret key of the distribution account that will hold the asset.
*/
router.post('/create', function(req, res, next) {
  logger.log('info', '============================================================================');
  logger.log('info', 'CREATE ASSET');
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
    // the recipient account or distribution account that hold the asset
    if (!req.body.receiverId || !req.body.receiverId.trim()) {
      res.status(400).json({'error': 'Receiver ID is required.'});
      return;
    }
    var issuingKeys = StellarSdk.Keypair.fromSecret(req.body.issuerId.trim());
    issuingPublicKey = issuingKeys.publicKey();
    var assetObj = new StellarSdk.Asset(req.body.assetCode.trim(), issuingPublicKey); // creating an Asset object
    var receivingKeys = StellarSdk.Keypair.fromSecret(req.body.receiverId.trim());
    logger.log('info', 'Asset code: ' + req.body.assetCode.trim());
    logger.log('info', 'issuer PublicKey: ' + issuingPublicKey);
    logger.log('info', 'receiver PublicKey: ' + receivingKeys.publicKey());
    logger.log('info', 'getAssetType: ' + assetObj.getAssetType());
    logger.log('info', 'assetObj: ' + JSON.stringify(assetObj));
    
    server.accounts()
      .accountId(issuingPublicKey)
      .call()
      .then(function (accountResult) {
        server.loadAccount(receivingKeys.publicKey())
          .then(function(receiver){
            logger.log('info', 'Balances for receiver account ' + receivingKeys.publicKey() + ':');
            receiver.balances.forEach(function(balance) {
              logger.log('info', 'Code: '+balance.asset_code+', Balance: '+balance.balance);
            });
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
            logger.log('info', 'Successfully created asset '+req.body.assetCode.trim());
            res.json({'transactionResult': transactionResult});
          })
          .catch(function(error) {
            if (error.response && error.response.data) {
              logger.log('error', 'Error in loadAccount(receiver) from #assets/create: ' + JSON.stringify(error.response.data));
              if (error.response.status == 404) {
                res.json({'error': "Recipient Account doesn't exist or inactivated."});
              } else {
                res.json({'error': error.response.data});
              }
            } else {
              logger.log('error', 'Error in loadAccount(receiver) from #assets/create: ' + error.toString());
              res.json({'error': error.toString()});
            }
          });
      })
      .catch(function(error) {
        if (error.response && error.response.data) {
          logger.log('error', 'Error in loadAccount(issuer) from #assets/create: ' + JSON.stringify(error.response.data));
          if (error.response.status == 404) {
            res.json({'error': "Issuing Account doesn't exist or inactivated."});
          } else {
            res.json({'error': error.response.data});
          }
        } else {
          logger.log('error', 'Error in loadAccount(issuer) from #assets/create: ' + error.toString());
          res.json({'error': error.toString()});
        }
      });
  } catch(error) {
    if (error.response && error.response.data) {
      logger.log('error', 'Error A in #assets/create: ' + JSON.stringify(error.response.data));
      res.status(400).json({'error': error.response.data});
    } else {
      logger.log('error', 'Error A in #assets/create: ' + error.toString());
      res.status(400).json({'error': error.toString()});
    }
  }
});

/*
Issuing asset
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
receiverId - Account address that receives the payment(Secret Key). This is the Distribution account.
amount - Amount of the aforementioned asset to send.
*/
router.post('/issue', function(req, res, next) {
  logger.log('info', '============================================================================');
  logger.log('info', 'ISSUE ASSET');
  var issuingKeys;  // issuing account
  var receivingKeys;  // distribution account that holds any assets like ASTRODOLLARS
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
      res.status(400).json({'error': 'Amount must be in string format with 7 decimal digits.'});
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
    logger.log('info', 'Asset code: ' + assetCodeParam);
    logger.log('info', 'amount: ' + assetAmtParam);
    logger.log('info', 'issuer PublicKey: ' + issuingPublicKey);
    logger.log('info', 'receiver PublicKey: ' + receiverPublicKey);
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
            logger.log('info', 'Is trusted: ' + trusted);
            if (trusted) {
              receiver.balances.forEach(function(balance) {
                logger.log('info', 'Code: '+balance.asset_code+', Balance: '+balance.balance);
                if (balance.asset_code === assetCodeParam) {
                  if (balance.balance >= balance.limit || (assetAmtParam > balance.limit) ) {
                    objErr.error = 'Balance limit exceed';
                    return objErr;
                  }
                }
              });
              if (objErr.error === undefined) {
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
            logger.log('info', 'Successfully issue with assetCode: ' + assetCodeParam + ', amount: ' + assetAmtParam);
            res.json({'transactionResult': transactionResult});
          })
          .catch(function(error) {
            if (objErr && objErr.error) {
              logger.log('error', 'objErr from #assets/issue: ' + objErr.error);
              res.status(400).json({'error': objErr.error});
            }
            if (error.response && error.response.data) {
              logger.log('error', 'Error in loadAccount(receiverPublicKey) from #assets/issue: ' + JSON.stringify(error.response.data));
              res.status(400).json({'error': error.response.data});
            } else {
              logger.log('error', 'Error in loadAccount(receiverPublicKey) from #assets/issue: ' + error.toString());
              res.status(400).json({'error': error.toString()});
            }
          });
      })
      .catch(function (error) {
        if (error.response && error.response.data) {
          logger.log('error', 'Error in loadAccount(issuingPublicKey) from #assets/issue: ' + JSON.stringify(error.response.data));
          if (error.response.status == 404) {
            res.json({'error': "Issuing Account doesn't exist or inactivated."});
          } else {
            res.json({'error': error.response.data});
          }
        } else {
          logger.log('error', 'Error in loadAccount(issuingPublicKey) from #assets/issue: ' + error.toString());
          res.json({'error': error.toString()});
        }
      });
  } catch(error) {
    if (error.response && error.response.data) {
      logger.log('error', 'Error A in #assets/issue: ' + JSON.stringify(error.response.data));
      res.status(400).json({'error': error.response.data});
    } else {
      logger.log('error', 'Error A in #assets/issue: ' +  error.toString());
      res.status(400).json({'error': error.toString()});
    }
  }
});

/*
Transfer asset from one account to another account
Method: POST
Headers: Content-type: application/json
Body:
{
"assetCode":"ABC",
"amount": "1",
"issuerId":"SCSGGRV4M24KGJJ4GZYFJKJZADHO3632MY6ZF33A6FLRKPYKZ6ANCMPY",
"distributorId":"SCQSL3RUV3BLN7JXXFIQDE5F2PMVVLFUY3546HY3HG6LTUYHBAI7F32C",
"receiverId":"SDXPFHOZ7INZP2PKJ6GV6SOKNWZZ55HDBUUL3NSQMI7HICYMFXG2OST7" 
}
issuerId – Secret key of the issuing account that issued the asset.
assetCode - Asset to send to the receiver account(a short identifier of 1–12 alphanumeric).
amount - Amount of the aforementioned asset to send.
receiverId - Account address(Secret key) that will receive the asset.
distributorId - Account address(Distributor account Secret key) that will send the asset to another account.
*/
router.post('/transfer', function(req, res, next) {
  logger.log('info', '============================================================================');
  logger.log('info', 'TRANSFER ASSET');
  var issuerPublicKey;
  var issuerSecretKey;
  var distributorSecretKey;
  var distributorPublicKey;
  var receivingPublicKey;
  try {
    var assetAmtParam = req.body.amount.trim();
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
      res.status(400).json({'error': 'Amount must be in string format with 7 decimal digits.'});
      return;
    }
    if (!req.body.amount || !req.body.amount.trim()) {
      res.status(400).json({'error': 'Amount is required.'});
      return;
    }
    if (req.body.distributorId.trim() === req.body.issuerId.trim()) {
      res.status(400).json({'error': 'The Distributor ID cannot be the same with Issuer ID.'});
      return;
    }
    if (req.body.issuerId && (req.body.issuerId.trim() !== "")) {
      issuerSecretKey = req.body.issuerId.trim();
      issuingKey = StellarSdk.Keypair.fromSecret(issuerSecretKey);
      issuerPublicKey = issuingKey.publicKey();
    }
    if (req.body.distributorId && (req.body.distributorId.trim() !== "")) {
      distributorSecretKey = req.body.distributorId.trim();
      distributorKeys = StellarSdk.Keypair.fromSecret(distributorSecretKey);
      distributorPublicKey = distributorKeys.publicKey();
    }
    if (req.body.receiverId && (req.body.receiverId.trim() !== "")) {
      receivingKeys = StellarSdk.Keypair.fromSecret(req.body.receiverId.trim());
      receivingPublicKey = receivingKeys.publicKey();
    }
    var assetCodeParam = req.body.assetCode.trim();
    logger.log('info', 'Asset code: ' + assetCodeParam);
    logger.log('info', 'amount: ' + assetAmtParam);
    logger.log('info', 'issuerPublicKey: ' + issuerPublicKey);
    logger.log('info', 'distributorPublicKey: ' + distributorPublicKey);
    logger.log('info', 'receiverPublicKey: ' + receivingPublicKey);
    // First, check to make sure that the destination account exists.
    server.loadAccount(receivingPublicKey)
      // If the account is not found, surface a nicer error message for logging.
      .catch(StellarSdk.NotFoundError, function (error) {
        logger.log('info', 'The destination account ' + receivingPublicKey + ' does not exist!');
        res.status(400).json({'error': 'The destination account ' + receivingPublicKey + ' does not exist!'});
        throw new Error('The destination account ' + receivingPublicKey + ' does not exist!');
      })
      // If there was no error, load up-to-date information on your account.
      .then(function(receiver) {
        logger.log('info', 'Balances for receiver account ' + receivingPublicKey + ':');
        receiver.balances.forEach(function(balance) {
          logger.log('info', 'Code: '+balance.asset_code+', Balance: '+balance.balance);
        });
        return server.loadAccount(distributorPublicKey);
      })
      .then(function(distributorAccount) {
        logger.log('info','Balances for distributor account ' + distributorPublicKey + ':');
        distributorAccount.balances.forEach(function(balance) {
          logger.log('info', 'Code: '+balance.asset_code+', Balance: '+balance.balance);
        });
        var trusted = distributorAccount.balances.some(function(balance) { // lets validate the account
          return balance.asset_code === assetCodeParam &&
                 balance.asset_issuer === issuerPublicKey;
        });
        objErr = {};
        logger.log('info', 'Is trusted: ' + trusted);
        var assetObj = new StellarSdk.Asset(assetCodeParam, issuerPublicKey);
        var transaction = new StellarSdk.TransactionBuilder(distributorAccount)
          .addOperation(StellarSdk.Operation.payment({
            destination: receivingPublicKey,
            asset: assetObj,
            amount: assetAmtParam
          }))
          // A memo allows you to add your own metadata to a transaction. It's
          // optional and does not affect how Stellar treats the transaction.
          // .addMemo(StellarSdk.Memo.text('Test Transaction'))
          .build();
        // Sign the transaction to prove you are actually the person sending it.
        transaction.sign(distributorKeys);
        return server.submitTransaction(transaction);
      })
      .then(function(transactionResult) {
        logger.log('info', 'Successfully moved asset ' + assetCodeParam + ' from ' + distributorPublicKey + ' to ' + receivingPublicKey);
        res.json({'transactionResult': transactionResult});
      })
      .catch(function(error) {
        // if error code = op_no_trust, the receiver don't have a trustline to issuer
        if (error.response && error.response.data) {
          var err = error.response.data;
          var errOp = err['extras']['result_codes']['operations'];
          logger.log('error', 'Error A in #assets/transfer: ' + JSON.stringify(error.response.data));
          if (_.contains(errOp, 'op_no_trust')) {
            res.status(400).json({'error': 'Receiver ID don\'t have a trustline from the issuing account.'});
          } else {
            res.status(400).json({'error': error.response.data});
          }
        } else {
          logger.log('error', 'Error A in #assets/transfer: ' + error.toString());
          res.status(400).json({'error': error.toString()});
        }
      });
  } catch(error) {
    if (error.response && error.response.data) {
      logger.log('error', 'Error B in #assets/transfer: ' + JSON.stringify(error.response.data));
      res.status(400).json({'error': error.response.data});
    } else {
      logger.log('error', 'Error B in #assets/transfer: ' +  error.toString());
      res.status(400).json({'error': error.toString()});
    }
  }
});

module.exports = router;
