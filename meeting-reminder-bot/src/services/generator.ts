import OpenAI from 'openai';
import { config } from '../config';

const openai = config.OPENAI_API_KEY ? new OpenAI({ apiKey: config.OPENAI_API_KEY }) : null;

export async function generateReminder(date: string, time: string): Promise<string> {
  if (!openai) {
    return `📅 **Weekly Meeting Reminder**\n\nHey team! Just a reminder for our meeting on ${date} at ${time}.\n\nDon't forget to check the notes!`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful and fun assistant for a team. Generate a short, friendly, and slightly funny reminder for a weekly meeting.'
        },
        {
          role: 'user',
          content: `Generate a meeting reminder for ${date} at ${time} (Beijing Time). Include the date and time clearly. Keep it under 50 words.`
        }
      ]
    });

    return response.choices[0]?.message?.content || `Reminder: Meeting on ${date} at ${time}`;
  } catch (error) {
    console.error('Error generating reminder:', error);
    return `📅 **Weekly Meeting Reminder**\n\nHey team! Just a reminder for our meeting on ${date} at ${time}.`;
  }
}
