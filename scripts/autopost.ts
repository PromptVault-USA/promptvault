import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize APIs
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

const pinterestToken = process.env.PINTEREST_ACCESS_TOKEN!;
const pinterestBoardId = process.env.PINTEREST_BOARD_ID!; // The board to pin to

// Gemini for content generation (if you want to auto-generate variations)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function generateSocialPost() {
  const prompt = `Write a short, engaging social media post (under 250 characters) promoting PromptVault USA Intelligence.
It should be exciting, professional, and use 2-3 relevant hashtags (e.g., #AI #Prompts #Tech).
Do not include quotation marks around the output. End with a call to action to visit the link.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text?.trim() || "Discover the best AI Prompts at PromptVault USA Intelligence! Unlock your productivity today. #AI #Productivity";
}

async function postToTwitter(text: string) {
  try {
    console.log('Posting to Twitter...');
    const result = await twitterClient.v2.tweet(text + ' https://promptvaultusa.shop');
    console.log('Twitter Post successful! Tweet ID:', result.data.id);
  } catch (err) {
    console.error('Failed to post to Twitter:', err);
  }
}

async function postToPinterest(title: string, description: string, link: string) {
  try {
    console.log('Posting to Pinterest...');
    // Note: Pinterest requires an image (media_source) for pins. 
    // We'll use your site logo as the default image url.
    const response = await axios.post(
      'https://api.pinterest.com/v5/pins',
      {
        board_id: pinterestBoardId,
        title: title,
        description: description,
        link: link,
        media_source: {
          source_type: 'image_url',
          url: 'https://promptvaultusa.shop/logo.png' // Replace with a dynamic image if needed
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${pinterestToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }
      }
    );
    console.log('Pinterest Post successful! Pin ID:', response.data.id);
  } catch (err: any) {
    console.error('Failed to post to Pinterest:', err.response?.data || err.message);
  }
}

async function main() {
  console.log('Starting PromptVault Social Automation...');
  
  // 1. Generate text using Gemini
  const postText = await generateSocialPost();
  console.log('Generated content:', postText);
  
  // 2. Post to Twitter
  await postToTwitter(postText);
  
  // 3. Post to Pinterest
  // Pinterest works well with a Title + Description
  const title = "Unlock AI Mastery - PromptVault USA";
  await postToPinterest(title, postText, "https://promptvaultusa.shop");
  
  console.log('Automation complete!');
}

main().catch(console.error);
