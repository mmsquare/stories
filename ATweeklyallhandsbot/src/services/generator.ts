import OpenAI from 'openai';
import { config } from '../config';

const openai = config.OPENAI_API_KEY ? new OpenAI({ apiKey: config.OPENAI_API_KEY }) : null;

const FALLBACK_TEMPLATES = [
  (date: string, time: string) =>
    `📅 **AT Weekly All-Hands Reminder**\n\nHey team! Friendly nudge: our all-hands is on **${date}** at **${time}** (Beijing time).\n\n☕ Bring your coffee and your best "one thing that went well this week." See you there!`,
  (date: string, time: string) =>
    `🎯 **All-Hands Alert**\n\nQuick reminder: **${date}** at **${time}** Beijing time — that's when we sync up!\n\nNo formal dress code, but "awake and vaguely prepared" is appreciated. 😄`,
  (date: string, time: string) =>
    `⏰ **Weekly All-Hands**\n\n**${date}** at **${time}** (Beijing time). Mark your calendars!\n\nPro tip: having the meeting notes doc open before we start = instant hero move.`,
];

function pickFallback(date: string, time: string): string {
  const index = Math.floor(Math.random() * FALLBACK_TEMPLATES.length);
  return FALLBACK_TEMPLATES[index](date, time);
}

export async function generateReminder(
  dateFormatted: string,
  timeFormatted: string,
  beijingTimeLabel: string
): Promise<string> {
  if (!openai) {
    return pickFallback(dateFormatted, timeFormatted);
  }

  const meetingLink = config.MEETING_LINK;

  try {
    const meetingLinkNote = meetingLink
      ? ` After your reminder, the following permanent meeting notes template link will be appended for the user: ${meetingLink}. You may briefly mention that the meeting notes template link is below, but do not output the URL yourself.`
      : '';

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'You are a cool assistant with little words but humourous. Write a short reminder for a weekly all-hands meeting in English. add a short joke at the end.' +
          'Tone: casual and work-appropriate. ' +
          ' Keep it under 80 words.',
      },
      {
        role: 'user',
        content: `Generate a friendly, fun reminder for a meeting on ${dateFormatted} at ${timeFormatted} (${beijingTimeLabel}). Clearly include the date and time.`,
      },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
    });

    const text = response.choices[0]?.message?.content?.trim();
    return text || pickFallback(dateFormatted, timeFormatted);
  } catch (error) {
    console.error('Error generating reminder:', error);
    return pickFallback(dateFormatted, timeFormatted);
  }
}
