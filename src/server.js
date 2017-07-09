// constants
const DEFAULT_CONFIG_FILENAME = 'defaults.json',
  CONFIG_FILENAME = 'config.json';

var fs = require('fs'),
  path = require('path'),
  koa = require('koa'),
  KoaStatic = require('koa-static'),
  router = require('koa-router')(),
  log4js = require('log4js'),
  http = require('http'),
  TestRoute = require('./lib/test');

// console logging only before config is loaded
log4js.configure({
  appenders: {
    console: {
      type: 'stdout'
    }
  },
  categories: {
    default: {
      appenders: ['console'],
      level: 'debug'
    }
  }
});

var app = new koa(),
  server = http.createServer(app.callback()),
  io = require('socket.io')(server),
  logger = log4js.getLogger(),
  config = loadConfig(CONFIG_FILENAME);

// include file logging after config is loaded
logger.debug(config.logging.FinalLogPath);
log4js.configure({
  appenders: {
    console: {
      type: 'stdout'
    },
    file: {
      type: 'file',
      filename: config.logging.FinalLogPath + '/www.log',
      maxLogSize: 64 * 1024,
      backups: 7
    }
  },
  categories: {
    default: {
      appenders: ['console', 'file'],
      level: 'debug'
    }
  }
});

autoCreateFolders();

// koa middlewares
// logger
app.use(async(ctx, next) => {
  var start = new Date;
  await next();
  var ms = new Date - start;
  logger.debug('%s %s - %s', ctx.method, ctx.url, ms);
});

// custom error response
app.use(async(ctx, next) => {
  try {
    await next();
  } catch (err) {
    // some errors will have .status
    // however this is not a guarantee
    ctx.status = err.status || 500;
    ctx.type = 'html';
    ctx.body = '<p>Something <em>exploded</em> (' + err.message + '), please contact someone.</p>';
    logger.error(err);

    // since we handled this manually we'll
    // want to delegate to the regular app
    // level error handling as well so that
    // centralized still functions correctly.
    ctx.app.emit('error', err, this);
  }
});

// custom responses load here
app.use(TestRoute.routes());
// app.use(router.allowedMethods());

app.use(KoaStatic(config.WebService.FinalPublicPath, {
  index: 'index.htm'
}));
logger.info('Public folder: ' + config.WebService.FinalPublicPath);

// error handler
app.on('error', function (err) {
  logger.error(err);
});

// setup socket.io events
io.on('connection', (socket) => {
  logger.debug('New Socket.io connection');
  // NOTE: PING is a reserved event!
  socket.on('pingy', (data) => {
    logger.debug('PINGY received: ' + data);
    socket.emit('pingy', 'pongy: ' + data);
  });
});


// start listening
// NOTE: app.listen() doesn't enable socket.io. Use server.listen()
server.listen(config.WebService.ServicePort);
logger.info('Listening on port ' + config.WebService.ServicePort);

function autoCreateFolders() {
  // setup static folder
  if (!fs.existsSync(config.WebService.FinalPublicPath)) {
    fs.mkdirSync(config.WebService.FinalPublicPath);
  }

  // setup log folder
  if (!fs.existsSync(config.logging.FinalLogPath)) {
    logger.info('Creating folder: ' + config.logging.FinalLogPath);
    fs.mkdirSync(config.logging.FinalLogPath);
  }
  logger.info('Log folder: ' + config.logging.FinalLogPath);
}

function loadConfig(filename) {
  // auto create
  if (!fs.existsSync(filename))
    fs.closeSync(fs.openSync(filename, 'w'));
  var RawJson = fs.readFileSync(filename, {
    encoding: 'utf8'
  });

  var config = applyDefaults(RawJson === '' ? {} : JSON.parse(RawJson),
    JSON.parse(fs.readFileSync(DEFAULT_CONFIG_FILENAME)));

  // resolve relative path to absolute
  config.WebService.FinalPublicPath = path.resolve(__dirname + '/../' + config.WebService.PublicPath);
  config.logging.FinalLogPath = path.resolve(__dirname + '/../' + config.logging.LogPath);

  return config;
}

function applyDefaults(config, defaults) {
  Object.keys(defaults).forEach((key) => {
    logger.debug('Matching key ' + key);
    if (key in config) {
      logger.info('Overriding default key: ' + key);
      if (typeof defaults[key] === 'object')
        applyDefaults(config[key], defaults[key]);
    } else {
      config[key] = defaults[key];
    }
  });
  return config;
}