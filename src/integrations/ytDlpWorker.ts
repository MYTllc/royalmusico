import { parentPort, workerData } from "worker_threads";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

if (!parentPort) {
  throw new Error("This script must be run as a worker thread.");
}

const { command } = workerData as { command: string };

execAsync(command)
  .then(result => {
    parentPort!.postMessage({ type: "success", data: result });
  })
  .catch(error => {
    parentPort!.postMessage({ type: "error", error: { message: error.message, stdout: error.stdout, stderr: error.stderr, code: error.code } });
  });

