import { Telegraf } from 'telegraf';
import { config } from './config';
import { scheduler } from './scheduler';
import { store } from './store';
import { generateReminder } from './services/generator';

export const bot = new Telegraf(config.BOT_TOKEN);

export function setupBot(): void {
  bot.command('start', (ctx) => {
    ctx.reply(
      "Hi! I'm the AT Weekly All-Hands reminder bot. Use /help to see what I can do."
    );
  });

  bot.command('help', (ctx) => {
    ctx.reply(
      '/set_schedule <day> <hour> <minute> — Set recurring reminder (day 0–6 = Sun–Sat, time in Beijing)\n' +
        '/cancel_this_week — One-off cancel: skip reminder for the next scheduled meeting\n' +
        '/uncancel_this_week — Undo one-off cancel for that date\n' +
        '/test_reminder — Send a test reminder now\n' +
        '/get_id — Get this chat/group ID (for TARGET_GROUP_ID)'
    );
  });

  bot.command('get_id', (ctx) => {
    ctx.reply(`Chat/Group ID: ${ctx.chat.id}`);
  });

  bot.command('set_schedule', (ctx) => {
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length !== 4) {
      return ctx.reply('Usage: /set_schedule <day 0–6> <hour 0–23> <minute 0–59>');
    }

    const day = parseInt(parts[1], 10);
    const hour = parseInt(parts[2], 10);
    const minute = parseInt(parts[3], 10);

    if (Number.isNaN(day) || Number.isNaN(hour) || Number.isNaN(minute)) {
      return ctx.reply('Invalid numbers.');
    }
    if (day < 0 || day > 6) {
      return ctx.reply('Day must be 0–6 (Sunday=0, Saturday=6).');
    }
    if (hour < 0 || hour > 23) {
      return ctx.reply('Hour must be 0–23.');
    }
    if (minute < 0 || minute > 59) {
      return ctx.reply('Minute must be 0–59.');
    }

    scheduler.updateSchedule(day, hour, minute);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    ctx.reply(
      `Recurring reminder set: every **${dayNames[day]}** at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} Beijing time. ` +
        'Reminder is sent 24 hours before the meeting.',
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('cancel_this_week', (ctx) => {
    const meetingTime = scheduler.getNextMeetingTime();
    if (!meetingTime) {
      return ctx.reply('No schedule set. Use /set_schedule first.');
    }
    const dateStr = meetingTime.toFormat('yyyy-MM-dd');
    store.cancelDate(dateStr);
    ctx.reply(`One-off cancel: reminder for the meeting on **${dateStr}** (Beijing) will be skipped.`, {
      parse_mode: 'Markdown',
    });
  });

  bot.command('uncancel_this_week', (ctx) => {
    const meetingTime = scheduler.getNextMeetingTime();
    if (!meetingTime) {
      return ctx.reply('No schedule set.');
    }
    const dateStr = meetingTime.toFormat('yyyy-MM-dd');
    store.uncancelDate(dateStr);
    ctx.reply(`Restored reminder for **${dateStr}**.`, { parse_mode: 'Markdown' });
  });

  bot.command('test_reminder', async (ctx) => {
    const meetingTime = scheduler.getNextMeetingTime();
    if (!meetingTime) {
      return ctx.reply('Set a schedule with /set_schedule first.');
    }
    const dateFormatted = meetingTime.toFormat('EEEE, MMM d');
    const timeFormatted = meetingTime.toFormat('HH:mm');
    const beijingTimeLabel = `${timeFormatted} Beijing time`;
    const reminder = await generateReminder(dateFormatted, timeFormatted, beijingTimeLabel);
    const meetingNotesLine = config.MEETING_LINK
      ? `\n\n📝 Meeting notes template: ${config.MEETING_LINK}`
      : '';
    const fullMessage = `${reminder}${meetingNotesLine}`;
    console.log('[test_reminder] Final reminder message:', fullMessage);
    await ctx.reply(fullMessage);
  });
}
