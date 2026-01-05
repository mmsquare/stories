# stories specs

# Vision

An app that, based on a subject, tells interesting stories that inform and enlighten people of history, context and meaning behind the subject. e.g. a natural wonder, a historical site, a place or a festival 

# User interaction

- There are two major screens: Home and Story
- The default Home screen is a breathing animated bubble. The bubble has a regular breathing motion when in standby mode. While processing user input or interacting with AI models, the bubble is animated more vigorously to indicate that it’s listening or processing.
- The call to action at the default screen is “What stories you want to hear today?”
- User can text or voice input to ask for a story about a subject. e.g. Tell us a story about Mount Rainier. Additionally key words to capture is, target age range, amount of fiction/fantasy vs facts and length. By default, search the internet for 30-60 seconds around the subject, produce a 5 minute interesting story based on facts. if there’s not enough interesting facts, add more fantasy or folks story elements to make the entire story interesting.
- Upon taking voice input, the bubble pass the prompt to OpenAI’s model and generate a confirmation statement about what kind of story it’s going to tell.
- When OpenAI model returns a confirmation message, display the message on a modal pop up and ask user to voice input confirmation. There are also two buttons on the modal to either “Confirm” or “Cancel”. If user click “Cancel”, return to the default home page
- If use click “Confirm” or voice confirm, the app will pass the story structure to OpenAI model to generate a story based on the story structure. While waiting for OpenAI to generate a story, the frontend interface enters “thinking mode”. in thinking mode, the breathing bubble continues to breath and show lines of text below the bubble to show that it's planning for a story based on the story structure. 
- Those text showing progress should be displayed in the middle of the bubble. so that user can look at the bubble and know it's working on something. 
- While story is being structured, and in thinking mode, user input will be disabled. 
- Voice over. Use ElevenLabs to generate a voice-over for the story. Make “Generating voice over” part of the story-generating loading screen. Once story is ready, the story will be displayed in the "Story" webpage and voice-over will be ready to be played.
- Language support. We want to support both English and Mandarin Chinese. if user voice or text input is in Chinese, show all thinking loading text in Chinese, pick the right voice-over ID (ZL9dtgFhmkTzAHUUtQL8) from elevenlabs for Chinese speaking voice ID (Hd8mWkf5kvyBZB0S7yXU). Otherwise, show in English and pick the right voice ID (Hd8mWkf5kvyBZB0S7yXU) for English speaking.
- On the “Story” page, user can save the story to their profile. If there are saved stories, on the home screen, user can see a list of saved stories just below the bubble. User can go back to any previously saved story on their “story” page or delete the story on story page. If a story is saved, instead of the "save" button, UI should say "Saved" and give a button to Delete the story. 
- if user wants to listen to a story, they can click "Play" on the Story page. just like singing along like karaoke, the story's font text changes when voice over them. Clicking on the screen "pause" the story telling voice. click-and-hold will rewind or forward the story. Story's text font changes according to story-telling progress.
- During "story-telling", there's a top left "back" action to allow users to leave "story telling" page and go back to home screen.

# Logging:

I want log major events and major user actions on the frontend console. Events i want to log:

- Event: User voice input or text input a subject, with input content
- Event: OpenAI model engaged to generate story structure
- Event: OpenAI model engaged to generate the actual story
- Event: Evenlabs voice model engaged to generate voice-over
- Event: Story saved

# Visual:
Visually make it modern, jelly and kids friendly