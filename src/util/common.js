function getIPAddress() {
    const interfaces = require("os").networkInterfaces();
    for (let devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (
                alias.family === "IPv4" &&
                alias.address !== "127.0.0.1" &&
                !alias.internal
            ) {
                return alias.address;
            }
        }
    }
}

function fillOptions(options) {
    return {
        viewport: Object.assign(
            { width: 1200, height: 1200 },
            options.viewport || {}
        ),
        screenshot: Object.assign(
            {
                selector: "body",
                type: "png",
                scrollY: false,
                omitBackground: false,
                urlTimeout: 10000,
                timeout: 65000,
            },
            options.screenshot
        ),
        waitForSelector: options.waitForSelector,
        browserTimeout:
            !options.browserTimeout && options.browserTimeout !== 0
                ? 5000
                : options.browserTimeout,
        userAgent:
            options.userAgent ||
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36",
        url: options.url,
        resultType: options.resultType || "BYTES",
        eager: options.eager || false,
    };
}

module.exports = {
    getIPAddress,
    fillOptions,
};
