# مكتبة بوت الموسيقى المتقدمة Royal Musico v1.2.3 

مكتبة بوت موسيقى قوية ومتعددة المنصات، مبنية باستخدام TypeScript، ومصممة لتوفير تجربة تشغيل موسيقى سلسة وقابلة للتخصيص بدرجة عالية. تم تحديث هذه النسخة لمعالجة تمرير السياق (`metadata`) بشكل أفضل، وتحسين التعامل مع أخطاء DRM، وتوفير توثيق أوضح.

## الميزات الرئيسية

- **دعم منصات متعددة:** تشغيل الموسيقى من YouTube، SoundCloud. بالنسبة لـ Spotify، يتم البحث عن الأغنية ومحاولة إيجاد بدائل قابلة للبث على YouTube أو SoundCloud (بسبب قيود DRM).
- **نظام قائمة تشغيل متقدم:** يدعم التخزين (حتى 200 أغنية قابلة للتعديل)، التكرار (أغنية/قائمة)، قائمة الأولوية.
- **نظام أوامر مرن:** معالج أوامر قابل للتوسيع مع مجموعة غنية من الأوامر المدمجة (`!play`, `!skip`, `!queue`, `!loop`, `!volume`, `!pause`, `!resume`, `!shuffle`, `!remove`, وغيرها).
- **نظام أحداث شامل:** يوفر أحداثًا متنوعة (`trackStart`, `queueEnd`, `trackError`, `trackAdded`, وغيرها) لمتابعة حالة البوت والتفاعل معها، مع تمرير سياق الأمر (`CommandContext`) بشكل موثوق.
- **جودة صوت عالية:** يعتمد على `yt-dlp` لاستخلاص روابط البث عالية الجودة.
- **بحث ذكي و Fallback:** يبحث عن الأغاني عبر Spotify أولاً (إذا تم تكوينه، للبحث عن اسم الأغنية والفنان)، ثم SoundCloud، ثم YouTube، مع منطق fallback ذكي.
- **أداء محسن:** يستخدم Worker Threads لمعالجة عمليات `yt-dlp` دون حجب الـ Event Loop الرئيسي.
- **قابلية تخصيص عالية:** يمكن تخصيص العديد من جوانب المكتبة لتناسب احتياجاتك.
- **مبني بـ TypeScript:** يوفر أمانًا للأنواع وتجربة تطوير محسنة.

## التغييرات الهامة في هذه النسخة

- **تحسين تمرير السياق (`metadata`):** تم توحيد طريقة تمرير كائن `CommandContext` (الذي يحتوي على `guild`, `channel`, `member`, `message`, إلخ) إلى خاصية `metadata` لكل `PlayableTrack`. يتم الآن تمرير هذا السياق بشكل متسق عبر جميع الأحداث الصادرة من `MusicBot`، `QueueManager`، و `AudioPlayer`، مما يسهل على المطور الوصول إلى معلومات الطلب الأصلي داخل معالجات الأحداث.
- **معالجة أخطاء DRM (Spotify):** عند محاولة تشغيل رابط Spotify محمي بـ DRM، سيتم إصدار خطأ واضح يفيد بذلك، وستحاول المكتبة تلقائيًا البحث عن بديل قابل للبث على المنصات الأخرى (YouTube/SoundCloud) بناءً على معلومات الأغنية.
- **توضيحات في التوثيق:** تم تحديث هذا الـ README ليشمل أمثلة أوضح حول كيفية التعامل مع السياق في الأحداث وكيفية إعداد Spotify.

## جدول المحتويات

