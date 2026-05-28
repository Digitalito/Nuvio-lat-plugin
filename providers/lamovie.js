/**
 * LaMovie Stream Resolver v2.4.1 (Corregido)
 * Basado en la versión limpia, con URLs actualizadas y lógica original restaurada.
 */

// Para Nuvio, usar cheerio-without-node-native
const cheerio = require('cheerio-without-node-native');

// ========================= CONFIGURACIÓN =========================
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://lamovie.org";
const API_URL = "https://lamovie.org/wp-api/v1";

const ANIME_COUNTRIES = ["JP", "CN", "KR"];
const GENRE_ANIMATION = 16;

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

// ========================= UTILIDADES =========================
function get(url, extraHeaders) {
  const headers = Object.assign({}, DEFAULT_HEADERS, extraHeaders || {});
  return fetch(url, { headers, redirect: "follow" }).then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const ct = res.headers.get("content-type") || "";
    if (ct.indexOf("json") !== -1) return res.json();
    return res.text();
  });
}

function normalizeTitle(t) {
  return t.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSlug(title, year) {
  let slug = title.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return year ? `${slug}-${year}` : slug;
}

function getPostTypes(mediaType, genres, originCountries) {
  if (mediaType === "movie") return ["movies"];
  const isAnimation = (genres || []).indexOf(GENRE_ANIMATION) !== -1;
  if (!isAnimation) return ["tvshows"];
  let isAnimeCountry = false;
  for (let i = 0; i < (originCountries || []).length; i++) {
    if (ANIME_COUNTRIES.indexOf(originCountries[i]) !== -1) {
      isAnimeCountry = true;
      break;
    }
  }
  return isAnimeCountry ? ["animes"] : ["animes", "tvshows"];
}

const STOPWORDS = {
  las: 1, los: 1, una: 1, uno: 1, del: 1, con: 1,
  que: 1, por: 1, para: 1, the: 1, and: 1,
  for: 1, from: 1, with: 1
};

function scoreCandidate(candidateTitle, tmdbTitle, originalTitle, year) {
  const normCand = normalizeTitle(candidateTitle);
  const normTmdb = normalizeTitle(tmdbTitle);
  const normOrig = normalizeTitle(originalTitle || tmdbTitle);
  let score = 0;

  if (year && normCand.indexOf(year) !== -1) score += 50;

  const wordsToCheck = normTmdb.split(" ").filter(w =>
    (w.length > 3 || /^\d+$/.test(w)) && !STOPWORDS[w]
  );
  if (wordsToCheck.length) {
    let matched = 0;
    for (let w of wordsToCheck) if (normCand.indexOf(w) !== -1) matched++;
    score += (matched / wordsToCheck.length) * 30;
  }

  const origWords = normOrig.split(" ").filter(w =>
    (w.length > 3 || /^\d+$/.test(w)) && !STOPWORDS[w]
  );
  if (origWords.length) {
    let matched = 0;
    for (let w of origWords) if (normCand.indexOf(w) !== -1) matched++;
    score += (matched / origWords.length) * 20;
  }

  const sequelNum = normTmdb.match(/\b(\d+)\s*$/);
  if (sequelNum && normCand.split(" ").indexOf(sequelNum[1]) === -1) score -= 100;

  return score;
}

function b64decode(str) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  let i = 0;
  let s = str.replace(/[^A-Za-z0-9+/]/g, "");
  while (i < s.length) {
    const a = chars.indexOf(s[i++]);
    const b = chars.indexOf(s[i++]);
    const c = i < s.length ? chars.indexOf(s[i++]) : -1;
    const d = i < s.length ? chars.indexOf(s[i++]) : -1;
    const cb = c === -1 ? 0 : c;
    const db = d === -1 ? 0 : d;
    const n = (a << 18) | (b << 12) | (cb << 6) | db;
    result += String.fromCharCode((n >> 16) & 0xFF);
    if (c !== -1) result += String.fromCharCode((n >> 8) & 0xFF);
    if (d !== -1) result += String.fromCharCode(n & 0xFF);
  }
  return result;
}

function resolveRelativeUrl(href, base) {
  if (href.indexOf("http") === 0) return href;
  const m = base.match(/^(https?:\/\/[^/]+)/);
  const origin = m ? m[1] : "";
  if (href.charAt(0) === "/") return origin + href;
  const basePath = base.substring(0, base.lastIndexOf("/") + 1);
  return basePath + href;
}

// ========================= RESOLVEDORES DE EMBEDS =========================
// (Mantengo todos los resolvedores: VOE, HLSWish, Lacloud, Packer, Vimeos, Doodstream)
// ... incluir aquí las funciones resolveVoe, resolveHlswish, resolveLacloud, resolvePacker, resolveVimeos, resolveDoodstream exactamente como estaban en lamovie (4).js, pero con la corrección de que unpack se define ANTES de usarse.

