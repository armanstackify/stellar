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
    sourcePublicKey: 'GAEYK7EAZCKAFCMIJLOBBHEACGYGSGRKF6CC3DZHKQFOGJLMX4TKAZWH',
    sourceSecretKey: 'SDXPEKCSEOBZQX7FPJQBEKWXI4RQBCLN3ZM3TQMFKBUW6RIRBX7MJSUQ',
    startingBalance: '3.0000000'
  };
} else {
  config = {
    stellarServer: 'https://horizon.stellar.org',
    stellarNetwork: 'public',
    sourcePublicKey: 'GAEYK7EAZCKAFCMIJLOBBHEACGYGSGRKF6CC3DZHKQFOGJLMX4TKAZWH',
    sourceSecretKey: 'SDXPEKCSEOBZQX7FPJQBEKWXI4RQBCLN3ZM3TQMFKBUW6RIRBX7MJSUQ',
    startingBalance: '5.0000000'
  };
}

module.exports = config;
