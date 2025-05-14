# مكتبة بوت الموسيقى المتقدمة
# Royal Musico v1.2
مكتبة بوت موسيقى قوية ومتعددة المنصات، مبنية باستخدام TypeScript، ومصممة لتوفير تجربة تشغيل موسيقى سلسة وقابلة للتخصيص بدرجة عالية.

## الميزات الرئيسية

- **دعم منصات متعددة:** تشغيل الموسيقى من YouTube، SoundCloud، Spotify (عبر البحث وإيجاد بدائل قابلة للبث)، Instagram، TikTok، و Twitch.
- **نظام قائمة تشغيل متقدم:** يدعم التخزين (حتى 200 أغنية قابلة للتعديل)، التكرار (أغنية/قائمة)، قائمة الأولوية، والتخزين المؤقت عند إعادة التشغيل (ميزة مستقبلية).
- **نظام أوامر مرن:** معالج أوامر قابل للتوسيع مع مجموعة غنية من الأوامر المدمجة (`!play`, `!skip`, `!queue`, `!loop`, `!volume`, `!pause`, `!resume`, `!shuffle`, `!remove`, وغيرها).
- **نظام أحداث شامل:** يوفر أحداثًا متنوعة (`trackStart`, `queueEnd`, `trackError`, `trackAdded`, وغيرها) لمتابعة حالة البوت والتفاعل معها.
- **جودة صوت عالية:** يعتمد على `yt-dlp` لاستخلاص روابط البث عالية الجودة.
- **بحث ذكي و Fallback:** يبحث عن الأغاني عبر Spotify أولاً (إذا تم تكوينه)، ثم SoundCloud، ثم YouTube، مع منطق fallback ذكي لضمان أفضل فرصة للعثور على الأغنية المطلوبة.
- **أداء محسن:** يستخدم Worker Threads لمعالجة عمليات `yt-dlp` دون حجب الـ Event Loop الرئيسي.
- **قابلية تخصيص عالية:** يمكن تخصيص العديد من جوانب المكتبة لتناسب احتياجاتك.
- **مبني بـ TypeScript:** يوفر أمانًا للأنواع وتجربة تطوير محسنة.

## جدول المحتويات

