var fs = require('fs'),
  koa = require('koa'),
  KoaStatic = require('koa-static'),
  log4js = require('log4js');

// constants
var DEFAULT_CONFIG_FILENAME = 'defaults.json',
  CONFIG_FILENAME = 'config.json';

var app = koa(),
  logger = log4js.getLogger(),
  config = loadConfig(CONFIG_FILENAME);

// koa middlewares
if (!fs.existsSync(__dirname + '/' + config.WebService.PublicPath)) {
  fs.mkdirSync(__dirname + '/' + config.WebService.PublicPath);
}
app.use(KoaStatic(__dirname + '/' + config.WebService.PublicPath));
logger.info('Public folder: ' + '/' + config.WebService.PublicPath);

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
  Object.keys(defaults).forEach ((key) => {
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