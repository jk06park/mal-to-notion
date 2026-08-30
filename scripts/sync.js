const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;
const username = process.env.MAL_USERNAME;

async function run() {
  console.log(`Obteniendo lista de MAL para el usuario: ${username}...`);
  const response = await fetch(`https://api.jikan.moe/v4/users/${username}/animelist/all`);
  const data = await response.json();

  if (!data.data) {
    console.error('No se pudieron obtener datos de MyAnimeList.', data);
    return;
  }

  console.log(`Se encontraron ${data.data.length} animes. Sincronizando con Notion...`);

  for (const item of data.data) {
    const title = item.entry.title;
    const score = item.score || 0;
    const statusMap = {
      'completed': 'Completed',
      'watching': 'Watching',
      'plan_to_watch': 'Plan to Watch',
      'dropped': 'Dropped',
      'on_hold': 'On Hold'
    };
    const status = statusMap[item.status] || item.status;

    try {
      await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [{ text: { content: title } }]
          },
          Status: {
            select: { name: status }
          },
          Score: {
            number: score
          }
        }
      });
      console.log(`Añadido: ${title}`);
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      console.error(`Error al añadir ${title}:`, e.message);
    }
  }
  console.log('¡Sincronización completada!');
}

run();
