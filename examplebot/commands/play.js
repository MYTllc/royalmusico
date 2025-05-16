// /home/ubuntu/fixed_bot_script/commands/play.js
// (النسخة المصححة v3 - استخدام PlayCommand من المكتبة مباشرة)

const { PlayCommand } = require("royalmusico");

// يتم تصدير مثيل من PlayCommand مباشرة
// هذا يفترض أن PlayCommand مصممة ليتم استخدامها بهذه الطريقة
// وأنها لا تتطلب أي معاملات خاصة في الـ constructor الخاص بها عند الاستخدام العام
module.exports = new PlayCommand();

