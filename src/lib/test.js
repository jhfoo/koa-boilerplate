var router = require('koa-router')();

router.get('/ping', (ctx, next) => {
  ctx.body = 'pong';
});

router.get('/error', (ctx, next) => {
  ctx.body = 'boo';
  throw new Error('Oh noes!');
});

module.exports = router;