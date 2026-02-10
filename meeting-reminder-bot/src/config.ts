import dotenv from 'dotenv';
dotenv.config();

export const config = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  TARGET_GROUP_ID: process.env.TARGET_GROUP_ID || '',
  MEETING_LINK: process.env.MEETING_LINK || '',
};