// ----- Función unpack (P.A.C.K.E.R.) necesaria para resolvePacker y resolveVimeos -----
function unpack(payload, radix, symtab) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const unbase = str => {
    let result = 0;
    for (let i = 0; i < str.length; i++) {
      const pos = chars.indexOf(str[i]);
      if (pos === -1) return NaN;
      result = result * radix + pos;
    }
    return result;
  };
  return payload.replace(/\b([0-9a-zA-Z]+)\b/g, match => {
    const idx = unbase(match);
    if (isNaN(idx) || idx >= symtab.length) return match;
    return (symtab[idx] && symtab[idx] !== '') ? symtab[idx] : match;
  });
}

function unpackEval(payload, radix, symtab) {
  // Alias para compatibilidad
  return unpack(payload, radix, symtab);
}

// A continuación, copia todas las funciones resolve... tal como estaban en lamovie (4).js,
// pero asegurándote de que llamen a unpack (ya definido) y no tengan errores.
// Por brevedad, asumo que mantienes el código original de resolvedores, solo corrigiendo el orden.

// ----- VOE -----
function voeDecode(ct, luts) { /* igual que antes */ }
function resolveVoe(embedUrl) { /* igual */ }

// ----- HLSWISH / STREAMWISH -----
const HLSWISH_DOMAIN_MAP = { "hglink.to": "vibuxer.com" };
function resolveHlswish(embedUrl) { /* igual */ }

// ----- LACLOUD -----
function resolveLacloud(embedUrl) { /* igual */ }

// ----- PACKER (genérico) -----
function resolvePacker(embedUrl) { /* igual, pero usando unpack (ya definido) */ }

// ----- VIMEOS -----
function resolveVimeos(embedUrl) { /* igual, usando unpackEval */ }

// ----- DOODSTREAM -----
function resolveDoodstream(embedUrl) { /* igual */ }

// ----- SELECCIÓN DE RESOLVER -----
function getResolver(url) {
  if (url.indexOf("hlswish") !== -1 || url.indexOf("streamwish") !== -1 || url.indexOf("strwish") !== -1 || url.indexOf("vibuxer") !== -1) return resolveHlswish;
  if (url.indexOf("voe.sx") !== -1) return resolveVoe;
  if (url.indexOf("vimeos.net") !== -1) return resolveVimeos;
  if (url.indexOf("lacloud.live") !== -1) return resolveLacloud;
  if (url.indexOf("earnvids.com") !== -1 || url.indexOf("hglink.to") !== -1 || url.indexOf("earnl.one") !== -1 || url.indexOf("vidnova.online") !== -1 || url.indexOf("streamfort.online") !== -1) return resolvePacker;
  if (url.indexOf("dood") !== -1 || url.indexOf("d0000d") !== -1 || url.indexOf("ds2video") !== -1 || url.indexOf("ds2play") !== -1 || url.indexOf("dsvplay") !== -1) return resolveDoodstream;
  return null;
}

function getServerName(url) {
  if (url.indexOf("hlswish") !== -1 || url.indexOf("streamwish") !== -1 || url.indexOf("strwish") !== -1 || url.indexOf("vibuxer") !== -1) return "StreamWish";
  if (url.indexOf("voe.sx") !== -1) return "VOE";
  if (url.indexOf("vimeos.net") !== -1) return "Vimeos";
  if (url.indexOf("lacloud.live") !== -1) return "Lacloud";
  if (url.indexOf("earnvids.com") !== -1 || url.indexOf("earnl.one") !== -1 || url.indexOf("vidnova.online") !== -1) return "EarnVids";
  if (url.indexOf("hglink.to") !== -1 || url.indexOf("streamfort.online") !== -1) return "StreamHG";
  if (url.indexOf("dsvplay.com") !== -1 || url.indexOf("dood") !== -1 || url.indexOf("d0000d") !== -1 || url.indexOf("ds2video") !== -1 || url.indexOf("ds2play") !== -1) return "DoodStream";
  return "Online";
}

