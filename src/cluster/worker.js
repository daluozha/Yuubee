const puppeteer = require("puppeteer");
const logger = require("../util/logger");
const conf = require("../config.js");
const shortid = require("shortid");

class WorkerService {
    constructor(info = {}) {
        this.logger = logger.getLogger("work-service");
        this.convertResultType = (typeStr, data) => {
            switch (typeStr) {
                case "BYTES":
                    return data.data;
                case "URL":
                    return {
                        url: `http://${info.ip}:${
                            info.port
                        }/screen_shot/${data.path.split("/").pop()}`,
                        type: "URL",
                    };
                default:
                    return data.bytes;
            }
        };
        this.getPicUrl = (path) => {
            return `http://${info.ip}:${info.port}/screen_shot/${path
                .split("/")
                .pop()}`;
        };
    }

    async splitTarget(id, target, clip, scrollY) {
        let targetBounds = await target.boundingBox();
        this.logger.debug(`id:${id} 截图高度为`, targetBounds);
        let bounds = [];
        let { x, y, width, height } = { ...targetBounds };
        if (!clip) {
            bounds.push({ x, y, width, height });
        } else {
            let clipHeight = Math.min(clip.height || height, height);
            let clipWidth = Math.min(clip.width || width, width);
            let _x = x + (clip.x || 0);
            let _y = y + (clip.y || 0);
            let absoluteHeight = y + height;
            while (_y < absoluteHeight) {
                let _height = Math.min(clipHeight, absoluteHeight - _y);
                if (_height >= 1) {
                    bounds.push({
                        x: _x,
                        y: _y,
                        width: clipWidth,
                        height: _height,
                    });
                }
                _y += _height;

                if (!scrollY) break;
            }
        }
        return bounds;
    }

    async screenShot(id, options) {
        return new Promise(async (resolve) => {
            let browser;
            try {
                browser = await puppeteer.launch({
                    headless: true,
                    args: [
                        "--disable-gpu",
                        "--disable-dev-shm-usage",
                        "--disable-setuid-sandbox",
                        "--no-first-run",
                        "--no-sandbox",
                        "--no-zygote",
                        "--single-process",
                    ],
                });
                let page = await browser.newPage();
                await page.setJavaScriptEnabled(true);
                await page.setViewport(options.viewport);
                await page.setUserAgent(options.userAgent);
                await page.goto(options.url, {
                    timeout: options.screenshot.urlTimeout || 30000,
                });
                await page.content();
                let target = await page.$(options.screenshot.selector);
                if (!target)
                    resolve({
                        fail: `target '${options.screenshot.selector}' must not be null`,
                    });
                if (
                    options.waitForSelector &&
                    options.waitForSelector.selector &&
                    options.waitForSelector.selector !== ""
                )
                    await page.waitForSelector(
                        options.waitForSelector.selector,
                        {
                            timeout: options.waitForSelector.timeout || 5000,
                        }
                    );
                if (!!options.screenshot.omitBackground) {
                    //将背景设成透明
                    await page.evaluate(
                        () => (document.body.style.background = "transparent")
                    );
                }
                let pageBounds = await this.splitTarget(
                    id,
                    target,
                    options.screenshot.clip,
                    !!options.screenshot.scrollY
                ); //将target分割成多张图
                let dataList = [];
                let type = options.screenshot.type === "jpg" ? "jpeg" : "png";
                let byteSum = 0;

                let i = 0;
                let start = new Date().getTime();
                while (i < pageBounds.length) {
                    if (
                        options.screenshot.timeout &&
                        new Date().getTime() - start >
                            options.screenshot.timeout
                    ) {
                        this.logger.warn(
                            `id:${id} 截图超时 ${options.screenshot.timeout}ms`
                        );
                        break;
                    }
                    const path =
                        options.resultType === "URL"
                            ? `${conf.screenShotPath}/${`${id}-${i}.${type}`}`
                            : null;
                    let screenshotOptions = {
                        type: type,
                        path: path,
                        clip: pageBounds[i],
                        omitBackground: !!options.screenshot.omitBackground,
                    };

                    if (type === "jpeg" && options.screenshot.quality) {
                        screenshotOptions.quality =
                            options.screenshot.quality < 100
                                ? options.screenshot.quality
                                : 100;
                    }

                    let data = await target.screenshot(screenshotOptions);
                    data = data.toJSON();
                    const len = data.data.length;
                    byteSum += len;
                    if (options.resultType === "URL") {
                        dataList.push({ path: this.getPicUrl(path) });
                    } else {
                        dataList.push({ data: data });
                    }
                    this.logger.debug(
                        `id:${id} 第${i + 1}张完成 bound:${JSON.stringify(
                            pageBounds[i]
                        )},byte:${len},byteSum:${byteSum}`
                    );

                    if (
                        options.screenshot.maxLength &&
                        byteSum > options.screenshot.maxLength
                    ) {
                        this.logger.debug(
                            `id:${id} 已截图${
                                i + 1
                            }张, byteSum:${byteSum}, maxLength:${
                                options.screenshot.maxLength
                            } 跳出循环`
                        );
                        break;
                    }
                    if (
                        options.screenshot.maxPage &&
                        pageBounds.length > options.screenshot.maxPage &&
                        i >= options.screenshot.maxPage - 1
                    ) {
                        this.logger.debug(
                            `id:${id} 已截图${i + 1}张, maxPage:${
                                options.screenshot.maxPage
                            } 跳出循环`
                        );
                        break;
                    }
                    i++;
                }
                resolve({
                    type: options.resultType,
                    list: dataList.map((data) =>
                        this.convertResultType(options.resultType, data)
                    ),
                });
            } catch (e) {
                this.logger.error(`id:${id} 截图出错`, e);
                resolve({
                    fail: e.message,
                });
            } finally {
                if (browser) {
                    await browser.close();
                    browser = null;
                }
            }
        });
    }

    async init() {
        // this.browser = await puppeteer.launch({
        //   headless: true,
        //   args: [
        //     '--disable-gpu',
        //     '--disable-dev-shm-usage',
        //     '--disable-setuid-sandbox',
        //     '--no-first-run',
        //     '--no-sandbox',
        //     '--no-zygote',
        //     '--single-process'
        //   ]
        // })
        let that = this;
        process.on("message", async function (msg) {
            if (msg && msg.action && msg.data) {
                if (msg.action === "SCREEN_SHOT") {
                    let options = msg.data;
                    let id = shortid.generate();
                    let s = Date.now();
                    that.logger.debug(
                        `id:${id} 接受到截图请求 options:${JSON.stringify(
                            options
                        )}`
                    );
                    let result = await that.screenShot(id, options);
                    if (result.fail) {
                        that.logger.warn(
                            `id:${id} 截图处理失败 原因:'${result.fail}' cost:${
                                Date.now() - s
                            }ms`
                        );
                    } else {
                        that.logger.debug(
                            `id:${id} 截图完成 size:${
                                result.list.length
                            } cost:${Date.now() - s}ms`
                        );
                    }
                    process.send({
                        action: "SCREEN_SHOT_CALLBACK",
                        data: result,
                    });
                }
            }
        });
        process.send({
            action: "PAGE_INIT_CALLBACK",
            data: true,
        });
        return true;
    }
}

module.exports = WorkerService;