- [التثبيت](#التثبيت)
- [الإعداد الأساسي (مثال Discord.js)](#الإعداد-الأساسي-مثال-discordjs)
- [متطلبات النظام](#متطلبات-النظام)
- [خيارات التكوين](#خيارات-التكوين)
- [الأوامر المدمجة](#الأوامر-المدمجة)
- [الأحداث وكيفية استخدام السياق (`metadata`)](#الأحداث-وكيفية-استخدام-السياق-metadata)
- [التكامل مع Spotify](#التكامل-مع-spotify)
- [متقدم: تخصيص وتوسيع المكتبة](#متقدم-تخصيص-وتوسيع-المكتبة)
- [المساهمة](#المساهمة)
- [الترخيص](#الترخيص)

## التثبيت

لتثبيت المكتبة، استخدم مدير الحزم npm:

```bash
npm install royalmusico
# أو إذا كنت تستخدم إصدارًا محددًا من GitHub (مثال):
# npm install MYTllc/royalmusico#main 
```

تأكد أيضًا من تثبيت `yt-dlp` على نظامك وأن يكون متاحًا في متغير `PATH` الخاص بالنظام. يمكنك تنزيله من [الموقع الرسمي لـ yt-dlp](https://github.com/yt-dlp/yt-dlp).

## الإعداد الأساسي (مثال Discord.js)

إليك مثال محدث يوضح كيفية إعداد بوت Discord.js باستخدام هذه المكتبة، مع التركيز على تمرير السياق الصحيح:

```javascript
// examplebot/index.js (مثال توضيحي)
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { MusicBot, PlayCommand, SkipCommand, QueueCommand, LoopCommand, VolumeCommand, PauseCommand, ResumeCommand, ShuffleCommand, RemoveCommand, NowPlayingCommand, StopCommand, ClearQueueCommand } = require("royalmusico");
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
    commandPrefix: "!",
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID, // اتركه فارغًا إذا لم تكن تستخدم Spotify
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    },
    ytDlpOptions: {
        // ytDlpPath: "/usr/local/bin/yt-dlp", // إذا لم يكن في PATH
    },
    audioPlayerOptions: {
        leaveOnEnd: true,
        leaveOnStop: true,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 60000, // 60 ثانية
    },
    queueOptions: {
        maxSize: 150,
    },
    fallbackSearchOrder: ["youtube", "soundcloud"], // Spotify يُستخدم للبحث عن البيانات الوصفية إذا تم توفير Client ID/Secret
});

// تسجيل الأوامر
musicBot.registerCommand([
    new PlayCommand(), new SkipCommand(), new QueueCommand(), new LoopCommand(),
    new VolumeCommand(), new PauseCommand(), new ResumeCommand(), new ShuffleCommand(),
    new RemoveCommand(), new NowPlayingCommand(), new StopCommand(), new ClearQueueCommand()
]);

// معالجات الأحداث (مع استخدام السياق بشكل صحيح)
musicBot.on("trackStart", (track, context) => {
    console.log(`▶️ Playing: ${track.title}`);
    if (context && context.channel) {
        context.channel.send(`🎶 Now playing: **${track.title}**`).catch(console.error);
    } else if (track.metadata && track.metadata.channel) {
        // كحل احتياطي إذا تم تمرير السياق عبر track.metadata مباشرة في بعض الحالات
        track.metadata.channel.send(`🎶 Now playing: **${track.title}**`).catch(console.error);
    }
});

musicBot.on("trackAdded", (track, queueSize, context) => {
    console.log(`➕ Added: ${track.title} (Queue: ${queueSize})`);
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
            userMessage += " This content might be DRM protected. I'll try to find an alternative.";
        }
        errChannel.send(userMessage).catch(console.error);
    }
});

musicBot.on("commandError", (command, error, context) => {
    console.error(`Error in command ${command?.name || "Unknown"}: ${error.message}`);
    if (context && context.channel) {
        context.channel.send(`❌ Error executing command: ${error.message}`).catch(console.error);
    }
});

// ... (بقية معالجات الأحداث مثل debug, unknownCommand, etc.)

client.once("ready", () => {
    console.log(`🤖 ${client.user.tag} is online and ready!`);
    client.user.setActivity("!play music", { type: "LISTENING" });
});

client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;

    // إنشاء كائن السياق (CommandContext)
    // هذا هو الكائن الذي سيتم تمريره كـ 'metadata' للأغنية وكوسيط ثالث للأحداث
    const commandContext = {
        guild: message.guild,
        channel: message.channel,       // قناة النص
        member: message.member,         // عضو الخادم
        client: client,               // عميل Discord
        message: message,             // الرسالة الأصلية
        musicBot: musicBot            // تمرير musicBot نفسه ضمن السياق
    };

    // تمرير محتوى الرسالة والسياق إلى معالج الأوامر في MusicBot
    // لا حاجة للتحقق من البادئة هنا، MusicBot.handleMessage سيفعل ذلك
    try {
        await musicBot.handleMessage(message.content, commandContext);
    } catch (error) {
        console.error("Main message handler error:", error);
        // يمكن إرسال رسالة خطأ عامة هنا إذا لم يتم التعامل معها بواسطة commandError
    }
});

client.login(process.env.BOT_TOKEN).catch(err => {
    console.error("Failed to login to Discord:", err);
});
```

## متطلبات النظام

- Node.js (الإصدار 20 أو أحدث موصى به، كما هو محدد في `engines` بملف `package.json`).
- `yt-dlp` مثبت ومتاح في `PATH` أو مساره محدد في الخيارات.
- (اختياري) حساب Spotify Developer مع Client ID و Client Secret لتفعيل البحث عن بيانات الأغاني عبر Spotify.

## خيارات التكوين

عند إنشاء مثيل `MusicBot`، يمكنك تمرير كائن خيارات لتخصيص سلوكه:

- `commandPrefix` (string, اختياري): البادئة المستخدمة للأوامر (الافتراضي: `"!"`).
- `ytDlpOptions` (object, اختياري):
  - `ytDlpPath` (string, اختياري): المسار إلى ملف `yt-dlp` التنفيذي (الافتراضي: `"yt-dlp"`).
- `audioPlayerOptions` (object, اختياري): خيارات لتمريرها إلى `AudioPlayer` (مثل `leaveOnEnd`, `leaveOnEmptyCooldown`).
- `queueOptions` (object, اختياري):
  - `maxSize` (number, اختياري): الحد الأقصى لحجم قائمة الانتظار (الافتراضي: `200`).
  - `defaultLoop` (LoopMode, اختياري): وضع التكرار الافتراضي (الافتراضي: `LoopMode.NONE`).
- `spotify` (object, اختياري):
  - `clientId` (string): Spotify Client ID. **مطلوب إذا كنت تريد استخدام تكامل Spotify للبحث عن معلومات الأغاني**.
  - `clientSecret` (string): Spotify Client Secret. **مطلوب إذا كنت تريد استخدام تكامل Spotify**.
- `preferSoundCloudWithYouTubeLinks` (boolean, اختياري): إذا كان `true`، عند إدخال رابط YouTube، ستحاول المكتبة البحث عن بديل على SoundCloud أولاً (الافتراضي: `false`).
- `fallbackSearchOrder` (("youtube" | "soundcloud")[], اختياري): يحدد ترتيب البحث عند إدخال اسم أغنية (الافتراضي: `["youtube", "soundcloud"]`). لاحظ أن Spotify يُستخدم لجلب البيانات الوصفية إذا تم توفير `clientId` و `clientSecret`، ثم يتم البحث عن مصدر قابل للبث بناءً على هذه البيانات.

## الأوامر المدمجة

توفر المكتبة مجموعة من الأوامر المدمجة الجاهزة للاستخدام (تأكد من تسجيلها كما في المثال أعلاه):

- `!play <اسم الأغنية أو الرابط>`: يشغل أغنية أو يضيفها إلى قائمة الانتظار.
- `!skip`: يتخطى الأغنية الحالية.
- `!queue`: يعرض قائمة الانتظار الحالية.
- `!loop <none|track|queue>`: يضبط وضع التكرار.
- `!volume <0-100>`: يضبط مستوى الصوت (ملاحظة: التحكم الفعلي بالصوت يعتمد على تكامل `discord.js/@discordjs/voice` الذي لم يتم تضمينه بالكامل في هذا المثال الأساسي للمكتبة).
- `!pause`: يوقف الأغنية الحالية مؤقتًا.
- `!resume`: يستأنف تشغيل الأغنية الموقوفة مؤقتًا.
- `!shuffle`: يخلط ترتيب الأغاني في قائمة الانتظار.
- `!remove <رقم الأغنية في القائمة>`: يزيل أغنية من قائمة الانتظار.
- `!nowplaying` أو `!np`: يعرض الأغنية التي يتم تشغيلها حاليًا.
- `!stop`: يوقف التشغيل ويمسح قائمة الانتظار.
- `!clear`: يمسح قائمة الانتظار.

## الأحداث وكيفية استخدام السياق (`metadata`)

تصدر `MusicBot` العديد من الأحداث. الأهم من ذلك، أن الوسيط الثالث لمعظم هذه الأحداث هو كائن `CommandContext` (أو `undefined` إذا لم يكن هناك سياق مباشر). هذا الكائن يحتوي على معلومات الطلب الأصلي.

```typescript
musicBot.on("trackStart", (track: PlayableTrack, context?: CommandContext) => {
  if (context && context.channel) {
    context.channel.send(`Playing: ${track.title} (Requested by: ${context.member?.displayName})`);
  }
});

musicBot.on("trackAdded", (track: PlayableTrack, queueSize: number, context?: CommandContext) => {
  if (context && context.channel) {
    context.channel.send(`${track.title} added to queue by ${context.member?.displayName}.`);
  }
});
```

**ملاحظة هامة:** في الإصدارات السابقة، كان يتم الاعتماد على `track.metadata` بشكل أساسي. الآن، الطريقة الموصى بها هي استخدام الوسيط الثالث `context` الذي يتم تمريره مباشرة إلى معالج الحدث. ومع ذلك، لا يزال `track.metadata` يتم تعيينه إلى `CommandContext` عند إضافة الأغنية، ويمكن استخدامه كاحتياطي.

## التكامل مع Spotify

لتفعيل البحث عن معلومات الأغاني عبر Spotify (مثل اسم الأغنية، الفنان، الألبوم عند إدخال رابط Spotify أو البحث بالاسم)، ستحتاج إلى توفير `clientId` و `clientSecret` لحساب Spotify Developer الخاص بك في خيارات `MusicBot`.

```typescript
const bot = new MusicBot({
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID, // استخدم متغيرات البيئة
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  },
  // ... other options
});
```

عندما يتم البحث عن أغنية بالاسم، أو عند توفير رابط Spotify، ستحاول المكتبة استخدام Spotify API لجلب معلومات الأغنية. بعد ذلك، ستبحث عن مصدر قابل للبث لهذه الأغنية على YouTube أو SoundCloud.
**تنبيه بخصوص DRM:** روابط Spotify المباشرة غالبًا ما تكون محمية بـ DRM ولا يمكن تشغيلها مباشرة. المكتبة مصممة للبحث عن بدائل قابلة للبث. إذا فشل ذلك، سيتم إعلام المستخدم.

## متقدم: تخصيص وتوسيع المكتبة

### إنشاء أوامر مخصصة

يمكنك بسهولة إنشاء أوامرك المخصصة عن طريق تطبيق واجهة `Command` وتسجيلها في `CommandManager`.

```typescript
import { Command, CommandContext, MusicBot } from 'royalmusico';

class MyCustomCommand implements Command {
  name = "mycommand";
  // ... (بقية خصائص الأمر كما هو موضح في README الأصلي)

  async execute(context: CommandContext, args: string[]): Promise<void | string | object> {
    const musicBotInstance = context.musicBot; // السياق يحتوي الآن على musicBot
    // ... (منطق الأمر)
    return `Custom command executed! Argument: ${args.join(" ")}`;
  }
}

// ... (إنشاء مثيل البوت)
bot.registerCommand(new MyCustomCommand());
```

### تعديل سلوك yt-dlp

يمكنك تعديل مسار `yt-dlp` أو تمرير خيارات إضافية عبر `ytDlpOptions`.



