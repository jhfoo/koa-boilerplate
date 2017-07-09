// constants
const DEFAULT_CONFIG_FILENAME = 'defaults.json',
    CONFIG_FILENAME = 'config.json';

var fs = require('fs'),
    log4js = require('log4js'),
    logger = log4js.getLogger(),
    path = require('path');

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

module.exports = {
    DEFAULT_CONFIG_FILENAME: DEFAULT_CONFIG_FILENAME,
    CONFIG_FILENAME : CONFIG_FILENAME,

    autoCreateFolders: (config) => {
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
    },

    loadConfig: (filename) => {
        // auto create
        if (!fs.existsSync(filename))
            fs.closeSync(fs.openSync(filename, 'w'));
        var RawJson = fs.readFileSync(filename, {
            encoding: 'utf8'
        });

        var config = applyDefaults(RawJson === '' ? {} : JSON.parse(RawJson),
            JSON.parse(fs.readFileSync(DEFAULT_CONFIG_FILENAME)));

        // resolve relative path to absolute
        config.WebService.FinalPublicPath = path.resolve(__dirname + '/../../' + config.WebService.PublicPath);
        config.logging.FinalLogPath = path.resolve(__dirname + '/../../' + config.logging.LogPath);

        return config;
    },

    applyDefaults: applyDefaults
}