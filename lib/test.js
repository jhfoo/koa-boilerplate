var router = require('koa-router')();

router.get('/ping', function *(next) {
  this.body = 'pong';
});

router.get('/error', function *(next) {
  this.body = 'boo';
  throw new Error('Oh noes!');
});

module.exports = router;