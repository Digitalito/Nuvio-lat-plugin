/**
 * AllCalidad Provider for NuvioSniffer
 * Este plugin busca películas y series en la API REST de allcalidad.re,
 * obtiene los enlaces de los reproductores (Embeds/Iframes) y se los entrega
 * a Nuvio para que el Sniffer nativo extraiga el video en segundo plano.
 */

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";

// Utilidad para normalizar textos para comparación (quitar acentos, puntuación y pasar a minúsculas)
function normalize(str) {
    if (!str) return "";
    return str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Quita el año al final de títulos estilo "Avatar (2009)"
function cleanTitle(title) {
    if (!title) return "";
    return title.replace(/\(\d{4}\)/g, "").trim();
}

// Compara si el post de AllCalidad coincide con nuestra búsqueda de TMDB
function isMatch(postTitle, targetTitle, postOriginal, targetOriginal, postYear, targetYear) {
    const pTitle = normalize(cleanTitle(postTitle));
    const tTitle = normalize(targetTitle);
    const pOrig = normalize(cleanTitle(postOriginal || ""));
    const tOrig = normalize(targetOriginal || "");

    // 1. Validar coincidencia de año (+/- 1 año de tolerancia)
    const yearMatch = postYear === targetYear || 
                      (postYear && Math.abs(parseInt(postYear) - parseInt(targetYear)) <= 1) ||
                      postTitle.includes(targetYear);
                      
    if (!yearMatch) return false;

    // 2. Validar coincidencia de título en español u original
    if (pTitle.includes(tTitle) || tTitle.includes(pTitle)) return true;
    if (tOrig && (pOrig.includes(tOrig) || tOrig.includes(pOrig))) return true;
    if (tOrig && (pTitle.includes(tOrig) || tOrig.includes(pTitle))) return true;

    // 3. Fallback: Ver si comparten al menos el 70% de las palabras clave principales
    const wordsP = pTitle.split(" ").filter(w => w.length > 2);
    const wordsT = tTitle.split(" ").filter(w => w.length > 2);
    const intersection = wordsP.filter(w => wordsT.includes(w));
    if (intersection.length > 0 && intersection.length >= Math.min(wordsP.length, wordsT.length) * 0.7) {
        return true;
    }

    return false;
}

// Llama al endpoint de búsqueda de allcalidad.re
async function searchAllcalidad(query) {
    const url = `https://allcalidad.re/api/rest/search?query=${encodeURIComponent(query)}&page=1&post_type=movies%2Ctvshows%2Canimes&posts_per_page=16`;
    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": UA,
                "Accept": "application/json"
            }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.log(`[AllCalidad] Error buscando query "${query}": ${e.message}`);
        return null;
    }
}

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        let cleanId = String(tmdbId).trim();
        let imdbId = null;

        // Soporte para Súper ID (tmdb|imdb)
        if (cleanId.includes("|")) {
            const parts = cleanId.split("|");
            cleanId = parts[0];
            if (parts[1] && parts[1].startsWith("tt")) {
                imdbId = parts[1];
            }
        }

        // Limpieza de prefijos de la app
        cleanId = cleanId.replace(/^tmdb:/, "").replace(/^series:/, "").replace(/^movie:/, "")
            .split(":")[0].split("/")[0];

        if (!cleanId || cleanId === "null" || cleanId === "undefined") {
            console.log("[AllCalidad] ID inválido.");
            return [];
        }

        const isTv = !["movie", "film"].includes(String(mediaType).toLowerCase());
        const type = isTv ? "tv" : "movie";

        console.log(`[AllCalidad] Resolviendo metadata de TMDB para ID: ${cleanId} (Tipo: ${type})`);
        
        let tmdbData = null;
        const isImdb = cleanId.startsWith("tt");

        // Si es un ID de IMDB, buscar en TMDB por external ID
        if (isImdb || imdbId) {
            const idToSearch = isImdb ? cleanId : imdbId;
            const findUrl = `https://api.themoviedb.org/3/find/${idToSearch}?api_key=${TMDB_API_KEY}&external_source=imdb_id&language=es-MX`;
            const resFind = await fetch(findUrl);
            if (resFind.ok) {
                const findData = await resFind.json();
                const results = isTv ? findData.tv_results : findData.movie_results;
                if (results && results.length > 0) {
                    tmdbData = results[0];
                }
            }
        }

        // Si no se encontró por IMDB o es ID numérico normal de TMDB
        if (!tmdbData && !isImdb) {
            const tmdbUrl = `https://api.themoviedb.org/3/${type}/${cleanId}?api_key=${TMDB_API_KEY}&language=es-MX`;
            const resTMDB = await fetch(tmdbUrl);
            if (resTMDB.ok) {
                tmdbData = await resTMDB.json();
            }
        }

        if (!tmdbData) {
            console.log(`[AllCalidad] No se encontró información en TMDB para ID: ${cleanId}`);
            return [];
        }

        const title = tmdbData.title || tmdbData.name || tmdbData.original_title || tmdbData.original_name;
        const originalTitle = tmdbData.original_title || tmdbData.original_name;
        const year = tmdbData.release_date ? tmdbData.release_date.substring(0, 4) : (tmdbData.first_air_date ? tmdbData.first_air_date.substring(0, 4) : "");

        console.log(`[AllCalidad] Título TMDB: "${title}" | Original: "${originalTitle}" | Año: ${year}`);

        // Preparar variantes de búsqueda para esquivar límites de búsqueda rígidos
        const searchQueries = [];
        searchQueries.push(title);
        if (originalTitle && originalTitle !== title) {
            searchQueries.push(originalTitle);
        }
        // Subtítulos separados por ':' o '-' (ej. "Avatar: El camino..." -> "Avatar")
        const partTitle = title.split(/[:\-]/)[0].trim();
        if (partTitle !== title) {
            searchQueries.push(partTitle);
        }
        if (originalTitle) {
            const partOrig = originalTitle.split(/[:\-]/)[0].trim();
            if (partOrig !== originalTitle && partOrig !== partTitle) {
                searchQueries.push(partOrig);
            }
        }

        const uniqueQueries = [...new Set(searchQueries)].filter(q => q && q.length >= 2);
        let targetPost = null;

        // Intentar las búsquedas secuencialmente hasta encontrar el post coincidente
        for (const q of uniqueQueries) {
            console.log(`[AllCalidad] Buscando en AllCalidad: "${q}"`);
            const data = await searchAllcalidad(q);
            if (!data || !data.data || !data.data.posts || data.data.posts.length === 0) continue;

            // Filtrar posts que correspondan al tipo de contenido correcto
            const targetTypes = isTv ? ["tvshows", "animes"] : ["movies"];
            const posts = data.data.posts.filter(p => targetTypes.includes(p.type));

            for (const post of posts) {
                const postYear = post.release_date ? post.release_date.substring(0, 4) : "";
                if (isMatch(post.title, title, post.original_title, originalTitle, postYear, year)) {
                    targetPost = post;
                    break;
                }
            }
            if (targetPost) break;
        }

        if (!targetPost) {
            console.log(`[AllCalidad] No se encontró coincidencia de contenido para: "${title}" (${year})`);
            return [];
        }

        console.log(`[AllCalidad] Contenido mapeado con éxito: ID=${targetPost._id}, Title="${targetPost.title}"`);

        let targetPostId = targetPost._id;

        // Si es una serie, necesitamos obtener la lista de episodios y buscar el ID específico del episodio
        if (isTv) {
            if (!season || !episode) {
                console.log("[AllCalidad] Error: Temporada o episodio no especificados.");
                return [];
            }
            console.log(`[AllCalidad] Obteniendo episodios para el show ID=${targetPostId}...`);
            const resEp = await fetch(`https://allcalidad.re/api/rest/episodes?post_id=${targetPostId}`, {
                headers: { "User-Agent": UA }
            });
            if (!resEp.ok) {
                console.log("[AllCalidad] Error cargando lista de episodios.");
                return [];
            }
            const epData = await resEp.json();
            if (!epData.data || !Array.isArray(epData.data)) {
                console.log("[AllCalidad] No se encontraron episodios en la respuesta.");
                return [];
            }

            const targetEp = epData.data.find(ep => ep.season_number === parseInt(season) && ep.episode_number === parseInt(episode));
            if (!targetEp) {
                console.log(`[AllCalidad] Episodio T${season}E${episode} no encontrado en la base de datos.`);
                return [];
            }

            console.log(`[AllCalidad] Episodio mapeado con éxito: ID=${targetEp._id}, Title="${targetEp.title}"`);
            targetPostId = targetEp._id;
        }

        // Consultar el reproductor (players) para el ID del post final
        console.log(`[AllCalidad] Obteniendo enlaces de reproducción para ID=${targetPostId}...`);
        const resPlayer = await fetch(`https://allcalidad.re/api/rest/player?post_id=${targetPostId}&_any=1`, {
            headers: {
                "User-Agent": UA,
                "Accept": "application/json"
            }
        });
        if (!resPlayer.ok) {
            console.log("[AllCalidad] Error obteniendo reproductores.");
            return [];
        }

        const playerData = await resPlayer.json();
        if (!playerData.data || !playerData.data.embeds || !Array.isArray(playerData.data.embeds)) {
            console.log("[AllCalidad] No se encontraron reproductores válidos.");
            return [];
        }

        const results = [];

        for (const embed of playerData.data.embeds) {
            try {
                if (!embed.url || !embed.url.startsWith("http")) continue;

                // Filtrar solo Español Latino (pedido por el usuario)
                const lowLang = String(embed.lang).toLowerCase();
                if (!lowLang.includes("lat")) {
                    continue;
                }

                // Filtrar servidores problemáticos no soportados o inestables por sniffing clásico
                const lowUrl = embed.url.toLowerCase();
                if (
                    lowUrl.includes("waaw.to") || lowUrl.includes("netu.tv") || 
                    lowUrl.includes("netu.to") || lowUrl.includes("hani.to") || 
                    lowUrl.includes("waaw.tv")
                ) {
                    console.log(`[AllCalidad] Servidor problemático filtrado: ${embed.url}`);
                    continue;
                }

                // Extraer el nombre del servidor basándose en el dominio del Embed
                const urlObj = new URL(embed.url);
                const host = urlObj.hostname.replace("www.", "");
                const cleanServerName = host.split(".")[0].toUpperCase();

                const item = {
                    name: `ALLCALIDAD - ${cleanServerName}`,
                    language: "Latino",
                    quality: embed.quality || "HD",
                    url: embed.url,
                    behaviorHints: {
                        notWebReady: true,
                        isEmbed: true
                    }
                };

                console.log(`[AllCalidad] >> Encontrado: ${cleanServerName} (Latino) -> ${embed.url}`);

                // Envío reactivo del resultado a la app
                if (typeof __yield_result === "function") {
                    __yield_result(JSON.stringify(item));
                }

                results.push(item);

                // Evitar saturar hilos del runtime
                if (typeof __native_sleep === "function") {
                    await __native_sleep(30);
                }
            } catch (err) {
                console.log(`[AllCalidad] Error procesando embed: ${err.message}`);
            }
        }

        return results;
    } catch (e) {
        console.log(`[AllCalidad] Error crítico en getStreams: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
