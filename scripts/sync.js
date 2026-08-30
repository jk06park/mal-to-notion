const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const databaseId = process.env.NOTION_DATABASE_ID;
const username = process.env.MAL_USERNAME;

async function run() {
  console.log(`Obteniendo lista de MAL para el usuario: ${username}...`);
  try {
    const response = await fetch(`https://myanimelist.net/animelist/${username}/load.json?status=7`);
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.log('No se encontraron animes o la lista es privada.');
      return;
    }

    console.log(`Se encontraron ${data.length} animes. Sincronizando con Notion...`);

    const statusMap = {
      1: 'Watching',
      2: 'Completed',
      3: 'On Hold',
      4: 'Dropped',
      6: 'Plan to Watch'
    };

    for (const item of data) {
      const title = item.anime_title;
      const score = item.score || 0;
      const status = statusMap[item.status] || 'Watching';

      try {
        await notion.pages.create({
          parent: { database_id: databaseId },
          properties: {
            Name: {
              title: [{ text: { content: title } }]
            }
          }
        });
        console.log(`Añadido con éxito: ${title}`);
        await new Promise(r => setTimeout(r, 350));
      } catch (e) {
        console.error(`Error al añadir ${title}:`, e.message);
      }
    }
    console.log('¡Sincronización terminada con éxito!');
  } catch (err) {
    console.error('Error al conectar con MyAnimeList:', err.message);
  }
}

run();
