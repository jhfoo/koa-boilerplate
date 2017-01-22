var fs = require('fs'),
  koa = require('koa'),
  log4js = require('log4js');

var app = koa(),
  logger = log4js.getLogger(),
  CONFIG_FILENAME = 'config.json',
  config = loadConfig(CONFIG_FILENAME);

app.listen(config.WebService.ServicePort);
logger.info('Listening on port ' + config.WebService.ServicePort);

function loadConfig(filename) {
  // auto create
  if (!fs.existsSync(filename))
    fs.closeSync(fs.openSync(filename, 'w'));
  var RawJson = fs.readFileSync(filename, {
    encoding: 'utf8'
  });
  logger.debug(typeof RawJson );
  logger.debug('"' + RawJson + '"');

  return applyDefaults(RawJson === '' ? {} : JSON.parse(RawJson), 
    JSON.parse(fs.readFileSync('defaults.json')));
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