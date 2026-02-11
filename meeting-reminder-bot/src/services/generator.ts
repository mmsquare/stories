import OpenAI from 'openai';
import { config } from '../config';

const openai = config.OPENAI_API_KEY ? new OpenAI({ apiKey: config.OPENAI_API_KEY }) : null;

export async function generateReminder(date: string, time: string): Promise<string> {
  if (!openai) {
    // Fallback message in Chinese with a static joke
    return `📅 **周会提醒**\n\n大家好！温馨提醒：我们的周会将在 ${date} ${time} 开始。\n\n(请带上您的咖啡和想法——按重要性排序 ☕️)\n\n别忘了查看会议记录！`;
  }

  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        // Instruct the AI to speak Chinese and include a work-safe joke
        content: '你是一个机智、幽默的团队助手。请用中文生成一个简短的周会提醒。必须包含一句简短、不尴尬的职场幽默（例如关于咖啡续命、远程办公的趣事、或者“希望会议短一点”的隐晦调侃）。我们是一个数字货币高频交易公司，笑话也可以结合最近的市场时事。风格要轻松自然，避免老套的冷笑话。'
      },
      {
        role: 'user',
        content: `生成一个会议提醒，时间是 ${date} ${time} (北京时间)。请清晰地包含日期和时间。字数控制在60字以内。`
      }
    ];

    console.log('--- OpenAI Prompt ---');
    console.log(JSON.stringify(messages, null, 2));
    console.log('---------------------');

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages
    });

    return response.choices[0]?.message?.content || `提醒：会议将于 ${date} ${time} 开始`;
  } catch (error) {
    console.error('Error generating reminder:', error);
    return `📅 **周会提醒**\n\n大家好！温馨提醒：我们的周会将在 ${date} ${time} 开始。\n\n(请带上您的咖啡和想法——按重要性排序 ☕️)`;
  }
}
