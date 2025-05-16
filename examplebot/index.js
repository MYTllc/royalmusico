// examplebot/index.js (النسخة المصححة والمحسنة)
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { MusicBot } = require("royalmusico"); // PlayCommand وغيرها من الأوامر سيتم تحميلها ديناميكيًا
const fs = require("fs");
const path = require("path");
require("dotenv").config();

if (!process.env.BOT_TOKEN) {
    console.error("خطأ: لم يتم العثور على BOT_TOKEN في ملف .env.");
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
    commandPrefix: "!",
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID, // اتركه فارغًا إذا لم تكن تستخدم Spotify
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    },
    ytDlpOptions: {
        // ytDlpPath: "/usr/local/bin/yt-dlp", // قم بإلغاء التعليق وتعيين المسار إذا لم يكن yt-dlp في PATH
    },
    audioPlayerOptions: {
        leaveOnEnd: true,
        leaveOnStop: true,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 60000, // 60 ثانية
    },
    queueOptions: {
        maxSize: 200, // تم زيادة الحد الأقصى
    },
    fallbackSearchOrder: ["youtube", "soundcloud"], 
});

// --- تحميل وتسجيل الأوامر ديناميكيًا ---
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const commandModule = require(filePath);
        // التحقق من أن الوحدة المصدرة هي فئة أمر أو كائن أمر صالح
        if (commandModule && (typeof commandModule === 'function' || (typeof commandModule === 'object' && commandModule.name && commandModule.execute))) {
            // إذا كانت الوحدة المصدرة هي فئة (constructor)، قم بإنشاء مثيل لها
            const commandInstance = typeof commandModule === 'function' ? new commandModule() : commandModule;
            musicBot.commandManager.registerCommand(commandInstance);
            console.log(`✅ تم تحميل الأمر: ${commandInstance.name}`);
        } else if (commandModule && commandModule.default && (typeof commandModule.default === 'function' || (typeof commandModule.default === 'object' && commandModule.default.name && commandModule.default.execute))) {
            // دعم وحدات ES Modules التي تستخدم default export
            const commandInstance = typeof commandModule.default === 'function' ? new commandModule.default() : commandModule.default;
            musicBot.commandManager.registerCommand(commandInstance);
            console.log(`✅ تم تحميل الأمر (default export): ${commandInstance.name}`);
        } else {
            console.warn(`⚠️ لم يتم تصدير الأمر بشكل صحيح من ${file}`);
        }
    } catch (error) {
        console.error(`❌ خطأ في تحميل الأمر ${file}:`, error);
    }
}

// --- معالجات الأحداث (يمكنك إضافة المزيد أو تعديلها حسب الحاجة) ---
musicBot.on("trackStart", (track, context) => {
    console.log(`▶️ يتم الآن تشغيل: ${track.title} (بطلب من: ${context?.member?.displayName || "غير متوفر"})`);
    if (context && context.channel) {
        context.channel.send(`🎶 يتم الآن تشغيل: **${track.title}**`).catch(console.error);
    }
});

musicBot.on("trackAdded", (track, queueSize, context) => {
    console.log(`➕ تمت الإضافة: ${track.title} (قائمة الانتظار: ${queueSize}) (بطلب من: ${context?.member?.displayName || "غير متوفر"})`);
    if (context && context.channel) {
        context.channel.send(`✅ تمت الإضافة إلى قائمة الانتظار: **${track.title}** (#${queueSize})`).catch(console.error);
    }
});

musicBot.on("queueEnd", (guildId, context) => { // تم تعديل التوقيع ليشمل guildId أولاً كما هو متوقع في بعض إصدارات المكتبة
    console.log("⏹️ انتهت قائمة الانتظار.");
    if (context && context.channel) {
        context.channel.send("⏹️ انتهت قائمة الانتظار.").catch(console.error);
    }
});

musicBot.on("trackError", (error, track, context) => {
    console.error(`خطأ في المقطع ${track?.title || "غير معروف"}: ${error.message}`);
    const errChannel = (context && context.channel) || (track?.metadata && track.metadata.channel);
    if (errChannel) {
        let userMessage = `⚠️ خطأ في معالجة ${track ? `**${track.title}**` : "الطلب"}.`;
        if (error.message.includes("DRM protection")) {
            userMessage += " قد يكون هذا المحتوى محميًا بموجب إدارة الحقوق الرقمية. سأحاول البحث عن بديل.";
        } else if (error.message.includes("Could not find a playable stream")) {
            userMessage += " لم أتمكن من العثور على نسخة قابلة للتشغيل من هذا المقطع بعد البحث.";
        } else {
            userMessage += ` التفاصيل: ${error.message}`;
        }
        errChannel.send(userMessage).catch(console.error);
    }
});

musicBot.on("commandError", (command, error, context) => {
    console.error(`خطأ في الأمر ${command?.name || "غير معروف"}: ${error.message}`);
    if (context && context.channel) {
        context.channel.send(`❌ خطأ في تنفيذ الأمر **${command?.name || "غير معروف"}**: ${error.message}`).catch(console.error);
    }
});

musicBot.on("unknownCommand", (commandName, context) => {
    console.log(`أمر غير معروف: ${commandName}`);
    if (context && context.channel) {
        context.channel.send(`❓ أمر غير معروف: **${commandName}**`).catch(console.error);
    }
});

musicBot.on("debug", (message, data, context) => {
    // console.log(`[DEBUG] ${message}`, data || "", context ? `(سياق الخادم: ${context.guild?.id})` : "");
});

// --- إعداد عميل Discord ---
client.once("ready", () => {
    console.log(`🤖 ${client.user.tag} متصل وجاهز!`);
    client.user.setActivity("!play music | royalmusico v2", { type: "LISTENING" });
});

client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;

    const commandContext = {
        guild: message.guild,
        channel: message.channel,
        member: message.member,
        client: client,
        message: message,
        musicBot: musicBot
    };

    try {
        await musicBot.handleMessage(message.content, commandContext);
    } catch (error) {
        console.error("خطأ في معالج الرسائل الرئيسي:", error);
        if (commandContext.channel) {
            commandContext.channel.send("حدث خطأ غير متوقع أثناء معالجة طلبك.").catch(console.error);
        }
    }
});

client.login(process.env.BOT_TOKEN).catch(err => {
    console.error("فشل تسجيل الدخول إلى Discord:", err);
    process.exit(1);
});

console.log("جاري محاولة تسجيل الدخول إلى Discord...");

