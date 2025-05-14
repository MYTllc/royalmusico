"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTubeDLWrapper = void 0;
const worker_threads_1 = require("worker_threads");
const path_1 = __importDefault(require("path")); // Import path for resolving worker script path
class YouTubeDLWrapper {
    constructor(options) {
        this.ytDlpPath = (options === null || options === void 0 ? void 0 : options.ytDlpPath) || "yt-dlp";
        // Default worker path assumes it's in the same directory or a known relative path
        // Adjust if your build process places it elsewhere
        this.workerPath = (options === null || options === void 0 ? void 0 : options.workerPath) || path_1.default.resolve(__dirname, "./ytDlpWorker.js"); // Use .js for compiled output
    }
    runInWorker(command) {
        return new Promise((resolve, reject) => {
            const worker = new worker_threads_1.Worker(this.workerPath, {
                workerData: { command },
            });
            worker.on("message", (message) => {
                if (message.type === "success") {
                    resolve(message.data);
                }
                else if (message.type === "error") {
                    // Reconstruct the error object
                    const err = new Error(message.error.message);
                    err.stdout = message.error.stdout;
                    err.stderr = message.error.stderr;
                    err.code = message.error.code;
                    reject(err);
                }
            });
            worker.on("error", reject);
            worker.on("exit", (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
            });
        });
    }
    checkYtDlp() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { stdout } = yield this.runInWorker(`${this.ytDlpPath} --version`);
                return stdout.trim().length > 0;
            }
            catch (error) {
                // console.error("yt-dlp not found or not executable via worker:", error);
                return false;
            }
        });
    }
    parseTrackInfo(rawInfo, originalUrl) {
        var _a;
        return {
            id: rawInfo.id,
            title: rawInfo.title || "Unknown Title",
            artist: rawInfo.artist || rawInfo.uploader || undefined,
            duration: rawInfo.duration,
            url: rawInfo.webpage_url || originalUrl || rawInfo.original_url || "unknown_url",
            thumbnail: rawInfo.thumbnail,
            source: ((_a = rawInfo.extractor_key) === null || _a === void 0 ? void 0 : _a.toLowerCase().replace("_tab", "")) || "unknown",
            uploader: rawInfo.uploader,
            description: rawInfo.description,
        };
    }
    getTrackInfo(url) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.checkYtDlp())) {
                console.error("yt-dlp is not available. Please ensure it is installed and in your PATH.");
                return null;
            }
            const command = `${this.ytDlpPath} --print-json --no-warnings --skip-download "${url}"`;
            try {
                const { stdout } = yield this.runInWorker(command);
                const rawInfo = JSON.parse(stdout);
                return this.parseTrackInfo(rawInfo, url);
            }
            catch (error) {
                console.error(`Error fetching track info for ${url} via worker:`, error);
                return null;
            }
        });
    }
    searchSoundCloud(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, maxResults = 1) {
            if (!(yield this.checkYtDlp())) {
                console.error("yt-dlp is not available.");
                return null;
            }
            const command = `${this.ytDlpPath} "scsearch${maxResults}:${query}" --print-json --no-warnings --skip-download`;
            try {
                const { stdout } = yield this.runInWorker(command);
                const results = stdout
                    .trim()
                    .split("\n")
                    .map((line) => {
                    var _a;
                    try {
                        const rawInfo = JSON.parse(line);
                        if (((_a = rawInfo.extractor_key) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes("soundcloud")) && rawInfo.duration) {
                            return this.parseTrackInfo(rawInfo);
                        }
                        return null;
                    }
                    catch (parseError) {
                        console.error("Error parsing individual search result line:", parseError, "Line:", line);
                        return null;
                    }
                })
                    .filter((track) => track !== null);
                return results.length > 0 ? results : null;
            }
            catch (error) {
                console.error(`Error searching SoundCloud for "${query}" via worker:`, error);
                return null;
            }
        });
    }
    getStreamUrl(url_1) {
        return __awaiter(this, arguments, void 0, function* (url, format = "bestaudio/best") {
            if (!(yield this.checkYtDlp())) {
                console.error("yt-dlp is not available.");
                return null;
            }
            const command = `${this.ytDlpPath} -g -f "${format}" --no-warnings "${url}"`;
            try {
                const { stdout } = yield this.runInWorker(command);
                const streamUrl = stdout.split("\n")[0].trim();
                return streamUrl || null;
            }
            catch (error) {
                console.error(`Error fetching stream URL for ${url} via worker:`, error);
                return null;
            }
        });
    }
}
exports.YouTubeDLWrapper = YouTubeDLWrapper;
