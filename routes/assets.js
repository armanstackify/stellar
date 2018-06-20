var express = require('express');
var router = express.Router();

router.get('/create', function(req, res, next) {
  res.send('assets..');
});

module.exports = router;
