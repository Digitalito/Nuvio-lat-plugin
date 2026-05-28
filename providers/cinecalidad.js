// providers/cinecalidad.js
"use strict";

const cheerio = require("cheerio-without-node-native");

/**
 * Obtiene streams desde cinecalidad.am
 * @param {string} tmdbId - ID de TMDB (no se usa directamente en la URL, se deja para futura búsqueda)
 * @param {string} mediaType - "movie" o "tv"
 * @param {number} season - número de temporada (para series)
 * @param {number} episode - número de episodio (para series)
 * @returns {Promise<Array>} Lista de streams
 */
async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // Construir la URL según el tipo de contenido
        // NOTA: CineCalidad no usa TMDB ID directamente; se asume que la URL usa el título o un slug.
        // Si la URL real es diferente, ajusta la función construirURL().
        let url = construirURL(tmdbId, mediaType, season, episode);
        console.log(`[CineCalidad] Cargando: ${url}`);

        const html = await fetchHTML(url);
        const $ = cheerio.load(html);

        const streams = [];

        // Buscar enlaces en los contenedores típicos de CineCalidad
        // Selector común para opciones de video (botones de servidores)
        $('.player-options .option, ul.options li, .servers-list a, .mirror-link').each((i, elem) => {
            const $el = $(elem);
            let videoUrl = $el.attr('data-link') || $el.attr('data-url') || $el.attr('href');
            if (!videoUrl) {
                // Podría ser un iframe
                const iframe = $el.find('iframe');
                if (iframe.length) videoUrl = iframe.attr('src');
            }
            if (!videoUrl) return;

            // Limpiar URL
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;

            // Obtener calidad y título
            let quality = 'Auto';
            let title = $el.text().trim() || `Stream ${i+1}`;
            if (title.includes('1080')) quality = '1080p';
            else if (title.includes('720')) quality = '720p';
            else if (title.includes('4K')) quality = '4K';

            streams.push({
                name: 'CineCalidad',
                title: title,
                url: videoUrl,
                quality: quality,
                headers: {
                    'Referer': url,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
        });

        // Si no se encontraron streams, buscar videos HTML5 directos
        if (streams.length === 0) {
            $('video source').each((i, srcElem) => {
                const src = $(srcElem).attr('src');
                if (src) {
                    streams.push({
                        name: 'CineCalidad',
                        title: `Directo ${i+1}`,
                        url: src,
                        quality: 'Auto',
                        headers: { 'Referer': url }
                    });
                }
            });
        }

        return streams;
    } catch (error) {
        console.error(`[CineCalidad] Error: ${error.message}`);
        return [];
    }
}

/**
 * Construye la URL según el tipo de contenido.
 * Ajusta el patrón según la estructura real de cinecalidad.am.
 */
function construirURL(tmdbId, mediaType, season, episode) {
    // Por defecto, asumimos que la URL usa el tmdbId (puede no funcionar).
    // Si el sitio usa slugs, necesitarías una función de búsqueda adicional.
    const base = 'https://cinecalidad.am';
    if (mediaType === 'movie') {
        // Ejemplo: /pelicula/550-fight-club
        return `${base}/pelicula/${tmdbId}`;
    } else if (mediaType === 'tv') {
        // Ejemplo: /serie/1399-game-of-thrones/1/1
        return `${base}/serie/${tmdbId}/${season}/${episode}`;
    }
    return base;
}

/**
 * Realiza la petición HTTP y devuelve el HTML como texto.
 */
async function fetchHTML(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { getStreams };
