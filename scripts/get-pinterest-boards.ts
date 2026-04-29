import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const pinterestToken = process.env.PINTEREST_ACCESS_TOKEN;

async function getBoards() {
  if (!pinterestToken) {
    console.error('Error: PINTEREST_ACCESS_TOKEN is missing in your .env file');
    return;
  }

  try {
    const response = await axios.get('https://api.pinterest.com/v5/boards', {
      headers: {
        'Authorization': `Bearer ${pinterestToken}`,
      }
    });
    
    console.log('\n--- Your Pinterest Boards ---');
    response.data.items.forEach((board: any) => {
      console.log(`Board Name: ${board.name}`);
      console.log(`Board ID:   ${board.id}\n`);
    });
    console.log('Copy the Board ID you want to use and save it as PINTEREST_BOARD_ID.\n');

  } catch (err: any) {
    console.error('Failed to fetch boards:', err.response?.data || err.message);
  }
}

getBoards();
