var config;
if (process.env.stellarNetwork == "test") {
  config = {
    stellarServer: 'https://horizon-testnet.stellar.org',
    stellarNetwork: 'test',
    sourcePublicKey: 'GAEYK7EAZCKAFCMIJLOBBHEACGYGSGRKF6CC3DZHKQFOGJLMX4TKAZWH',
    sourceSecretKey: 'SDXPEKCSEOBZQX7FPJQBEKWXI4RQBCLN3ZM3TQMFKBUW6RIRBX7MJSUQ',
    startingBalance: '2.0000000'
  };
} else {
  config = {
    stellarServer: 'https://horizon.stellar.org',
    stellarNetwork: 'public',
    sourcePublicKey: 'GAEYK7EAZCKAFCMIJLOBBHEACGYGSGRKF6CC3DZHKQFOGJLMX4TKAZWH',
    sourceSecretKey: 'SDXPEKCSEOBZQX7FPJQBEKWXI4RQBCLN3ZM3TQMFKBUW6RIRBX7MJSUQ',
    startingBalance: '2.0000000'
  };
}

module.exports = config;
