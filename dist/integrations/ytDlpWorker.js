"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
if (!worker_threads_1.parentPort) {
    throw new Error("This script must be run as a worker thread.");
}
const { command } = worker_threads_1.workerData;
execAsync(command)
    .then(result => {
    worker_threads_1.parentPort.postMessage({ type: "success", data: result });
})
    .catch(error => {
    worker_threads_1.parentPort.postMessage({ type: "error", error: { message: error.message, stdout: error.stdout, stderr: error.stderr, code: error.code } });
});
