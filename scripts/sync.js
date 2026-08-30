const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const username = process.env.MAL_USERNAME;

async function run() {
  console.log('Buscando bases de datos en Notion...');
  
  const searchRes = await notion.search({
    filter: { value: 'database', property: 'object' }
  });

  if (!searchRes.results || searchRes.results.length === 0) {
    console.error('No se encontró ninguna base de datos compartida.');
    return;
  }

  // Filtrar la base de datos de animes (excluyendo géneros)
  const targetDb = searchRes.results.find(db => {
    const title = (db.title?.[0]?.plain_text || '').toLowerCase();
    const isGenre = title.includes('genre') || title.includes('género') || title.includes('genres');
    return !isGenre;
  }) || searchRes.results[0];

  const targetDbId = targetDb.id;
  console.log(`Guardando en: "${targetDb.title?.[0]?.plain_text || 'Watchlist'}" (${targetDbId})`);

  console.log(`Obteniendo lista de MyAnimeList para: ${username}...`);
  const response = await fetch(`https://myanimelist.net/animelist/${username}/load.json?status=7`);
  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    console.log('No se encontraron animes en la lista.');
    return;
  }

  console.log(`Sincronizando ${data.length} animes...`);

  const titleKey = Object.keys(targetDb.properties).find(k => targetDb.properties[k].type === 'title') || 'Name';

  for (const item of data) {
    const title = item.anime_title;
    const coverImage = item.anime_image_path;

    const pagePayload = {
      parent: { database_id: targetDbId },
      properties: {
        [titleKey]: {
          title: [{ text: { content: title } }]
        }
      }
    };

    if (coverImage) {
      pagePayload.cover = {
        type: 'external',
        external: { url: coverImage }
      };
    }

    try {
      await notion.pages.create(pagePayload);
      console.log(`Añadido: ${title}`);
      await new Promise(r => setTimeout(r, 350));
    } catch (e) {
      console.error(`Error en "${title}":`, e.message);
    }
  }
  console.log('¡Sincronización completada con éxito!');
}

run();
