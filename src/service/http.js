const Koa = require("koa");
const Router = require("koa-router");
const koaJson = require("koa-json");
const sender = require("koa-send");
const parser = require("koa-bodyparser");
const common = require("../util/common");
const conf = require("../conf");
const logger = require("../util/logger");

function startHttpServer(masterService) {
    const app = new Koa();
    const router = new Router();

    app.use(parser()).use(koaJson()).use(router.routes());

    router.post("save", async (ctx) => {
        console.log(1, ctx);
        if (!ctx.request.body || !ctx.request.body.url) {
            return (ctx.body = {
                success: false,
                errorCode: "-3",
                errorMsg: "请求参数不合法",
            });
        }
        let options = common.fillOptions(ctx.request.body);
        try {
            let result = await masterService.screenShot(options);
            if (result.fail) {
                ctx.body = {
                    success: false,
                    errorCode: "-1",
                    errorMsg: result.fail,
                };
            } else {
                ctx.body = {
                    success: true,
                    data: result.list,
                };
            }
        } catch (e) {
            ctx.body = {
                success: false,
                errorCode: "-2",
                errorMsg: e.message,
            };
        }
    });

    // todo

    app.listen(conf.port);

    logger.info(`项目启动成功 ${conf.port}`);
}

module.exports = {
    startHttpServer,
};
