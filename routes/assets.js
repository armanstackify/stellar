var express = require('express');
var router = express.Router();

var StellarSdk = require('stellar-sdk');
// Uncomment the following line to build transactions for the live network. Be
// sure to also change the horizon hostname.
// StellarSdk.Network.usePublicNetwork();
StellarSdk.Network.useTestNetwork();

/*
Example jsondata for Body:
{"assetCode":"AstroDollars","issuerId":"SCZANGBA5YHTNYVVV4C3U252E2B6P6F5T3U6MM63WBSBZATAQI3EBTQ4"}
*/
router.post('/create', function(req, res, next) {
  console.log('============================================================================');
  console.log('CREATE ASSET');
  // console.log('body', req.body);
  var assetCodeParam = req.body.assetCode;
  var issueKeyParam = req.body.issuerId;
  // var receivingKeyParam = req.body.receivingKey;

  var issuingKeys = StellarSdk.Keypair.fromSecret(issueKeyParam);
  // var receivingKeys = StellarSdk.Keypair.fromSecret(receivingKeyParam);

  // creating an Asset
  var asset = new StellarSdk.Asset(assetCodeParam, issuingKeys.publicKey());

  res.json({'asset': asset});

});

module.exports = router;
