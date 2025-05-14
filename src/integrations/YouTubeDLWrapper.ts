import { Worker } from "worker_threads";
import path from "path"; // Import path for resolving worker script path

export interface TrackInfo {
  id: string; // Platform specific ID
  title: string;
  artist?: string;
  duration?: number; // in seconds
  url: string; // Original URL or webpage URL
  streamUrl?: string; // Direct streamable URL
  thumbnail?: string;
  source: string; // e.g., "youtube", "soundcloud", "tiktok"
  uploader?: string;
  description?: string;
  // Add more fields as needed from yt-dlp output
}

export interface YouTubeDLWrapperOptions {
  ytDlpPath?: string; // Path to yt-dlp executable
  workerPath?: string; // Path to the ytDlpWorker.ts script
}

export class YouTubeDLWrapper {
  private ytDlpPath: string;
  private workerPath: string;

  constructor(options?: YouTubeDLWrapperOptions) {
    this.ytDlpPath = options?.ytDlpPath || "yt-dlp";
    // Default worker path assumes it's in the same directory or a known relative path
    // Adjust if your build process places it elsewhere
    this.workerPath = options?.workerPath || path.resolve(__dirname, "./ytDlpWorker.js"); // Use .js for compiled output
  }

  private runInWorker(command: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.workerPath, {
        workerData: { command },
      });

      worker.on("message", (message) => {
        if (message.type === "success") {
          resolve(message.data);
        } else if (message.type === "error") {
          // Reconstruct the error object
          const err = new Error(message.error.message) as any;
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

  public async checkYtDlp(): Promise<boolean> {
    try {
      const { stdout } = await this.runInWorker(`${this.ytDlpPath} --version`);
      return stdout.trim().length > 0;
    } catch (error) {
      // console.error("yt-dlp not found or not executable via worker:", error);
      return false;
    }
  }

  private parseTrackInfo(rawInfo: any, originalUrl?: string): TrackInfo {
    return {
      id: rawInfo.id,
      title: rawInfo.title || "Unknown Title",
      artist: rawInfo.artist || rawInfo.uploader || undefined,
      duration: rawInfo.duration,
      url: rawInfo.webpage_url || originalUrl || rawInfo.original_url || "unknown_url",
      thumbnail: rawInfo.thumbnail,
      source: rawInfo.extractor_key?.toLowerCase().replace("_tab", "") || "unknown",
      uploader: rawInfo.uploader,
      description: rawInfo.description,
    };
  }

  public async getTrackInfo(url: string): Promise<TrackInfo | null> {
    if (!(await this.checkYtDlp())) {
      console.error("yt-dlp is not available. Please ensure it is installed and in your PATH.");
      return null;
    }
    const command = `${this.ytDlpPath} --print-json --no-warnings --skip-download "${url}"`;
    try {
      const { stdout } = await this.runInWorker(command);
      const rawInfo = JSON.parse(stdout);
      return this.parseTrackInfo(rawInfo, url);
    } catch (error) {
      console.error(`Error fetching track info for ${url} via worker:`, error);
      return null;
    }
  }

  public async searchSoundCloud(query: string, maxResults: number = 1): Promise<TrackInfo[] | null> {
    if (!(await this.checkYtDlp())) {
      console.error("yt-dlp is not available.");
      return null;
    }
    const command = `${this.ytDlpPath} "scsearch${maxResults}:${query}" --print-json --no-warnings --skip-download`;
    try {
      const { stdout } = await this.runInWorker(command);
      const results: TrackInfo[] = stdout
        .trim()
        .split("\n")
        .map((line: string) => {
          try {
            const rawInfo = JSON.parse(line);
            if (rawInfo.extractor_key?.toLowerCase().includes("soundcloud") && rawInfo.duration) {
              return this.parseTrackInfo(rawInfo);
            }
            return null;
          } catch (parseError) {
            console.error("Error parsing individual search result line:", parseError, "Line:", line);
            return null;
          }
        })
        .filter((track: TrackInfo | null): track is TrackInfo => track !== null);
      return results.length > 0 ? results : null;
    } catch (error) {
      console.error(`Error searching SoundCloud for "${query}" via worker:`, error);
      return null;
    }
  }

  public async getStreamUrl(url: string, format: string = "bestaudio/best"): Promise<string | null> {
    if (!(await this.checkYtDlp())) {
      console.error("yt-dlp is not available.");
      return null;
    }
    const command = `${this.ytDlpPath} -g -f "${format}" --no-warnings "${url}"`;
    try {
      const { stdout } = await this.runInWorker(command);
      const streamUrl = stdout.split("\n")[0].trim();
      return streamUrl || null;
    } catch (error) {
      console.error(`Error fetching stream URL for ${url} via worker:`, error);
      return null;
    }
  }
}

