import OpenAI from 'openai';
import { config } from '../config';

const openai = config.OPENAI_API_KEY ? new OpenAI({ apiKey: config.OPENAI_API_KEY }) : null;

export async function generateReminder(date: string, time: string): Promise<string> {
  if (!openai) {
    // Fallback message in Chinese with a static joke
    return `📅 **周会提醒**\n\n大家好！温馨提醒：我们的周会将在 ${date} ${time} 开始。\n\n(没有什么问题是一场会议解决不了的，如果有，那就下周再开一场 😉)\n\n别忘了查看会议记录！`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          // Instruct the AI to speak Chinese and include a work-safe joke
          content: '你是一个幽默的团队助手。请用中文生成一个简短、友好的周会提醒。必须包含一句关于“每周都要开会”的职场无害吐槽或冷笑话（适合工作场合）。'
        },
        {
          role: 'user',
          content: `生成一个会议提醒，时间是 ${date} ${time} (北京时间)。请清晰地包含日期和时间。字数控制在60字以内。`
        }
      ]
    });

    return response.choices[0]?.message?.content || `提醒：会议将于 ${date} ${time} 开始`;
  } catch (error) {
    console.error('Error generating reminder:', error);
    return `📅 **周会提醒**\n\n大家好！温馨提醒：我们的周会将在 ${date} ${time} 开始。\n\n(没有什么问题是一场会议解决不了的，如果有，那就下周再开一场 😉)`;
  }
}
