const path = require("path");
const os = require("os");

const { maxBrowserInstance, screenShotPath, port, NODE_ENV } = process.env;
const isProd = NODE_ENV === "production";

module.exports = {
    isProd: isProd,
    maxBrowserInstance: maxBrowserInstance || os.cpus().length / 2,
    screenShotPath:
        screenShotPath || path.resolve(__dirname, "../screen_shot"), //必须是绝对路径
    port: port || 8800,
};
