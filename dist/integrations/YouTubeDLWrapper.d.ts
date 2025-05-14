export interface TrackInfo {
    id: string;
    title: string;
    artist?: string;
    duration?: number;
    url: string;
    streamUrl?: string;
    thumbnail?: string;
    source: string;
    uploader?: string;
    description?: string;
}
export interface YouTubeDLWrapperOptions {
    ytDlpPath?: string;
    workerPath?: string;
}
export declare class YouTubeDLWrapper {
    private ytDlpPath;
    private workerPath;
    constructor(options?: YouTubeDLWrapperOptions);
    private runInWorker;
    checkYtDlp(): Promise<boolean>;
    private parseTrackInfo;
    getTrackInfo(url: string): Promise<TrackInfo | null>;
    searchSoundCloud(query: string, maxResults?: number): Promise<TrackInfo[] | null>;
    getStreamUrl(url: string, format?: string): Promise<string | null>;
}
