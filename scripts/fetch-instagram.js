const fs = require('fs');

const ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const USER_ID = process.env.IG_USER_ID;

if (!ACCESS_TOKEN || !USER_ID) {
  console.error('Missing IG_ACCESS_TOKEN or IG_USER_ID environment variables');
  process.exit(1);
}

const HASHTAGS = {
  AdulthoodMoney: 'adulthoodmoney',
  AdulthoodJob: 'adulthoodjob',
  AdulthoodBills: 'adulthoodbills',
  AdulthoodFreedom: 'adulthoodfreedom',
  AdulthoodRelationships: 'adulthoodrelationships',
  AdulthoodTimeEnergy: 'adulthoodtimeenergy',
  AdulthoodPurpose: 'adulthoodpurpose',
};

const API = 'https://graph.facebook.com/v19.0';

async function searchHashtag(query) {
  const url = `${API}/ig_hashtag_search?q=${query}&user_id=${USER_ID}&access_token=${ACCESS_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`Hashtag search failed for "${query}": ${data.error.message}`);
  return data.data?.[0]?.id;
}

async function getTopMedia(hashtagId) {
  const fields = 'id,media_url,permalink,thumbnail_url,media_type';
  const url = `${API}/${hashtagId}/top_media?user_id=${USER_ID}&fields=${fields}&access_token=${ACCESS_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`Top media failed: ${data.error.message}`);
  return data.data || [];
}

async function main() {
  const feeds = {};

  for (const [key, query] of Object.entries(HASHTAGS)) {
    try {
      console.log(`Fetching #${query}...`);
      const hashtagId = await searchHashtag(query);

      if (!hashtagId) {
        console.log(`  No hashtag ID found for #${query}, skipping`);
        feeds[key] = [];
        continue;
      }

      const media = await getTopMedia(hashtagId);
      const images = media
        .filter(m => m.media_type === 'IMAGE' || m.media_type === 'CAROUSEL_ALBUM')
        .slice(0, 3)
        .map(m => ({
          id: m.id,
          image: m.media_url || m.thumbnail_url,
          url: m.permalink,
        }));

      feeds[key] = images;
      console.log(`  Found ${images.length} posts`);
    } catch (err) {
      console.error(`  Error for #${query}: ${err.message}`);
      feeds[key] = [];
    }
  }

  const output = {
    updated: new Date().toISOString(),
    feeds,
  };

  fs.writeFileSync('instagram-data.json', JSON.stringify(output, null, 2));
  console.log('Wrote instagram-data.json');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