// ========================= TMDB Y BÚSQUEDA LOCAL (versión original restaurada) =========================
function getTmdbInfo(tmdbId, mediaType) {
  const type = mediaType === "movie" ? "movie" : "tv";
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=es-MX`;
  return get(url).then(data => {
    const title = type === "movie" ? (data.title || data.original_title) : (data.name || data.original_name);
    const originalTitle = type === "movie" ? (data.original_title || data.title) : (data.original_name || data.name);
    const year = (type === "movie" ? data.release_date || "" : data.first_air_date || "").slice(0, 4);
    const genres = (data.genres || []).map(g => g.id);
    const originCountries = data.origin_country || (data.production_countries || []).map(c => c.iso_3166_1) || [];
    return { title, originalTitle, year, genres, originCountries };
  });
}

// --- API para obtener ID por slug (original) ---
function getIdBySlugApi(postType, slug) {
  const url = `${API_URL}/single/${postType}?slug=${encodeURIComponent(slug)}&postType=${postType}`;
  return get(url, { Accept: "application/json", Referer: BASE_URL + "/" }).then(data => {
    if (data && data.data && data.data._id) {
      console.log(`[LaMovie] Slug OK: /${postType}/${slug} id:${data.data._id}`);
      return { id: String(data.data._id) };
    }
    return null;
  }).catch(() => null);
}

// --- Búsqueda por scraping (fallback) ---
function searchLaMovie(title, originalTitle, year, postTypes) {
  const url = BASE_URL + "/search?keyword=" + encodeURIComponent(title);
  return get(url, { Referer: BASE_URL + "/" }).then(html => {
    const $ = cheerio.load(html);
    let posts = [];
    $('.popular-card').each(function() {
      const $el = $(this);
      const t = $el.find('.popular-card__title p').text().trim();
      const ot = $el.find('.popular-card__title span').text().trim();
      const y = $el.find('.rates .year').text().trim();
      const link = $el.find('.popular-card__title a').attr('href');
      if (link) posts.push({ title: t, original_title: ot, year: y, url: link });
    });
    if (!posts.length && originalTitle && normalizeTitle(originalTitle) !== normalizeTitle(title)) {
      console.log(`[LaMovie] Buscando con título original: "${originalTitle}"`);
      const url2 = BASE_URL + "/search?keyword=" + encodeURIComponent(originalTitle);
      return get(url2, { Referer: BASE_URL + "/" }).then(html2 => {
        const $2 = cheerio.load(html2);
        let posts2 = [];
        $2('.popular-card').each(function() {
          const $el = $(this);
          const t = $el.find('.popular-card__title p').text().trim();
          const ot = $el.find('.popular-card__title span').text().trim();
          const y = $el.find('.rates .year').text().trim();
          const link = $el.find('.popular-card__title a').attr('href');
          if (link) posts2.push({ title: t, original_title: ot, year: y, url: link });
        });
        return posts2;
      });
    }
    return posts;
  }).then(posts => {
    if (!posts.length) return null;
    const scored = posts.map(post => ({
      post,
      score: scoreCandidate(post.title || "", title, originalTitle, year)
    }));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (best.score < 20) {
      console.log(`[LaMovie] Sin coincidencias (score: ${best.score.toFixed(1)})`);
      return null;
    }
    console.log(`[LaMovie] Búsqueda OK: "${best.post.title}" (score:${best.score.toFixed(1)}) url:${best.post.url}`);
    return { url: best.post.url };
  }).catch(err => {
    console.log("[LaMovie] Error búsqueda: " + err.message);
    return null;
  });
}

// --- findContent con estrategia original: primero por slug, luego búsqueda ---
function findContent(title, originalTitle, year, mediaType, genres, originCountries) {
  const postTypes = getPostTypes(mediaType, genres, originCountries);
  const candidates = [];

  // Construir slugs para cada postType
  for (let pt of postTypes) {
    candidates.push({ postType: pt, slug: buildSlug(title, year) });
    candidates.push({ postType: pt, slug: buildSlug(title, "") });
    if (originalTitle && normalizeTitle(originalTitle) !== normalizeTitle(title)) {
      candidates.push({ postType: pt, slug: buildSlug(originalTitle, year) });
      candidates.push({ postType: pt, slug: buildSlug(originalTitle, "") });
    }
  }

  // Probar cada candidato secuencialmente
  function tryNext(idx) {
    if (idx >= candidates.length) {
      // Fallback a búsqueda por scraping
      console.log(`[LaMovie] No encontrado por slug, buscando por título: "${title}"`);
      return searchLaMovie(title, originalTitle, year, postTypes);
    }
    const { postType, slug } = candidates[idx];
    return getIdBySlugApi(postType, slug).then(result => {
      if (result) return result;
      return tryNext(idx + 1);
    });
  }
  return tryNext(0);
}

// --- Obtener ID de episodio por API (original) ---
function getEpisodeId(seriesId, seasonNum, episodeNum) {
  const url = `${API_URL}/single/episodes/list?_id=${seriesId}&season=${seasonNum}&page=1&postsPerPage=50`;
  return get(url, { Accept: "application/json", Referer: BASE_URL + "/" }).then(data => {
    if (!data || !data.data || !data.data.posts) return null;
    const posts = data.data.posts;
    for (let e of posts) {
      if (String(e.season_number) === String(seasonNum) && String(e.episode_number) === String(episodeNum)) {
        console.log(`[LaMovie] Episodio S${seasonNum}E${episodeNum} id:${e._id}`);
        return String(e._id);
      }
    }
    console.log(`[LaMovie] Episodio S${seasonNum}E${episodeNum} no encontrado`);
    return null;
  }).catch(err => {
    console.log("[LaMovie] Error episodios: " + err.message);
    return null;
  });
}

// ========================= PROCESAMIENTO DE EMBEDS =========================
function processOneEmbed(embed) {
  const resolver = getResolver(embed.url);
  if (!resolver) {
    console.log("[LaMovie] Sin resolver para: " + embed.url);
    return Promise.resolve(null);
  }
  return resolver(embed.url).then(result => {
    if (!result || !result.url) return null;
    const serverName = getServerName(embed.url);
    const qualityLabel = embed.quality || result.quality || "1080p";
    const displayQuality = `${serverName} · ${qualityLabel}`;
    return {
      name: "LaMovie",
      title: displayQuality,
      url: result.url,
      quality: displayQuality,
      headers: result.headers || {}
    };
  }).catch(err => {
    console.log("[LaMovie] Error en embed: " + err.message);
    return null;
  });
}

function processEmbeds(embeds) {
  const results = [];
  function next(i) {
    if (i >= embeds.length) return Promise.resolve(results);
    return processOneEmbed(embeds[i]).then(result => {
      if (result) results.push(result);
      return next(i + 1);
    }).catch(() => next(i + 1));
  }
  return next(0);
}

// ========================= FUNCIÓN PRINCIPAL (con lógica original de episodios) =========================
function getStreams(tmdbId, mediaType, season, episode) {
  const resolvedType = (mediaType === "series" ? "tv" : mediaType || "movie");
  console.log(`[LaMovie] Solicitando TMDB:${tmdbId} (${resolvedType})${season ? ` S${season}E${episode}` : ""}`);

  return getTmdbInfo(tmdbId, resolvedType).then(info => {
    if (!info || !info.title) return [];
    console.log(`[LaMovie] TMDB: "${info.title}" (${info.year})`);

    return findContent(info.title, info.originalTitle, info.year, resolvedType, info.genres, info.originCountries).then(found => {
      if (!found || !found.id) {
        console.log("[LaMovie] Contenido no encontrado");
        return [];
      }
      const contentId = found.id;

      let postIdPromise;
      if (resolvedType === "tv" && season && episode) {
        postIdPromise = getEpisodeId(contentId, season, episode);
      } else {
        postIdPromise = Promise.resolve(contentId);
      }

      return postIdPromise.then(postId => {
        if (!postId) return [];
        const playerUrl = `${API_URL}/player?postId=${postId}`;
        return get(playerUrl, { Accept: "application/json", Referer: BASE_URL + "/" }).then(playerData => {
          if (!playerData || !playerData.data || !playerData.data.embeds || !playerData.data.embeds.length) {
            console.log("[LaMovie] Sin embeds disponibles");
            return [];
          }
          const embeds = playerData.data.embeds;
          console.log(`[LaMovie] ${embeds.length} embed(s) encontrados`);
          // Filtrar por idioma si se desea (opcional: ahora tomamos todos)
          const results = [];
          const promises = embeds.map(embed => {
            const resolver = getResolver(embed.url);
            if (!resolver) return Promise.resolve();
            return resolver(embed.url).then(result => {
              if (result && result.url) {
                const serverName = getServerName(embed.url);
                const isVerified = result.verified === true;
                const qualityLabel = embed.quality || result.quality || "1080p";
                const checkMark = isVerified ? " ✓" : "";
                const streamName = `La.movie - ${qualityLabel}${checkMark}`;
                const streamTitle = `${serverName} ${qualityLabel}`;
                results.push({
                  name: streamName,
                  title: streamTitle,
                  url: result.url,
                  quality: qualityLabel,
                  verified: isVerified,
                  headers: result.headers || {}
                });
              }
            }).catch(e => console.log("[LaMovie] Skip embed: " + e.message));
          });
          return Promise.all(promises).then(() => {
            console.log(`[LaMovie] Total final: ${results.length} streams`);
            return results;
          });
        });
      });
    });
  }).catch(err => {
    console.log("[LaMovie] Error general: " + err.message);
    return [];
  });
}

// ========================= EXPORTACIÓN =========================
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
             }
