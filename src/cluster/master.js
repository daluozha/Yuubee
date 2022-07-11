const logger = require("../util/logger");
// const conf = require("../conf");
// const _ = require("lodash");

class MasterService {
    constructor(opts = {}) {
        this.idleWorkers = [];
        this.diligentWorkers = new Set();
        this.logger = logger.getLogger("master");
    }

    init() {}

    addWorker(worker) {
        let that = this;
        worker.on("message", function (msg) {
            if (msg && msg.action && msg.data) {
                switch (msg.action) {
                    case "PAGE_INIT_CALLBACK":
                        {
                            that.idleWorkers.push(this);
                            that.logger.info(
                                `Browser进程(${this.process.pid})初始化回调成功`
                            );
                        }
                        break;
                    case "SCREEN_SHOT_CALLBACK":
                        {
                            this._resolve(msg.data);
                        }
                        break;
                    default:
                        that.logger.error(
                            `进程(${this.process.pid})消息(${msg.action})不存在,忽略`
                        );
                }
            }
        });
    }

    getAvailablePage(timeout) {
        let that = this;
        return new Promise((resolve) => {
            let start = new Date().getTime();
            const handleRequest = () => {
                if (timeout && new Date().getTime() - start >= timeout) {
                    resolve({
                        fail: `等待超时,timeout=${timeout}`,
                    });
                    return;
                }
                // let workers = _.shuffle(that.idleWorkers)
                for (let worker of that.idleWorkers) {
                    if (!that.diligentWorkers.has(worker.id)) {
                        that.diligentWorkers.add(worker.id);
                        resolve({
                            worker: worker,
                        });
                        return;
                    }
                }
                if (!timeout) {
                    resolve({
                        fail: `服务繁忙`,
                    });
                } else {
                    setTimeout(() => {
                        handleRequest();
                    }, 150);
                }
            };
            handleRequest();
        });
    }

    async screenShot(options) {
        let result = await this.getAvailablePage(options.browserTimeout);
        if (result.fail) {
            return result;
        }
        let that = this;
        let worker = result.worker;
        return new Promise((resolve) => {
            worker._resolve = resolve;
            worker.send({ action: "SCREEN_SHOT", data: options });
        }).finally(function () {
            that.diligentWorkers.delete(worker.id);
        });
    }
}

module.exports = MasterService;
