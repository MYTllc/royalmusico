
// مثال لأمر التخطي

module.exports = {
    name: "skip",
    aliases: ["s", "تخطي"],
    description: "تخطي الأغنية الحالية.",
    usage: "!skip",
    category: "music",
    async execute(context, _args) {
        try {
            // استدعاء دالة التخطي من musicBot
            // يفترض أن musicBot متاح في السياق context.musicBot
            // وأن musicBot لديه دالة skip عامة
            const skippedTrack = await context.musicBot.skipTrack(context); // افترض أن هناك دالة skipTrack أو ما شابه

            if (skippedTrack) {
                // لا حاجة لإرسال رسالة هنا عادةً، لأن حدث trackEnd أو trackStart التالي يجب أن يتعامل مع إعلام المستخدم.
                // context.channel.send(`⏭️ تم تخطي: **${skippedTrack.title}**`).catch(console.error);
            } else {
                context.channel.send("⚠️ لا يوجد شيء لتخطيه حاليًا.").catch(console.error);
            }
        } catch (error) {
            console.error(`خطأ في أمر التخطي (${this.name}):`, error);
            context.channel.send(`❌ حدث خطأ أثناء محاولة تخطي الأغنية: ${error.message}`)
                .catch(e => console.error("فشل إرسال رسالة خطأ التخطي إلى Discord:", e));
        }
    }
};
