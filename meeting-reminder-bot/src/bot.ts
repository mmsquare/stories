import { Telegraf } from 'telegraf';
import { config } from './config';
import { scheduler } from './scheduler';
import { store } from './store';
import { DateTime } from 'luxon';
import { generateReminder } from './services/generator';

export const bot = new Telegraf(config.BOT_TOKEN);

export function setupBot() {
    bot.command('start', (ctx) => {
      ctx.reply('Hello! I am your Meeting Reminder Bot. Use /help to see what I can do.');
    });

    bot.command('help', (ctx) => {
      ctx.reply(
        '/set_schedule <day> <hour> <minute> - Set weekly reminder (Day: 0-6, Sun-Sat)\n' +
        '/cancel_this_week - Cancel the reminder for this week\n' +
        '/uncancel_this_week - Re-enable reminder for this week\n' +
        '/test_reminder - Send a test reminder now\n' +
        '/get_id - Get this chat ID'
      );
    });

    bot.command('get_id', (ctx) => {
      ctx.reply(`Chat ID: ${ctx.chat.id}`);
    });

    bot.command('set_schedule', (ctx) => {
      const parts = ctx.message.text.split(' ');
      if (parts.length !== 4) {
        return ctx.reply('Usage: /set_schedule <day 0-6> <hour 0-23> <minute 0-59>');
      }

      const day = parseInt(parts[1]);
      const hour = parseInt(parts[2]);
      const minute = parseInt(parts[3]);

      if (isNaN(day) || isNaN(hour) || isNaN(minute)) {
        return ctx.reply('Invalid numbers.');
      }

      scheduler.updateSchedule(day, hour, minute);
      ctx.reply(`Schedule updated to Day ${day}, ${hour}:${minute} (Asia/Shanghai)`);
    });

    bot.command('cancel_this_week', (ctx) => {
      const job = scheduler.job;
      if (!job) return ctx.reply('No schedule set.');
      
      const nextInvocation = job.nextInvocation();
      if (!nextInvocation) return ctx.reply('No next invocation found.');

      const dateStr = DateTime.fromJSDate(nextInvocation).setZone('Asia/Shanghai').toFormat('yyyy-MM-dd');
      store.cancelDate(dateStr);
      ctx.reply(`Cancelled reminder for ${dateStr}.`);
    });

    bot.command('uncancel_this_week', (ctx) => {
       const job = scheduler.job;
      if (!job) return ctx.reply('No schedule set.');
      
      const nextInvocation = job.nextInvocation();
      if (!nextInvocation) return ctx.reply('No next invocation found.');

      const dateStr = DateTime.fromJSDate(nextInvocation).setZone('Asia/Shanghai').toFormat('yyyy-MM-dd');
      store.uncancelDate(dateStr);
      ctx.reply(`Re-enabled reminder for ${dateStr}.`);
    });

    bot.command('test_reminder', async (ctx) => {
        const now = DateTime.now().setZone('Asia/Shanghai');
        const reminder = await generateReminder(now.toFormat('cccc, LLLL dd'), now.toFormat('HH:mm'));
        ctx.reply(`${reminder}\n\n📝 [Meeting Notes](${config.MEETING_LINK})`, { parse_mode: 'Markdown' });
    });
}
