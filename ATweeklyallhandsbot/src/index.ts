import { bot, setupBot } from './bot';
import { scheduler } from './scheduler';
import { config } from './config';

async function main(): Promise<void> {
  if (!config.BOT_TOKEN) {
    console.error('BOT_TOKEN is missing in .env');
    process.exit(1);
  }

  setupBot();
  scheduler.init(bot);
  console.log('Scheduler initialized');

  bot.launch(() => {
    console.log('AT Weekly All-Hands bot is running.');
  });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch((err) => {
  console.error('Unhandled error in main:', err);
  process.exit(1);
});
