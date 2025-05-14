import axios, { AxiosInstance } from "axios";
import { TrackInfo } from "./YouTubeDLWrapper"; // Assuming TrackInfo can be adapted or a new SpotifyTrack interface created

const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

export interface SpotifyConfig {
  clientId: string;
  clientSecret: string;
}

export interface SpotifyTrack extends Partial<TrackInfo> { // Reuse TrackInfo structure where possible
  spotifyId: string;
  name: string;
  artists: { name: string; id: string; }[];
  album?: { name: string; images?: { url: string; }[]; };
  durationMs: number;
  explicit: boolean;
  externalUrls: { spotify: string; };
  previewUrl?: string | null;
  isPlayable?: boolean; // Spotify API can indicate if a track is playable in a certain market
}

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // Seconds
}

export class SpotifyClient {
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiryTime: number = 0;
  private apiClient: AxiosInstance;

  constructor(config: SpotifyConfig) {
    if (!config.clientId || !config.clientSecret) {
      throw new Error("Spotify Client ID and Client Secret are required.");
    }
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.apiClient = axios.create({ baseURL: SPOTIFY_API_BASE_URL });
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.accessToken && Date.now() < this.tokenExpiryTime) {
      return this.accessToken;
    }

    try {
      const response = await axios.post<SpotifyTokenResponse>(
        SPOTIFY_TOKEN_URL,
        "grant_type=client_credentials",
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64"),
          },
        }
      );
      this.accessToken = response.data.access_token;
      // Set expiry time slightly earlier to be safe (e.g., 5 minutes before actual expiry)
      this.tokenExpiryTime = Date.now() + (response.data.expires_in - 300) * 1000;
      this.apiClient.defaults.headers.common["Authorization"] = `Bearer ${this.accessToken}`;
      return this.accessToken;
    } catch (error: any) {
      console.error("Error fetching Spotify access token:", error.response?.data || error.message);
      this.accessToken = null;
      this.tokenExpiryTime = 0;
      return null;
    }
  }

  /**
   * Searches for tracks on Spotify.
   * @param {string} query The search query.
   * @param {number} [limit=5] Maximum number of results to return.
   * @param {string} [market=\"US\"] Optional: An ISO 3166-1 alpha-2 country code for market-specific results.
   * @returns {Promise<SpotifyTrack[] | null>} An array of Spotify tracks or null if an error occurs.
   */
  public async searchTracks(query: string, limit: number = 5, market?: string): Promise<SpotifyTrack[] | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const params: any = { q: query, type: "track", limit };
      if (market) params.market = market;
      
      const response = await this.apiClient.get("/search", { params });
      
      if (response.data && response.data.tracks && response.data.tracks.items) {
        return response.data.tracks.items.map((item: any): SpotifyTrack => ({
          spotifyId: item.id,
          name: item.name,
          artists: item.artists.map((artist: any) => ({ name: artist.name, id: artist.id })),
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
          artist: item.artists.map((a: any) => a.name).join(", "),
          duration: item.duration_ms / 1000,
          url: item.external_urls.spotify, // Spotify URL
          thumbnail: item.album.images?.[0]?.url, // Use first album image as thumbnail
          source: "spotify",
          id: item.id, // Use Spotify ID as the primary ID for this TrackInfo representation
        }));
      }
      return [];
    } catch (error: any) {
      console.error(`Error searching Spotify for "${query}":`, error.response?.data || error.message);
      return null;
    }
  }

  // Placeholder for getting a single track by ID if needed
  // public async getTrack(trackId: string, market?: string): Promise<SpotifyTrack | null> { ... }

  // Placeholder for getting album tracks if needed
  // public async getAlbumTracks(albumId: string, limit: number = 20, market?: string): Promise<SpotifyTrack[] | null> { ... }

  // Placeholder for getting playlist tracks if needed
  // public async getPlaylistTracks(playlistId: string, limit: number = 20, market?: string): Promise<SpotifyTrack[] | null> { ... }
}

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

