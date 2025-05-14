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
exports.SpotifyClient = void 0;
const axios_1 = __importDefault(require("axios"));
const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
class SpotifyClient {
    constructor(config) {
        this.accessToken = null;
        this.tokenExpiryTime = 0;
        if (!config.clientId || !config.clientSecret) {
            throw new Error("Spotify Client ID and Client Secret are required.");
        }
        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
        this.apiClient = axios_1.default.create({ baseURL: SPOTIFY_API_BASE_URL });
    }
    getAccessToken() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            if (this.accessToken && Date.now() < this.tokenExpiryTime) {
                return this.accessToken;
            }
            try {
                const response = yield axios_1.default.post(SPOTIFY_TOKEN_URL, "grant_type=client_credentials", {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Authorization": "Basic " + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64"),
                    },
                });
                this.accessToken = response.data.access_token;
                // Set expiry time slightly earlier to be safe (e.g., 5 minutes before actual expiry)
                this.tokenExpiryTime = Date.now() + (response.data.expires_in - 300) * 1000;
                this.apiClient.defaults.headers.common["Authorization"] = `Bearer ${this.accessToken}`;
                return this.accessToken;
            }
            catch (error) {
                console.error("Error fetching Spotify access token:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                this.accessToken = null;
                this.tokenExpiryTime = 0;
                return null;
            }
        });
    }
    /**
     * Searches for tracks on Spotify.
     * @param {string} query The search query.
     * @param {number} [limit=5] Maximum number of results to return.
     * @param {string} [market=\"US\"] Optional: An ISO 3166-1 alpha-2 country code for market-specific results.
     * @returns {Promise<SpotifyTrack[] | null>} An array of Spotify tracks or null if an error occurs.
     */
    searchTracks(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, limit = 5, market) {
            var _a;
            const token = yield this.getAccessToken();
            if (!token)
                return null;
            try {
                const params = { q: query, type: "track", limit };
                if (market)
                    params.market = market;
                const response = yield this.apiClient.get("/search", { params });
                if (response.data && response.data.tracks && response.data.tracks.items) {
                    return response.data.tracks.items.map((item) => {
                        var _a, _b;
                        return ({
                            spotifyId: item.id,
                            name: item.name,
                            artists: item.artists.map((artist) => ({ name: artist.name, id: artist.id })),
                            album: {
                                name: item.album.name,
                                images: item.album.images,
                            },
                            durationMs: item.duration_ms,
                            explicit: item.explicit,
                            externalUrls: item.external_urls,
                            previewUrl: item.preview_url,
                            isPlayable: item.is_playable, // This field might depend on the market
                            // Map to TrackInfo fields where appropriate for consistency
                            title: item.name,
                            artist: item.artists.map((a) => a.name).join(", "),
                            duration: item.duration_ms / 1000,
                            url: item.external_urls.spotify, // Spotify URL
                            thumbnail: (_b = (_a = item.album.images) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url, // Use first album image as thumbnail
                            source: "spotify",
                            id: item.id, // Use Spotify ID as the primary ID for this TrackInfo representation
                        });
                    });
                }
                return [];
            }
            catch (error) {
                console.error(`Error searching Spotify for "${query}":`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                return null;
            }
        });
    }
}
exports.SpotifyClient = SpotifyClient;
// Example Usage (for testing - ensure SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set as env vars or passed directly)
/*
(async () => {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    console.log("Spotify Client ID and Secret must be set in environment variables for testing.");
    return;
  }
  const spotifyClient = new SpotifyClient({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  const tracks = await spotifyClient.searchTracks("Bohemian Rhapsody Queen", 3);
  if (tracks) {
    console.log("Spotify Search Results:");
    tracks.forEach(track => {
      console.log(`- ${track.name} by ${track.artists.map(a => a.name).join(", ")} (URL: ${track.externalUrls.spotify})`);
      // console.log(track); // Log full track object for details
    });
  }
})();
*/
