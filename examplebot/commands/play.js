// /home/ubuntu/fixed_bot_script/commands/play.js
// مثال لأمر التشغيل

// في حال كانت الأوامر الخاصة بك عبارة عن فئات (Classes)
// const { Command } = require("royalmusico"); // افترض أن Command يتم تصديرها أو قم بإنشاء واجهة مشابهة

// class PlayCommand extends Command { // أو اسم مشابه للفئة الأساسية للأمر
//     constructor() {
//         super(
//             "play",
//             {
//                 aliases: ["p", "شغل"],
//                 description: "تشغيل أغنية أو إضافتها إلى قائمة الانتظار.",
//                 usage: "!play <اسم الأغنية أو الرابط>",
//                 category: "music",
//                 args: [
//                     {
//                         name: "query",
//                         description: "اسم الأغنية أو رابطها أو رابط قائمة التشغيل.",
//                         required: true,
//                         type: "string",
//                     },
//                 ],
//             }
//         );
//     }

//     async execute(context, args) {
//         const query = args.join(" ");
//         if (!query) {
//             return context.channel.send("⚠️ يرجى تقديم اسم أغنية أو رابط للتشغيل.");
//         }

//         try {
//             // استدعاء دالة التشغيل من musicBot
//             // يفترض أن musicBot متاح في السياق context.musicBot
//             await context.musicBot.play(context, query);
//             // لا حاجة لإرسال رسالة هنا، لأن حدث trackAdded أو trackStart سيتولى ذلك
//         } catch (error) {
//             console.error("خطأ في أمر التشغيل:", error);
//             context.channel.send(`❌ حدث خطأ أثناء محاولة تشغيل: ${error.message}`);
//         }
//     }
// }

// module.exports = PlayCommand;

// أو إذا كانت الأوامر كائنات بسيطة:
module.exports = {
    name: "play",
    aliases: ["p", "شغل"],
    description: "تشغيل أغنية أو إضافتها إلى قائمة الانتظار.",
    usage: "!play <اسم الأغنية أو الرابط>",
    category: "music",
    args: [
        {
            name: "query",
            description: "اسم الأغنية أو رابطها أو رابط قائمة التشغيل.",
            required: true,
            type: "string",
        },
    ],
    async execute(context, args) {
        const query = args.join(" ");
        if (!query) {
            // سيتم التعامل مع هذا بواسطة مدقق الوسائط في CommandManager إذا تم تكوينه بشكل كامل
            // ولكن من الجيد التحقق هنا أيضًا كخط دفاع إضافي
            return context.channel.send("⚠️ يرجى تقديم اسم أغنية أو رابط للتشغيل. الاستخدام: `!play <اسم الأغنية أو الرابط>`");
        }

        try {
            // استدعاء دالة التشغيل من musicBot
            // يفترض أن musicBot متاح في السياق context.musicBot
            // وأن musicBot لديه دالة play عامة للتعامل مع طلبات التشغيل
            // هذا الجزء يعتمد على كيفية تصميم دالة play في MusicBot.ts
            // قد تحتاج إلى تعديل هذا بناءً على الواجهة الفعلية لـ musicBot.play
            await context.musicBot.playTrack(context, query); // افترض أن هناك دالة playTrack أو ما شابه
            // لا حاجة لإرسال رسالة هنا عادةً، لأن أحداث مثل trackAdded أو trackStart يجب أن تتعامل مع إعلام المستخدم.
        } catch (error) {
            console.error(`خطأ في أمر التشغيل (${this.name}):`, error);
            context.channel.send(`❌ حدث خطأ أثناء محاولة تشغيل الأغنية: ${error.message}`)
                .catch(e => console.error("فشل إرسال رسالة خطأ التشغيل إلى Discord:", e));
        }
    }
};
