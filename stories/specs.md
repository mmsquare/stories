I want to build an story-telling app about any input subject. The story can has some fatacy or fiction in it, to make it interesting and intriguing to audience. 

User interaction:

- There are two major screens: Home and Story pages
- the Home screen is a breathing animated bubble who ask users what stories they want to listen to today 
- user voice input to ask for a story about a subject. e.g. Tell us a story about Mount Rainier. 
- AI prompt will confirm the story framework: a story about mount rainier, with a mix of fantacy, folks story and reality. default to be 5 minute long.
- user can either confirm  about the story scope or update the requirement. if requirement is updated, repeat the previous step
- once the story framework is confirmed, the app moves to Story page with a progress animation: the AI will do a 30-sec research and online search to find the most relevant information about the subject. and craft a 5-minute story about the subject. 
- Once story is ready, the story will be displayed in the "Story" webpage. User can save the story to their profile and go back to the home screen. On home screen, user can see a list of past stories they saved in the past. User can their saved stories. 
- if user wants to listen to a story, they can click "Play" on the Story page. just like singing along like karaoke, the story's font text changes when voice over them. Tapping on the screen "pause" the story telling voice. Scroll up and down will rewind or forward the story. Story's text font changes according to story-telling progress. 
- During "story-telling", there's alawys a top left "back" action to allow users to quit "story telling" page and go back to home screen. 





Tech stack:

- Frontend: React, Next.js, Tailwind CSS
- Backend/AI: OpenAI
- Database: Supabase
- Hosting: Vercel
- UI Framework: Shadcn UI
- AI Processing: OpenAI
- AI voice: ElevenLabs



Logging:
- show front-end logs for the following steps: voice input, openAI model engaged, story produced, voice AI engaged, voice id from eleven labs and action user performend