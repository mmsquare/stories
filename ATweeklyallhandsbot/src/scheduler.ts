import schedule from 'node-schedule';
import { DateTime } from 'luxon';
import { Telegraf } from 'telegraf';
import { config } from './config';
import { store } from './store';
import { generateReminder } from './services/generator';

const BEIJING_ZONE = 'Asia/Shanghai';

export const scheduler = {
  job: null as schedule.Job | null,
  bot: null as Telegraf | null,

  init: (botInstance: Telegraf): void => {
    scheduler.bot = botInstance;
    scheduler.scheduleJob();
  },

  scheduleJob: (): void => {
    if (scheduler.job) {
      scheduler.job.cancel();
    }

    const meetingDay = parseInt(store.getSetting('dayOfWeek') ?? '1', 10);
    const meetingHour = parseInt(store.getSetting('hour') ?? '10', 10);
    const meetingMinute = parseInt(store.getSetting('minute') ?? '0', 10);

    if (Number.isNaN(meetingDay) || Number.isNaN(meetingHour) || Number.isNaN(meetingMinute)) {
      console.log('Schedule not fully set. Run /set_schedule first.');
      return;
    }

    const reminderDay = (meetingDay - 1 + 7) % 7;
    const rule = new schedule.RecurrenceRule();
    rule.dayOfWeek = reminderDay;
    rule.hour = meetingHour;
    rule.minute = meetingMinute;
    rule.tz = BEIJING_ZONE;

    console.log(
      `Scheduling reminder: Day ${reminderDay}, ${meetingHour}:${String(meetingMinute).padStart(2, '0')} ${BEIJING_ZONE} (meeting is day ${meetingDay})`
    );
    console.log(`TARGET_GROUP_ID: ${config.TARGET_GROUP_ID || '(not set)'}`);

    scheduler.job = schedule.scheduleJob(rule, async () => {
      const now = DateTime.now().setZone(BEIJING_ZONE);
      const luxonMeetingDay = meetingDay === 0 ? 7 : meetingDay;
      let daysUntil = (luxonMeetingDay - now.weekday + 7) % 7;
      if (daysUntil === 0) {
        daysUntil = 7;
      }

      const meetingTime = now.plus({ days: daysUntil }).set({
        hour: meetingHour,
        minute: meetingMinute,
        second: 0,
        millisecond: 0,
      });

      const meetingDateStr = meetingTime.toFormat('yyyy-MM-dd');
      if (store.isCancelled(meetingDateStr)) {
        console.log(`Meeting ${meetingDateStr} was one-off cancelled. Skipping reminder.`);
        return;
      }

      const dateFormatted = meetingTime.toFormat('EEEE, MMM d');
      const timeFormatted = meetingTime.toFormat('HH:mm');
      const beijingTimeLabel = `${timeFormatted} Beijing time`;

      const reminderText = await generateReminder(dateFormatted, timeFormatted, beijingTimeLabel);
      const meetingNotesLine = config.MEETING_LINK
        ? `\n\n📝 Meeting notes template: ${config.MEETING_LINK}`
        : '';
      const fullMessage = `${reminderText}${meetingNotesLine}`;
      console.log('[scheduled reminder] Final reminder message:', fullMessage);

      if (config.TARGET_GROUP_ID && scheduler.bot) {
        try {
          await scheduler.bot.telegram.sendMessage(config.TARGET_GROUP_ID, fullMessage);
        } catch (e) {
          console.error('Failed to send reminder:', e);
        }
      } else {
        console.log('No TARGET_GROUP_ID or bot. Would have sent:', fullMessage);
      }
    });
  },

  updateSchedule: (day: number, hour: number, minute: number): void => {
    store.setSetting('dayOfWeek', day.toString());
    store.setSetting('hour', hour.toString());
    store.setSetting('minute', minute.toString());
    scheduler.scheduleJob();
  },

  getNextMeetingTime: (): DateTime | null => {
    const meetingDay = parseInt(store.getSetting('dayOfWeek') ?? '', 10);
    const meetingHour = parseInt(store.getSetting('hour') ?? '', 10);
    const meetingMinute = parseInt(store.getSetting('minute') ?? '', 10);
    if (Number.isNaN(meetingDay) || Number.isNaN(meetingHour) || Number.isNaN(meetingMinute)) {
      return null;
    }
    const now = DateTime.now().setZone(BEIJING_ZONE);
    const luxonMeetingDay = meetingDay === 0 ? 7 : meetingDay;
    let daysUntil = (luxonMeetingDay - now.weekday + 7) % 7;
    if (daysUntil === 0) {
      daysUntil = 7;
    }
    return now.plus({ days: daysUntil }).set({
      hour: meetingHour,
      minute: meetingMinute,
      second: 0,
      millisecond: 0,
    });
  },
};
