var fs = require('fs'),
  koa = require('koa'),
  KoaStatic = require('koa-static'),
  router = require('koa-router')(),
  log4js = require('log4js');

// constants
var DEFAULT_CONFIG_FILENAME = 'defaults.json',
  CONFIG_FILENAME = 'config.json';

var app = koa(),
  logger = log4js.getLogger(),
  config = loadConfig(CONFIG_FILENAME);

// koa middlewares
// logger
app.use(function* (next) {
  var start = new Date;
  yield next;
  var ms = new Date - start;
  logger.debug('%s %s - %s', this.method, this.url, ms);
});

// custom error response
app.use(function* (next) {
  try {
    yield next;
  } catch (err) {
    // some errors will have .status
    // however this is not a guarantee
    this.status = err.status || 500;
    this.type = 'html';
    this.body = '<p>Something <em>exploded</em> (' + err.message + '), please contact someone.</p>';

    // since we handled this manually we'll
    // want to delegate to the regular app
    // level error handling as well so that
    // centralized still functions correctly.
    this.app.emit('error', err, this);
  }
});

// custom responses load here
router.get('/error', function *(next) {
  this.body = 'boo';
  throw new Error('Oh noes!');

});
app.use(router.routes());
app.use(router.allowedMethods());

// setup static folder
if (!fs.existsSync(__dirname + '/' + config.WebService.PublicPath)) {
  fs.mkdirSync(__dirname + '/' + config.WebService.PublicPath);
}
app.use(KoaStatic(__dirname + '/' + config.WebService.PublicPath));
logger.info('Public folder: ' + '/' + config.WebService.PublicPath);

// error handler
app.on('error', function (err) {
  logger.error(err);
});

// start listening
app.listen(config.WebService.ServicePort);
logger.info('Listening on port ' + config.WebService.ServicePort);

function loadConfig(filename) {
  // auto create
  if (!fs.existsSync(filename))
    fs.closeSync(fs.openSync(filename, 'w'));
  var RawJson = fs.readFileSync(filename, {
    encoding: 'utf8'
  });

  return applyDefaults(RawJson === '' ? {} : JSON.parse(RawJson),
    JSON.parse(fs.readFileSync(DEFAULT_CONFIG_FILENAME)));
}

function applyDefaults(config, defaults) {
  Object.keys(defaults).forEach((key) => {
    if (!(key in config))
      config[key] = defaults[key];
    else {
      logger.debug(key + ' = ' + typeof (defaults[key]));
      if (typeof defaults[key] === 'object')
        applyDefaults(config[key], defaults[key]);
    }
  });
  return config;
}