// examplebot/index.js (مثال توضيحي)
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { MusicBot, PlayCommand, SkipCommand, QueueCommand, LoopCommand, VolumeCommand, PauseCommand, ResumeCommand, ShuffleCommand, RemoveCommand, NowPlayingCommand, StopCommand, ClearQueueCommand } = require("royalmusico"); // يفترض أن royalmusico مثبتة أو مرتبطة محلياً
require("dotenv").config();

if (!process.env.BOT_TOKEN) {
    console.error("ERROR: BOT_TOKEN not found in .env file.");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember],
});

const musicBot = new MusicBot({
    commandPrefix: "!", // البادئة التي سيتعرف عليها البوت
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID, // اتركه فارغًا إذا لم تكن تستخدم Spotify
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    },
    ytDlpOptions: {
        // ytDlpPath: "/usr/local/bin/yt-dlp", // قم بإلغاء التعليق وتعيين المسار إذا لم يكن yt-dlp في PATH
    },
    audioPlayerOptions: {
        // leaveOnEnd: true, // المغادرة عند انتهاء القائمة
        // leaveOnStop: true, // المغادرة عند أمر الإيقاف
        // leaveOnEmpty: true, // المغادرة عندما تكون القناة الصوتية فارغة
        // leaveOnEmptyCooldown: 60000, // 60 ثانية قبل المغادرة عند الفراغ
    },
    queueOptions: {
        maxSize: 150, // الحد الأقصى لحجم قائمة الانتظار
    },
    // ترتيب البحث الافتراضي عند إدخال اسم أغنية (Spotify يُستخدم للبحث عن البيانات الوصفية إذا تم توفير Client ID/Secret)
    fallbackSearchOrder: ["youtube", "soundcloud"], 
});

// تسجيل الأوامر المدمجة
musicBot.registerCommand([
    new PlayCommand(), new SkipCommand(), new QueueCommand(), new LoopCommand(),
    new VolumeCommand(), new PauseCommand(), new ShuffleCommand(),
    new RemoveCommand(), new NowPlayingCommand(), new StopCommand(), new ClearQueueCommand()
]);

// --- معالجات الأحداث ---
musicBot.on("trackStart", (track, context) => {
    console.log(`▶️ Playing: ${track.title} (Requested by: ${context?.member?.displayName || "N/A"})`);
    if (context && context.channel) {
        context.channel.send(`🎶 Now playing: **${track.title}**`).catch(console.error);
    }
});

musicBot.on("trackAdded", (track, queueSize, context) => {
    console.log(`➕ Added: ${track.title} (Queue: ${queueSize}) (Requested by: ${context?.member?.displayName || "N/A"})`);
    if (context && context.channel) {
        context.channel.send(`✅ Added to queue: **${track.title}** (#${queueSize})`).catch(console.error);
    }
});

musicBot.on("queueEnd", (context) => {
    console.log("⏹️ Queue ended.");
    if (context && context.channel) {
        context.channel.send("⏹️ Queue has ended.").catch(console.error);
    }
});

musicBot.on("trackError", (error, track, context) => {
    console.error(`Error with track ${track?.title || "Unknown"}: ${error.message}`);
    const errChannel = (context && context.channel) || (track?.metadata && track.metadata.channel);
    if (errChannel) {
        let userMessage = `⚠️ Error processing ${track ? `**${track.title}**` : "the request"}.`;
        if (error.message.includes("DRM protection")) {
            userMessage += " This content might be DRM protected. I will try to find an alternative.";
        } else if (error.message.includes("Could not find a playable stream")) {
            userMessage += " I couldn\'t find a playable version of this track after searching.";
        } else {
            userMessage += ` Details: ${error.message}`;
        }
        errChannel.send(userMessage).catch(console.error);
    }
});

musicBot.on("commandError", (command, error, context) => {
    console.error(`Error in command ${command?.name || "Unknown"}: ${error.message}`);
    if (context && context.channel) {
        context.channel.send(`❌ Error executing command 
**${command?.name || "Unknown"}**: ${error.message}`).catch(console.error);
    }
});

musicBot.on("unknownCommand", (commandName, context) => {
    console.log(`Unknown command: ${commandName}`);
    if (context && context.channel) {
        context.channel.send(`❓ Unknown command: **${commandName}**`).catch(console.error);
    }
});

musicBot.on("debug", (message, data, context) => {
    // console.log(`[DEBUG] ${message}`, data || "", context ? `(Context Guild: ${context.guild?.id})` : "");
});

// --- إعداد عميل Discord ---
client.once("ready", () => {
    console.log(`🤖 ${client.user.tag} is online and ready!`);
    client.user.setActivity("!play music | royalmusico", { type: "LISTENING" });
});

client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;

    // إنشاء كائن السياق (CommandContext)
    const commandContext = {
        guild: message.guild,
        channel: message.channel,       // قناة النص التي جاءت منها الرسالة
        member: message.member,         // عضو الخادم الذي أرسل الرسالة
        client: client,               // عميل Discord.js
        message: message,             // كائن الرسالة الأصلي من Discord.js
        musicBot: musicBot            // تمرير مثيل MusicBot نفسه ضمن السياق
    };

    try {
        // تمرير محتوى الرسالة والسياق إلى معالج الأوامر في MusicBot
        // لا حاجة للتحقق من البادئة هنا، MusicBot.handleMessage سيفعل ذلك
        await musicBot.handleMessage(message.content, commandContext);
    } catch (error) {
        console.error("Main message handler error:", error);
        if (commandContext.channel) {
            commandContext.channel.send("An unexpected error occurred while processing your command.").catch(console.error);
        }
    }
});

client.login(process.env.BOT_TOKEN).catch(err => {
    console.error("Failed to login to Discord:", err);
    process.exit(1);
});

console.log("Attempting to log in to Discord...");
