// Core
export { MusicBot, MusicBotOptions, MusicBotEvents } from "./core/MusicBot";

// Player
export { AudioPlayer, AudioPlayerOptions, PlayerStatus, PlayableTrack } from "./player/AudioPlayer";

// Queue
export { QueueManager, QueueOptions, LoopMode } from "./queue/QueueManager";

// Commands
export { CommandManager, Command, CommandContext } from "./commands/CommandManager";
export { PlayCommand } from "./commands/definitions/PlayCommand";
export { SkipCommand } from "./commands/definitions/SkipCommand";
export { PauseCommand } from "./commands/definitions/PauseCommand";
// export { ResumeCommand } from "./commands/definitions/ResumeCommand"; // This command was not implemented
// export { StopCommand } from "./commands/definitions/StopCommand"; // This command was not implemented
export { QueueCommand } from "./commands/definitions/QueueCommand";
export { LoopCommand } from "./commands/definitions/LoopCommand";
export { VolumeCommand } from "./commands/definitions/VolumeCommand";
export { ShuffleCommand } from "./commands/definitions/ShuffleCommand";
export { RemoveCommand } from "./commands/definitions/RemoveCommand";
// export { NowPlayingCommand } from "./commands/definitions/NowPlayingCommand"; // This command was not implemented

// Integrations
export { YouTubeDLWrapper, YouTubeDLWrapperOptions, TrackInfo as YouTubeTrackInfo } from "./integrations/YouTubeDLWrapper";
export { SpotifyClient, SpotifyConfig, SpotifyTrack } from "./integrations/SpotifyClient";

// Types (re-exporting some for convenience)
export type { TrackInfo } from "./integrations/YouTubeDLWrapper"; // General TrackInfo might be useful

