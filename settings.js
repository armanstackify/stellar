var useTestNetwork = true;

var config;
if (process.env.useTestNetwork == "true") {
  config = {
    stellarServer: 'https://horizon-testnet.stellar.org',
    useTestNetwork: true
  };
} else {
  config = {
    stellarServer: 'https://horizon.stellar.org',
    useTestNetwork: false
  };
}

module.exports = config;
