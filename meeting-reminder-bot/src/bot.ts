import { Telegraf } from 'telegraf';
import { config } from './config';
import { scheduler } from './scheduler';
import { store } from './store';
import { DateTime } from 'luxon';
import { generateReminder } from './services/generator';

export const bot = new Telegraf(config.BOT_TOKEN);

export function setupBot() {
    bot.command('start', (ctx) => {
      ctx.reply('你好！我是你的周会提醒机器人。使用 /help 查看我能做什么。');
    });

    bot.command('help', (ctx) => {
      ctx.reply(
        '/set_schedule <day> <hour> <minute> - 设置周会时间 (Day: 0-6, 周日-周六)\n' +
        '/cancel_this_week - 取消本周提醒\n' +
        '/uncancel_this_week - 恢复本周提醒\n' +
        '/test_reminder - 立即发送测试提醒\n' +
        '/get_id - 获取当前群组 ID'
      );
    });

    bot.command('get_id', (ctx) => {
      ctx.reply(`群组 ID: ${ctx.chat.id}`);
    });

    bot.command('set_schedule', (ctx) => {
      const parts = ctx.message.text.split(' ');
      if (parts.length !== 4) {
        return ctx.reply('用法: /set_schedule <day 0-6> <hour 0-23> <minute 0-59>');
      }

      const day = parseInt(parts[1]);
      const hour = parseInt(parts[2]);
      const minute = parseInt(parts[3]);

      if (isNaN(day) || isNaN(hour) || isNaN(minute)) {
        return ctx.reply('无效的数字。');
      }

      if (day < 0 || day > 6) {
        return ctx.reply('日期必须在 0-6 之间 (周日=0, 周六=6)。');
      }

      if (hour < 0 || hour > 23) {
        return ctx.reply('小时必须在 0-23 之间。');
      }

      if (minute < 0 || minute > 59) {
        return ctx.reply('分钟必须在 0-59 之间。');
      }

      scheduler.updateSchedule(day, hour, minute);
      ctx.reply(`计划已更新：每周 ${day}，${hour}:${minute} (北京时间)`);
    });

    bot.command('cancel_this_week', (ctx) => {
      const job = scheduler.job;
      if (!job) return ctx.reply('未设置计划。');
      
      const nextInvocation = job.nextInvocation();
      if (!nextInvocation) return ctx.reply('找不到下次执行时间。');

      const dateStr = DateTime.fromJSDate(nextInvocation).setZone('Asia/Shanghai').toFormat('yyyy-MM-dd');
      store.cancelDate(dateStr);
      ctx.reply(`已取消 ${dateStr} 的提醒。`);
    });

    bot.command('uncancel_this_week', (ctx) => {
       const job = scheduler.job;
      if (!job) return ctx.reply('未设置计划。');
      
      const nextInvocation = job.nextInvocation();
      if (!nextInvocation) return ctx.reply('找不到下次执行时间。');

      const dateStr = DateTime.fromJSDate(nextInvocation).setZone('Asia/Shanghai').toFormat('yyyy-MM-dd');
      store.uncancelDate(dateStr);
      ctx.reply(`已恢复 ${dateStr} 的提醒。`);
    });

    bot.command('test_reminder', async (ctx) => {
        const now = DateTime.now().setZone('Asia/Shanghai').setLocale('zh-CN');
        const reminder = await generateReminder(now.toFormat('M月d日 EEEE'), now.toFormat('HH:mm'));
        ctx.reply(`${reminder}\n\n📝 [会议记录模板](${config.MEETING_LINK})`, { parse_mode: 'Markdown' });
    });
}
