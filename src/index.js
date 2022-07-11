const cluster = require("cluster");
const os = require("os");
const logger = require("./util/logger").getLogger("app");
const common = require("./util/common");
const http = require("./koaServer.js");

const MasterService = require("./cluster/master");
const WorkerService = require("./cluster/worker");
const conf = require("./config");

async function appStart(info) {
    if (cluster.isMaster) {
        logger.info("启动的容器配置信息 master info:", info);

        let masterService = new MasterService();

        let forkNum = conf.maxBrowserInstance || os.cpus().length / 2;

        for (let i = 0; i < forkNum; i++) {
            let wk = cluster.fork();
            masterService.addWorker(wk);
        }

        http.startHttpServer(masterService);

        // if (!conf.production) {
        //     const memeye = require('memeye');
        //     memeye();
        // }
    } else if (cluster.isWorker) {
        logger.info("启动的容器配置信息 worker info:", info);
        await new WorkerService(info).init();
    }
}

(async function () {
    const info = {
        port: conf.port,
        // ip: common.getIPAddress(),
        ip: "127.0.0.1",
    };
    await appStart(info);
})();
