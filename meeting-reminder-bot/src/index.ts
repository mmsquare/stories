import { bot, setupBot } from './bot';
import { scheduler } from './scheduler';
import { config } from './config';

async function main() {
  if (!config.BOT_TOKEN) {
    console.error('BOT_TOKEN is missing in .env');
    process.exit(1);
  }

  // Setup Bot commands
  setupBot();

  // Start Scheduler
  scheduler.init(bot);
  console.log('Scheduler initialized');

  // Start Bot
  bot.launch(() => {
    console.log('Bot is running!');
  });

  // Graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main();
