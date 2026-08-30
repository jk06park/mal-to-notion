const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const username = process.env.MAL_USERNAME;

async function run() {
  console.log('Buscando la galería principal de Watchlist...');
  
  const searchRes = await notion.search({
    filter: { value: 'database', property: 'object' }
  });

  if (!searchRes.results || searchRes.results.length === 0) {
    console.error('No se encontró ninguna base de datos.');
    return;
  }

  // Filtrar descartando explícitamente "Quotes", "Citas" y "Genres"
  let targetDb = searchRes.results.find(db => {
    const title = (db.title?.[0]?.plain_text || '').toLowerCase();
    const isQuote = title.includes('quote') || title.includes('cita');
    const isGenre = title.includes('genre') || title.includes('género');
    return !isQuote && !isGenre;
  });

  // Si no la descarta por título, busca la que tenga la propiedad de portada o estado
  if (!targetDb) {
    targetDb = searchRes.results.find(db => {
      const propKeys = Object.keys(db.properties).map(k => k.toLowerCase());
      return propKeys.includes('status') || propKeys.includes('score') || propKeys.includes('rating');
    });
  }

  if (!targetDb) {
    targetDb = searchRes.results[searchRes.results.length - 1];
  }

  const targetDbId = targetDb.id;
  const dbName = targetDb.title?.[0]?.plain_text || 'Watchlist';
  console.log(`Base de datos objetivo elegida: "${dbName}" (${targetDbId})`);

  console.log(`Obteniendo lista de MAL para: ${username}...`);
  const response = await fetch(`https://myanimelist.net/animelist/${username}/load.json?status=7`);
  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    console.log('No se encontraron animes.');
    return;
  }

  console.log(`Cargando ${data.length} animes en "${dbName}"...`);

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
      console.log(`Añadido a Watchlist: ${title}`);
      await new Promise(r => setTimeout(r, 350));
    } catch (e) {
      console.error(`Error en "${title}":`, e.message);
    }
  }
  console.log('¡Sincronización en la galería central completada!');
}

run();
