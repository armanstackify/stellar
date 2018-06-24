var stellarNetwork = "test";

var config;
if (process.env.stellarNetwork == "test") {
  config = {
    stellarServer: 'https://horizon-testnet.stellar.org',
    stellarNetwork: "test"
  };
} else {
  config = {
    stellarServer: 'https://horizon.stellar.org',
    stellarNetwork: 'public'
  };
}

module.exports = config;
