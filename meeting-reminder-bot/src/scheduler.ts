import schedule from 'node-schedule';
import { DateTime } from 'luxon';
import { Telegraf } from 'telegraf';
import { config } from './config';
import { store } from './store';
import { generateReminder } from './services/generator';

export const scheduler = {
  job: null as schedule.Job | null,
  bot: null as Telegraf | null,

  init: (botInstance: Telegraf) => {
    scheduler.bot = botInstance;
    scheduler.scheduleJob();
  },

  scheduleJob: () => {
    if (scheduler.job) {
      scheduler.job.cancel();
    }

    const dayOfWeek = parseInt(store.getSetting('dayOfWeek') || '1'); // 1 = Monday
    const hour = parseInt(store.getSetting('hour') || '10');
    const minute = parseInt(store.getSetting('minute') || '0');

    const rule = new schedule.RecurrenceRule();
    rule.dayOfWeek = dayOfWeek;
    rule.hour = hour;
    rule.minute = minute;
    rule.tz = 'Asia/Shanghai';

    console.log(`Scheduling job for Day: ${dayOfWeek}, Time: ${hour}:${minute} Asia/Shanghai`);

    scheduler.job = schedule.scheduleJob(rule, async () => {
      const now = DateTime.now().setZone('Asia/Shanghai');
      const dateStr = now.toFormat('yyyy-MM-dd');

      if (store.isCancelled(dateStr)) {
        console.log(`Meeting for ${dateStr} was cancelled. Skipping.`);
        return;
      }

      const reminderText = await generateReminder(now.toFormat('cccc, LLLL dd'), now.toFormat('HH:mm'));
      const message = `${reminderText}\n\n📝 [Meeting Notes](${config.MEETING_LINK})`;

      if (config.TARGET_GROUP_ID && scheduler.bot) {
        try {
            await scheduler.bot.telegram.sendMessage(config.TARGET_GROUP_ID, message, { parse_mode: 'Markdown' });
        } catch (e) {
            console.error('Failed to send reminder:', e);
        }
      } else {
        console.log('No TARGET_GROUP_ID set or bot not initialized. Reminder would be:', message);
      }
    });
  },

  updateSchedule: (day: number, hour: number, minute: number) => {
    store.setSetting('dayOfWeek', day.toString());
    store.setSetting('hour', hour.toString());
    store.setSetting('minute', minute.toString());
    scheduler.scheduleJob();
  }
};
