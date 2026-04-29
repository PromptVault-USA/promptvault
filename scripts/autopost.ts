import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import { BskyAgent } from '@atproto/api';
import dotenv from 'dotenv';

dotenv.config();

// Initialize APIs
const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is missing!`);
  }
  return value.trim();
};

const twitterClient = new TwitterApi({
  appKey: requireEnv('TWITTER_API_KEY'),
  appSecret: requireEnv('TWITTER_API_SECRET'),
  accessToken: requireEnv('TWITTER_ACCESS_TOKEN'),
  accessSecret: requireEnv('TWITTER_ACCESS_SECRET'),
});

const pinterestToken = process.env.PINTEREST_ACCESS_TOKEN ? process.env.PINTEREST_ACCESS_TOKEN.trim() : '';
const pinterestBoardId = process.env.PINTEREST_BOARD_ID ? process.env.PINTEREST_BOARD_ID.trim() : '';

// Gemini for content generation (if you want to auto-generate variations)
const apiKeyValue = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: apiKeyValue.trim() });

async function generateSocialPost() {
  const prompt = `Write a short, engaging social media post (under 250 characters) promoting PromptVault USA Intelligence.
It should be exciting, professional, and use 2-3 relevant hashtags (e.g., #AI #Prompts #Tech).
Do not include quotation marks around the output. End with a call to action to visit the link.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text?.trim() || "Discover the best AI Prompts at PromptVault USA Intelligence! Unlock your productivity today. #AI #Productivity";
  } catch (error) {
    console.warn("Gemini API generation failed (possibly due to quota). Falling back to default message.", error);
    return "Discover the best AI Prompts at PromptVault USA Intelligence! Unlock your productivity today. #AI #Productivity";
  }
}

async function postToTwitter(text: string) {
  try {
    console.log('Posting to Twitter...');
    const result = await twitterClient.v2.tweet(text + ' https://promptvaultusa.shop');
    console.log('Twitter Post successful! Tweet ID:', result.data.id);
  } catch (err: any) {
    console.error('Failed to post to Twitter:', err);
    if (err.code === 401) {
      console.error('\n!!! TWITTER AUTHENTICATION ERROR !!!');
      console.error('Since your permissions are correctly attached, this 401 error is usually caused by:');
      console.error('1. Trailing spaces in your GitHub Secrets (the script now automatically trims these, but double-check them).');
      console.error('2. Or, the App Keys (API Key / Secret) and User Tokens (Access Token / Secret) are swapped.');
      console.error('3. Or, the OAuth 1.0a User context is not enabled in User authentication settings section of the Twitter dev portal.');
      console.error('Please verify the secrets match the developer portal exactly.\n');
    } else if (err.code === 402) {
      console.error('\n!!! TWITTER API CREDITS DEPLETED (402 ERROR) !!!');
      console.error('This means your Twitter/X Developer account has run out of posting credits.');
      console.error('To fix this:');
      console.error('1. You may have exhausted the Free tier limit (1,500 tweets/month).');
      console.error('2. Or, you need to set up billing/upgrade to the Basic Tier ($100/mo) in the X Developer Portal.');
      console.error('Check your dashboard at developer.twitter.com to view your limits and billing status.\n');
    }
    // Don't throw err so the script can proceed to other platforms
    console.error('Skipping Twitter post due to error, proceeding to next platform...');
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
    if (err.response?.data?.code === 3 || err.response?.data?.message?.includes('scopes')) {
      console.error('\n!!! PINTEREST AUTHENTICATION ERROR !!!');
      console.error('This means your Pinterest Access Token does not have the correct permissions.');
      console.error('To fix this:');
      console.error('1. You may need standard access or need to request the write scopes.');
      console.error('2. Generate a NEW Access Token with "boards:write" and "pins:write" scopes/permissions if possible.');
      console.error('3. Update your PINTEREST_ACCESS_TOKEN secret in GitHub with the new token.\n');
    }
    console.error('Skipping Pinterest post due to error, proceeding...');
  }
}

async function postToDiscord(text: string, link: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.log('Skipping Discord (no DISCORD_WEBHOOK_URL found).');
    return;
  }
  try {
    console.log('Posting to Discord...');
    await axios.post(webhookUrl, {
      content: `${text}\n${link}`
    });
    console.log('Discord Post successful!');
  } catch (err: any) {
    console.error('Failed to post to Discord:', err.response?.data || err.message);
  }
}

async function postToTelegram(text: string, link: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  
  if (!botToken || !chatId) {
    console.log('Skipping Telegram (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID).');
    return;
  }
  
  try {
    console.log('Posting to Telegram...');
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text: `${text}\n${link}`,
      parse_mode: 'HTML'
    });
    console.log('Telegram Post successful!');
  } catch (err: any) {
    console.error('Failed to post to Telegram:', err.response?.data || err.message);
  }
}

async function postToBluesky(text: string, link: string) {
  const identifier = process.env.BLUESKY_IDENTIFIER?.trim();
  const password = process.env.BLUESKY_PASSWORD?.trim();
  
  if (!identifier || !password) {
    console.log('Skipping Bluesky (missing BLUESKY_IDENTIFIER or BLUESKY_PASSWORD).');
    return;
  }
  
  try {
    console.log('Posting to Bluesky...');
    const agent = new BskyAgent({ service: 'https://bsky.social' });
    await agent.login({ identifier, password });
    
    await agent.post({
      $type: 'app.bsky.feed.post',
      text: `${text}\n${link}`,
      createdAt: new Date().toISOString()
    });
    console.log('Bluesky Post successful!');
  } catch (err: any) {
    console.error('Failed to post to Bluesky:', err.message);
  }
}

async function main() {
  console.log('Starting PromptVault Social Automation...');
  
  // 1. Generate text using Gemini
  const postText = await generateSocialPost();
  console.log('Generated content:', postText);
  
  const link = "https://promptvaultusa.shop";

  // 2. Post to Twitter
  await postToTwitter(postText);
  
  // 3. Post to Pinterest
  // Pinterest works well with a Title + Description
  const title = "Unlock AI Mastery - PromptVault USA";
  await postToPinterest(title, postText, link);
  
  // 4. Post to Discord
  await postToDiscord(postText, link);

  // 5. Post to Telegram
  await postToTelegram(postText, link);

  // 6. Post to Bluesky
  await postToBluesky(postText, link);
  
  console.log('Automation complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
