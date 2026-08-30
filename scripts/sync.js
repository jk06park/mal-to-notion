const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const username = process.env.MAL_USERNAME;

async function run() {
  console.log('Buscando la base de datos en Notion...');
  
  const searchRes = await notion.search({
    filter: { value: 'database', property: 'object' }
  });

  if (!searchRes.results || searchRes.results.length === 0) {
    console.error('No se encontró ninguna base de datos.');
    return;
  }

  let targetDb = searchRes.results.find(db => {
    const title = (db.title?.[0]?.plain_text || '').toLowerCase();
    const isQuote = title.includes('quote') || title.includes('cita');
    const isGenre = title.includes('genre') || title.includes('género');
    return !isQuote && !isGenre;
  }) || searchRes.results[0];

  const targetDbId = targetDb.id;
  console.log(`Cargando portadas en alta resolución...`);

  const response = await fetch(`https://myanimelist.net/animelist/${username}/load.json?status=7`);
  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) return;

  // Obtener páginas existentes para actualizar portadas en vez de duplicar
  const existingPages = await notion.databases.query({ database_id: targetDbId });
  const titleKey = Object.keys(targetDb.properties).find(k => targetDb.properties[k].type === 'title') || 'Name';

  for (const item of data) {
    const title = item.anime_title;
    
    // Obtener la URL en alta definición eliminando el recorte de miniatura (/r/96x136 o /v/...)
    let hdImage = item.anime_image_path || '';
    if (hdImage) {
      hdImage = hdImage.replace(/\/r\/\d+x\d+/g, '').replace(/\?.*/g, '');
    }

    const existing = existingPages.results.find(p => {
      const pageTitle = p.properties[titleKey]?.title?.[0]?.plain_text;
      return pageTitle === title;
    });

    try {
      if (existing) {
        await notion.pages.update({
          page_id: existing.id,
          cover: hdImage ? { type: 'external', external: { url: hdImage } } : null
        });
        console.log(`Portada HD actualizada: ${title}`);
      } else {
        await notion.pages.create({
          parent: { database_id: targetDbId },
          properties: {
            [titleKey]: { title: [{ text: { content: title } }] }
          },
          cover: hdImage ? { type: 'external', external: { url: hdImage } } : null
        });
        console.log(`Añadido en HD: ${title}`);
      }
      await new Promise(r => setTimeout(r, 350));
    } catch (e) {
      console.error(`Error en "${title}":`, e.message);
    }
  }
  console.log('¡Portadas en HD listas!');
}

run();