- [التثبيت](#التثبيت)
- [الإعداد الأساسي](#الإعداد-الأساسي)
- [متطلبات النظام](#متطلبات-النظام)
- [أمثلة الاستخدام](#أمثلة-الاستخدام)
  - [إنشاء مثيل من البوت](#إنشاء-مثيل-من-البوت)
  - [تسجيل الأوامر](#تسجيل-الأوامر)
  - [معالجة الرسائل](#معالجة-الرسائل)
  - [الاستماع إلى الأحداث](#الاستماع-إلى-الأحداث)
- [خيارات التكوين](#خيارات-التكوين)
- [الأوامر المدمجة](#الأوامر-المدمجة)
- [الأحداث](#الأحداث)
- [التكامل مع Spotify](#التكامل-مع-spotify)
- [متقدم: تخصيص وتوسيع المكتبة](#متقدم-تخصيص-وتوسيع-المكتبة)
  - [إنشاء أوامر مخصصة](#إنشاء-أوامر-مخصصة)
  - [تعديل سلوك yt-dlp](#تعديل-سلوك-yt-dlp)
- [المساهمة](#المساهمة)
- [الترخيص](#الترخيص)

## التثبيت

لتثبيت المكتبة، استخدم مدير الحزم npm أو yarn:

```bash
npm install music-bot-library
# أو
yarn add music-bot-library
```

تأكد أيضًا من تثبيت `yt-dlp` على نظامك وأن يكون متاحًا في متغير `PATH` الخاص بالنظام. يمكنك تنزيله من [الموقع الرسمي لـ yt-dlp](https://github.com/yt-dlp/yt-dlp).

## الإعداد الأساسي

إليك مثال بسيط لكيفية إعداد وتشغيل بوت موسيقى باستخدام هذه المكتبة:

```typescript
import { MusicBot, MusicBotOptions, PlayCommand, SkipCommand, QueueCommand, LoopCommand, VolumeCommand, PauseCommand, ShuffleCommand, RemoveCommand } from 'royalmusico';
import * as dotenv from 'dotenv';

dotenv.config(); // لتحميل متغيرات البيئة من ملف .env

const botOptions: MusicBotOptions = {
  commandPrefix: "!", // اختياري، الافتراضي هو "!"
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || "YOUR_SPOTIFY_CLIENT_ID",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "YOUR_SPOTIFY_CLIENT_SECRET",
  },
  ytDlpOptions: {
    ytDlpPath: "yt-dlp", // اختياري، إذا كان yt-dlp في PATH
  },
  preferSoundCloudWithYouTubeLinks: true, // بحث SoundCloud عند إدخال رابط يوتيوب
  fallbackSearchOrder: ["spotify", "youtube", "soundcloud"], // ترتيب البحث الافتراضي
};

const musicBot = new MusicBot(botOptions);

// تسجيل الأوامر المدمجة
musicBot.registerCommand([
  new PlayCommand(),
  new SkipCommand(),
  new QueueCommand(),
  new LoopCommand(),
  new VolumeCommand(),
  new PauseCommand(),
  new ShuffleCommand(),
  new RemoveCommand(),
  // يمكنك إضافة أوامر مخصصة هنا
]);

// مثال على معالجة رسالة (سيعتمد على منصة البوت الخاصة بك، مثل Discord.js)
async function onMessage(messageContent: string, userId: string, channelId: string, guildId: string) {
  if (!messageContent.startsWith(musicBot.commandManager.getCommand("play")?.usage?.split(" ")[0] || botOptions.commandPrefix)) return;

  console.log(`[${guildId}-${channelId}] User ${userId} sent: ${messageContent}`);
  await musicBot.handleMessage(messageContent, { /* guildId, channelId, userId */ });
}

// الاستماع إلى الأحداث
musicBot.on("trackStart", (track) => {
  console.log(`▶️ Now playing: ${track.title} by ${track.artist || "Unknown Artist"}`);
  // أرسل رسالة إلى القناة هنا
});

musicBot.on("trackAdded", (track, queueSize) => {
  console.log(`➕ Added to queue: ${track.title} (Queue size: ${queueSize})`);
  // أرسل رسالة إلى القناة هنا
});

musicBot.on("queueEnd", () => {
  console.log("⏹️ Queue ended.");
  // أرسل رسالة إلى القناة هنا
});

musicBot.on("trackError", (error, track) => {
  console.error(`Error playing ${track?.title || "a track"}: ${error.message}`);
  // أرسل رسالة خطأ إلى القناة هنا
});

musicBot.on("debug", (message, data) => {
  console.log(`[DEBUG] ${message}`, data || "");
});

// مثال على تشغيل أمر برمجيًا
// (async () => {
//   await onMessage("!play https://www.youtube.com/watch?v=dQw4w9WgXcQ", "user123", "channel123", "guild123");
//   setTimeout(async () => {
//     await onMessage("!play Never Gonna Give You Up", "user123", "channel123", "guild123");
//   }, 5000);
//   setTimeout(async () => {
//      await onMessage("!skip", "user123", "channel123", "guild123");
//   }, 10000);
// })();

console.log("Music Bot instance created. Ready to process commands.");

// ملاحظة: هذا مجرد هيكل أساسي. ستحتاج إلى دمجه مع مكتبة البوت الخاصة بمنصتك (مثل Discord.js, Telegram.js, etc.)
// لمعالجة الرسائل الواردة وإرسال الردود.
```

## متطلبات النظام

- Node.js (الإصدار 16 أو أحدث موصى به)
- `yt-dlp` مثبت ومتاح في `PATH` أو مساره محدد في الخيارات.
- (اختياري) حساب Spotify Developer مع Client ID و Client Secret لتفعيل البحث عبر Spotify.

## أمثلة الاستخدام

(راجع قسم [الإعداد الأساسي](#الإعداد-الأساسي) لمثال شامل)

### إنشاء مثيل من البوت

```typescript
import { MusicBot, MusicBotOptions } from 'royalmusico';

const options: MusicBotOptions = {
  commandPrefix: "!",
  spotify: {
    clientId: "YOUR_SPOTIFY_CLIENT_ID",
    clientSecret: "YOUR_SPOTIFY_CLIENT_SECRET",
  }
  // ... other options
};

const bot = new MusicBot(options);
```

### تسجيل الأوامر

يمكنك تسجيل الأوامر المدمجة أو أوامرك المخصصة.

```typescript
import { PlayCommand, SkipCommand } from 'music-bot-library';
// ... (إنشاء مثيل البوت)

bot.registerCommand(new PlayCommand());
bot.registerCommand(new SkipCommand());
// أو كمصفوفة
// bot.registerCommand([new PlayCommand(), new SkipCommand()]);
```

### معالجة الرسائل

ستحتاج إلى تمرير محتوى الرسالة إلى `bot.handleMessage()`.

```typescript
// ضمن معالج الرسائل الخاص بمنصتك (مثل client.on('messageCreate', ...) في Discord.js)
async function handlePlatformMessage(platformMessage: any) {
  const content = platformMessage.content; // افترض أن هذه هي طريقة الحصول على محتوى الرسالة
  const context = {
    // guildId: platformMessage.guild.id, // مثال لسياق المنصة
    // channelId: platformMessage.channel.id,
    // userId: platformMessage.author.id,
  };
  await bot.handleMessage(content, context);
}
```

### الاستماع إلى الأحداث

توفر المكتبة العديد من الأحداث لمراقبة حالة البوت.

```typescript
bot.on("trackStart", (track) => {
  console.log(`Now playing: ${track.title}`);
  // أرسل رسالة تأكيد إلى المستخدم
});

bot.on("queueEnd", () => {
  console.log("Queue has ended.");
});

bot.on("trackError", (error, track) => {
  console.error(`Error with track ${track?.title}: ${error.message}`);
});
```

## خيارات التكوين

عند إنشاء مثيل `MusicBot`، يمكنك تمرير كائن خيارات لتخصيص سلوكه:

- `commandPrefix` (string, اختياري): البادئة المستخدمة للأوامر (الافتراضي: `"!"`).
- `ytDlpOptions` (object, اختياري):
  - `ytDlpPath` (string, اختياري): المسار إلى ملف `yt-dlp` التنفيذي (الافتراضي: `"yt-dlp"`).
  - `workerPath` (string, اختياري): المسار إلى ملف `ytDlpWorker.js` (الافتراضي هو مسار نسبي يتم حله تلقائيًا).
- `audioPlayerOptions` (object, اختياري): خيارات لتمريرها إلى `AudioPlayer` (مثل `volume`).
- `queueOptions` (object, اختياري):
  - `maxSize` (number, اختياري): الحد الأقصى لحجم قائمة الانتظار (الافتراضي: `200`).
  - `defaultLoop` (LoopMode, اختياري): وضع التكرار الافتراضي (الافتراضي: `LoopMode.NONE`).
- `spotify` (object, اختياري):
  - `clientId` (string, مطلوب إذا تم توفير كائن `spotify`): Spotify Client ID.
  - `clientSecret` (string, مطلوب إذا تم توفير كائن `spotify`): Spotify Client Secret.
- `preferSoundCloudWithYouTubeLinks` (boolean, اختياري): إذا كان `true`، عند إدخال رابط YouTube، ستحاول المكتبة البحث عن بديل على SoundCloud أولاً (الافتراضي: `false`).
- `fallbackSearchOrder` (("spotify" | "youtube" | "soundcloud")[], اختياري): يحدد ترتيب البحث عند إدخال اسم أغنية (الافتراضي: `["spotify", "youtube", "soundcloud"]`).

## الأوامر المدمجة

توفر المكتبة مجموعة من الأوامر المدمجة الجاهزة للاستخدام:

- `!play <اسم الأغنية أو الرابط>`: يشغل أغنية أو يضيفها إلى قائمة الانتظار.
- `!skip`: يتخطى الأغنية الحالية.
- `!queue`: يعرض قائمة الانتظار الحالية.
- `!loop <none|track|queue>`: يضبط وضع التكرار.
- `!volume <0-100>`: يضبط مستوى الصوت.
- `!pause`: يوقف الأغنية الحالية مؤقتًا.
- `!resume`: يستأنف تشغيل الأغنية الموقوفة مؤقتًا.
- `!shuffle`: يخلط ترتيب الأغاني في قائمة الانتظار.
- `!remove <رقم الأغنية في القائمة>`: يزيل أغنية من قائمة الانتظار.
- `!nowplaying` أو `!np`: يعرض الأغنية التي يتم تشغيلها حاليًا.
- `!stop`: يوقف التشغيل ويمسح قائمة الانتظار.
- `!clear`: يمسح قائمة الانتظار.

(ملاحظة: قد تحتاج إلى تسجيل بعض هذه الأوامر بشكل صريح إذا لم تكن مسجلة افتراضيًا في إصدارك أو إذا كنت تقوم بتخصيص قائمة الأوامر.)

## الأحداث

يمكنك الاستماع إلى الأحداث التالية التي تصدرها `MusicBot`:

- `trackStart (track: PlayableTrack)`: عند بدء تشغيل أغنية جديدة.
- `trackEnd (track: PlayableTrack, reason?: string)`: عند انتهاء الأغنية (بشكل طبيعي، أو تم تخطيها، أو بسبب خطأ).
- `trackError (error: Error, track?: PlayableTrack | null)`: عند حدوث خطأ أثناء محاولة تشغيل أغنية.
- `queueEnd ()`: عند انتهاء جميع الأغاني في قائمة الانتظار وعدم وجود وضع تكرار نشط.
- `trackAdded (track: PlayableTrack, queueSize: number)`: عند إضافة أغنية إلى قائمة الانتظار.
- `trackRemoved (track: PlayableTrack, queueSize: number)`: عند إزالة أغنية من قائمة الانتظار.
- `queueLooped ()`: عند تكرار قائمة الانتظار بأكملها.
- `loopModeChanged (mode: LoopMode)`: عند تغيير وضع التكرار.
- `volumeChanged (volume: number)`: عند تغيير مستوى الصوت.
- `paused (track?: PlayableTrack | null)`: عند إيقاف التشغيل مؤقتًا.
- `resumed (track?: PlayableTrack | null)`: عند استئناف التشغيل.
- `stopped (track?: PlayableTrack | null)`: عند إيقاف التشغيل بالكامل (عادةً بعد أمر `stop`).
- `shuffled ()`: عند خلط قائمة الانتظار.
- `queueCleared ()`: عند مسح قائمة الانتظار.
- `commandExecuted (command: Command, context: CommandContext)`: عند تنفيذ أمر بنجاح.
- `commandError (command: Command, error: Error, context: CommandContext)`: عند حدوث خطأ أثناء تنفيذ أمر.
- `unknownCommand (commandName: string, context: CommandContext)`: عند محاولة تنفيذ أمر غير موجود.
- `debug (message: string, data?: any)`: رسائل تصحيح الأخطاء الداخلية من المكتبة.

## التكامل مع Spotify

لتفعيل البحث عبر Spotify، ستحتاج إلى توفير `clientId` و `clientSecret` لحساب Spotify Developer الخاص بك في خيارات `MusicBot`.

```typescript
const bot = new MusicBot({
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID, // استخدم متغيرات البيئة
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  },
  // ... other options
});
```

عندما يتم البحث عن أغنية بالاسم، ستحاول المكتبة (إذا تم تكوينها بذلك في `fallbackSearchOrder`) البحث عنها على Spotify أولاً. إذا تم العثور على تطابق، ستحاول المكتبة بعد ذلك العثور على مصدر قابل للبث لهذه الأغنية على YouTube أو SoundCloud (لأن Spotify API لا يوفر روابط بث مباشرة يمكن استخدامها بسهولة في هذا السياق).

## متقدم: تخصيص وتوسيع المكتبة

### إنشاء أوامر مخصصة

يمكنك بسهولة إنشاء أوامرك المخصصة عن طريق تطبيق واجهة `Command` وتسجيلها في `CommandManager`.

```typescript
import { Command, CommandContext, MusicBot } from 'royalmusico';

class MyCustomCommand implements Command {
  name = "mycommand";
  aliases = ["mc"];
  description = "This is my custom command.";
  usage = "!mycommand <some argument>";
  category = "custom";
  args = [
    {
      name: "argument1",
      description: "Some argument for the command",
      required: true,
      type: "string" as const,
    },
  ];

  async execute(context: CommandContext, args: string[]): Promise<void | string | object> {
    const musicBotInstance = context.musicBot as MusicBot;
    const argument = args[0];

    if (!argument) {
      return `Please provide the required argument. Usage: ${this.usage}`;
    }

    // قم بتنفيذ منطق الأمر هنا
    console.log(`MyCustomCommand executed with argument: ${argument}`);
    // يمكنك التفاعل مع musicBotInstance.audioPlayer, musicBotInstance.queueManager, etc.
    return `You said: ${argument}`;
  }
}

// ... (إنشاء مثيل البوت)
bot.registerCommand(new MyCustomCommand());
```

### تعديل سلوك yt-dlp

يمكنك تعديل مسار `yt-dlp` أو تمرير خيارات إضافية عبر `ytDlpOptions`.


