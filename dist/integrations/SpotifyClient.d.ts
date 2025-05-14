import { TrackInfo } from "./YouTubeDLWrapper";
export interface SpotifyConfig {
    clientId: string;
    clientSecret: string;
}
export interface SpotifyTrack extends Partial<TrackInfo> {
    spotifyId: string;
    name: string;
    artists: {
        name: string;
        id: string;
    }[];
    album?: {
        name: string;
        images?: {
            url: string;
        }[];
    };
    durationMs: number;
    explicit: boolean;
    externalUrls: {
        spotify: string;
    };
    previewUrl?: string | null;
    isPlayable?: boolean;
}
export declare class SpotifyClient {
    private clientId;
    private clientSecret;
    private accessToken;
    private tokenExpiryTime;
    private apiClient;
    constructor(config: SpotifyConfig);
    private getAccessToken;
    /**
     * Searches for tracks on Spotify.
     * @param {string} query The search query.
     * @param {number} [limit=5] Maximum number of results to return.
     * @param {string} [market=\"US\"] Optional: An ISO 3166-1 alpha-2 country code for market-specific results.
     * @returns {Promise<SpotifyTrack[] | null>} An array of Spotify tracks or null if an error occurs.
     */
    searchTracks(query: string, limit?: number, market?: string): Promise<SpotifyTrack[] | null>;
}
