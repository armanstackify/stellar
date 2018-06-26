var stellarNetwork = "test";

var config;
// if (process.env.stellarNetwork == "test") {
//   config = {
//     stellarServer: 'https://horizon-testnet.stellar.org',
//     stellarNetwork: 'test',
//     sourcePublicKey: 'GBT2KE7PLEUGWE3Y4HY5G2YUOFA6TFYDLAOJUGZ5DCA5MBTHF4KTC56S',
//     sourceSecretKey: 'SCEEQKMQLBSEGXWLX73F43X3ACMQPTLH35HZTU2SAANSJPRG7CNVBHR6'
//   };
// } else {
//   config = {
//     stellarServer: 'https://horizon.stellar.org',
//     stellarNetwork: 'public',
//     sourcePublicKey: 'GBT2KE7PLEUGWE3Y4HY5G2YUOFA6TFYDLAOJUGZ5DCA5MBTHF4KTC56S',
//     sourceSecretKey: 'SCEEQKMQLBSEGXWLX73F43X3ACMQPTLH35HZTU2SAANSJPRG7CNVBHR6'
//   };
// }

if (process.env.stellarNetwork == "test") {
  config = {
    stellarServer: 'https://horizon-testnet.stellar.org',
    stellarNetwork: 'test',
    sourcePublicKey: 'GAGF3RVJ2RGIENPZ7TWQKH4M4ZBMYXQRPD5542EPKNAG4EOLEFCZ4IPL',
    sourceSecretKey: 'SA7DW25HNGU2EQVOF7NBVKJTURS6Y4TTRPIJ3ZMOR7XYHYCHVBI7OEUT'
  };
} else {
  config = {
    stellarServer: 'https://horizon.stellar.org',
    stellarNetwork: 'public',
    sourcePublicKey: 'GAGF3RVJ2RGIENPZ7TWQKH4M4ZBMYXQRPD5542EPKNAG4EOLEFCZ4IPL',
    sourceSecretKey: 'SA7DW25HNGU2EQVOF7NBVKJTURS6Y4TTRPIJ3ZMOR7XYHYCHVBI7OEUT'
  };
}

module.exports = config;
