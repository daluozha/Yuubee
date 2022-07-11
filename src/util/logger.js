const log4js = require("log4js").configure({
    appenders: {
        console: {
            type: "console",
            layout: {
                type: "pattern",
                pattern: "[%d{yyyy-MM-dd hh:mm:ss:SSS}][%p][%X{pid}][%c] %m",
            },
        },
    },
    categories: {
        default: {
            appenders: ["console"],
            level: "debug",
        },
    },
});
const _getLogger = log4js.getLogger;

log4js.getLogger = function (name) {
    let logger = _getLogger(name);
    logger.addContext("pid", process.pid);
    return logger;
};

module.exports = log4js;
