const Telegraf = require('telegraf')

const bot = new Telegraf('1148691475:AAFKB-WXtGzOZkF28VDtKfTTlEcecYrGoyE')
//send /oldschool
bot.command('oldschool', (ctx) => {
    console.log('ctx.message.chat.id', ctx.message.chat.id)
    ctx.reply('Hello');
});

setInterval(()=>{
    bot.telegram.sendMessage(303599057,"aaaaa");
}, 30000);


// bot.command('modern', ({ reply }) => reply('Yo'))
// bot.command('hipster', Telegraf.reply('λ'))

// bot.on('sticker', (ctx) => ctx.reply('👍'))

bot.launch()
