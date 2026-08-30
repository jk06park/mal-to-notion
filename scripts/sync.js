const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const username = process.env.MAL_USERNAME;

async function run() {
  console.log('Buscando la base de datos en tu Notion...');
  
  // 1. Buscar automáticamente la base de datos accesible
  const searchRes = await notion.search({
    filter: { value: 'database', property: 'object' }
  });

  if (!searchRes.results || searchRes.results.length === 0) {
    console.error('No se encontró ninguna base de datos compartida con la integración.');
    return;
  }

  // Tomamos la primera base de datos vinculada
  const targetDb = searchRes.results[0];
  const targetDbId = targetDb.id;
  console.log(`Base de datos encontrada: "${targetDb.title?.[0]?.plain_text || 'Watchlist'}" (ID: ${targetDbId})`);

  // 2. Obtener animes de MyAnimeList
  console.log(`Obteniendo lista de MAL para: ${username}...`);
  const response = await fetch(`https://myanimelist.net/animelist/${username}/load.json?status=7`);
  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    console.log('No se encontraron animes en la lista.');
    return;
  }

  console.log(`Sincronizando ${data.length} animes...`);

  // Detectar la propiedad de tipo título en la base de datos
  const titlePropName = Object.keys(targetDb.properties).find(
    k => targetDb.properties[k].type === 'title'
  ) || 'Name';

  for (const item of data) {
    const title = item.anime_title;
    try {
      await notion.pages.create({
        parent: { database_id: targetDbId },
        properties: {
          [titlePropName]: {
            title: [{ text: { content: title } }]
          }
        }
      });
      console.log(`Añadido con éxito: ${title}`);
      await new Promise(r => setTimeout(r, 350));
    } catch (e) {
      console.error(`Error al añadir "${title}":`, e.message);
    }
  }
  console.log('¡Sincronización completada con éxito!');
}

run();
