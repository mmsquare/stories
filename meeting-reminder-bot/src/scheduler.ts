import schedule from 'node-schedule';
import { DateTime } from 'luxon';
import { Telegraf } from 'telegraf';
import { config } from './config';
import { store } from './store';
import { generateReminder } from './services/generator';

const SHARER_ORDER = ['Shisi', 'Jiachen', 'Jiapeng', 'Jiayi', 'Liangshu', 'Huiwen', 'Tao', 'Tian', 'WZ'];
const SHARER_INDEX_KEY = 'sharerIndex';
const DEFAULT_SHARER_INDEX = 7; // Tian

function getCurrentSharerName(): string {
  const raw = store.getSetting(SHARER_INDEX_KEY);
  const index = raw !== null && raw !== '' ? parseInt(raw, 10) : DEFAULT_SHARER_INDEX;
  const safeIndex = Number.isNaN(index) ? DEFAULT_SHARER_INDEX : ((index % 9) + 9) % 9;
  return SHARER_ORDER[safeIndex];
}

function advanceSharerIndex(): void {
  const raw = store.getSetting(SHARER_INDEX_KEY);
  const index = raw !== null && raw !== '' ? parseInt(raw, 10) : DEFAULT_SHARER_INDEX;
  const safeIndex = Number.isNaN(index) ? DEFAULT_SHARER_INDEX : ((index % 9) + 9) % 9;
  store.setSetting(SHARER_INDEX_KEY, String((safeIndex + 1) % 9));
}

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

    const meetingDay = parseInt(store.getSetting('dayOfWeek') || '1'); // 1 = Monday
    const meetingHour = parseInt(store.getSetting('hour') || '10');
    const meetingMinute = parseInt(store.getSetting('minute') || '0');

    // Calculate reminder time (24 hours before meeting)
    // 24 hours before is simply: same time, previous day.
    const reminderDay = (meetingDay - 1 + 7) % 7;
    const reminderHour = meetingHour;
    const reminderMinute = meetingMinute;

    const rule = new schedule.RecurrenceRule();
    rule.dayOfWeek = reminderDay;
    rule.hour = reminderHour;
    rule.minute = reminderMinute;
    rule.tz = 'Asia/Shanghai';

    console.log(`Scheduling REMINDER for Day: ${reminderDay}, Time: ${reminderHour}:${reminderMinute} Asia/Shanghai (Meeting is Day: ${meetingDay})`);
    console.log(`Scheduling REMINDER for Day: ${meetingDay}, Time: ${meetingHour}:${meetingMinute}`);
    console.log(`TARGET_GROUP_ID: ${config.TARGET_GROUP_ID || '(not set)'}`);

    scheduler.job = schedule.scheduleJob(rule, async () => {
      // This runs at reminder time. Meeting is exactly 24 hours later.
      const now = DateTime.now().setZone('Asia/Shanghai').setLocale('zh-CN');
      
      // Calculate the ACTUAL meeting time based on configured settings
      // We convert user's day (0-6 Sun-Sat) to Luxon's weekday (1-7 Mon-Sun)
      const luxonMeetingDay = (meetingDay === 0 ? 7 : meetingDay);
      
      // Calculate days until the next scheduled meeting day
      // This ensures we always target the correct day of the week regardless of execution time
      // e.g. If now is Sun(7) and meeting is Mon(1), diff is 1.
      let daysUntil = (luxonMeetingDay - now.weekday + 7) % 7;
      
      // If daysUntil is 0 (today), we assume the meeting is next week if the time has passed
      // But since this is a reminder running 24h before, daysUntil should logically be 1.
      // We force it to be at least 1 day in the future to avoid "today" confusion.
      if (daysUntil === 0) {
         daysUntil = 7;
      }
      
      console.log('time is:', now);
      const meetingTime = now.plus({ days: daysUntil }).set({
        hour: meetingHour,
        minute: meetingMinute,
        second: 0,
        millisecond: 0
      });
      
      const dateStr = now.toFormat('yyyy-MM-dd'); // Use today's date for cancellation key? Or meeting date?
      // Let's use the meeting date for cancellation logic to be intuitive.
      // If I cancel "this week's meeting", I expect to reference the meeting date.
      const meetingDateStr = meetingTime.toFormat('yyyy-MM-dd');

      if (store.isCancelled(meetingDateStr)) {
        console.log(`Meeting for ${meetingDateStr} was cancelled. Skipping reminder.`);
        return;
      }

      const reminderText = await generateReminder(meetingTime.toFormat('M月d日 EEEE'), meetingTime.toFormat('HH:mm'));
      const sharerLine = `\n\n🔄 本周 HL/AI 案例分享：${getCurrentSharerName()}`;
      const message = `${reminderText}${sharerLine}\n\n📝 [会议记录模板](${config.MEETING_LINK})`;

      if (config.TARGET_GROUP_ID && scheduler.bot) {
        try {
            await scheduler.bot.telegram.sendMessage(config.TARGET_GROUP_ID, message, { parse_mode: 'Markdown' });
            advanceSharerIndex();
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
  },

  getCurrentSharerName: (): string => getCurrentSharerName(),

  getNextMeetingTime: (): DateTime | null => {
    const meetingDay = parseInt(store.getSetting('dayOfWeek') ?? '', 10);
    const meetingHour = parseInt(store.getSetting('hour') ?? '', 10);
    const meetingMinute = parseInt(store.getSetting('minute') ?? '', 10);
    if (Number.isNaN(meetingDay) || Number.isNaN(meetingHour) || Number.isNaN(meetingMinute)) {
      return null;
    }
    const now = DateTime.now().setZone('Asia/Shanghai').setLocale('zh-CN');
    const luxonMeetingDay = meetingDay === 0 ? 7 : meetingDay;
    let daysUntil = (luxonMeetingDay - now.weekday + 7) % 7;
    if (daysUntil === 0) {
      daysUntil = 7;
    }
    return now.plus({ days: daysUntil }).set({
      hour: meetingHour,
      minute: meetingMinute,
      second: 0,
      millisecond: 0
    });
  }
};
