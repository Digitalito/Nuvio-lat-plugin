/**
 * LaMovie Stream Resolver v2.4.0 (Adaptado para lamovie.org)
 * Basado en la versión limpia, con URLs actualizadas a lamovie.org
 * Mantiene toda la funcionalidad original + mejoras.
 */

const cheerio = require('cheerio'); // Solo para Node.js, en navegador se omite

// ========================= CONFIGURACIÓN =========================
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://lamovie.org";        // ← ACTUALIZADO
const API_URL = "https://lamovie.org/wp-api/v1"; // ← ACTUALIZADO

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
// ----- VOE -----
function voeDecode(ct, luts) {
  try {
    const rawLuts = luts.replace(/^\[|\]$/g, "").split("','").map(s => s.replace(/^'+|'+$/g, ""));
    const escapedLuts = rawLuts.map(i => i.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    let txt = "";
    for (let ci = 0; ci < ct.length; ci++) {
      let x = ct.charCodeAt(ci);
      if (x > 64 && x < 91) x = (x - 52) % 26 + 65;
      else if (x > 96 && x < 123) x = (x - 84) % 26 + 97;
      txt += String.fromCharCode(x);
    }
    for (let i = 0; i < escapedLuts.length; i++) txt = txt.replace(new RegExp(escapedLuts[i], "g"), "_");
    txt = txt.split("_").join("");
    const decoded1 = b64decode(txt);
    if (!decoded1) return null;
    let step4 = "";
    for (let i = 0; i < decoded1.length; i++) step4 += String.fromCharCode((decoded1.charCodeAt(i) - 3 + 256) % 256);
    const revBase64 = step4.split("").reverse().join("");
    const finalStr = b64decode(revBase64);
    if (!finalStr) return null;
    return JSON.parse(finalStr);
  } catch (e) {
    return null;
  }
}

function resolveVoe(embedUrl) {
  return get(embedUrl, { Referer: embedUrl }).then(data => {
    // Si hay redirección JS
    if (data.indexOf("window.location.href") !== -1 && data.length < 2000) {
      const rm = data.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
      if (rm) return resolveVoe(rm[1]);
    }

    // Intento con JSON incrustado
    const jsonMatch = data.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        const encText = Array.isArray(parsed) ? parsed[0] : parsed;
        if (typeof encText === "string") {
          let decoded = encText.replace(/[a-zA-Z]/g, c => {
            const code = c.charCodeAt(0);
            const limit = c <= 'Z' ? 90 : 122;
            const shifted = code + 13;
            return String.fromCharCode(limit >= shifted ? shifted : shifted - 26);
          });
          const noise = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"];
          for (let n of noise) decoded = decoded.split(n).join("");
          const b64_1 = b64decode(decoded);
          if (b64_1) {
            let shiftedStr = "";
            for (let i = 0; i < b64_1.length; i++) shiftedStr += String.fromCharCode(b64_1.charCodeAt(i) - 3);
            const reversed = shiftedStr.split("").reverse().join("");
            const decrypted = b64decode(reversed);
            if (decrypted) {
              const finalData = JSON.parse(decrypted);
              if (finalData && (finalData.source || finalData.direct_access_url)) {
                return {
                  url: finalData.source || finalData.direct_access_url,
                  quality: "1080p",
                  verified: true,
                  headers: { Referer: embedUrl, "User-Agent": DEFAULT_HEADERS["User-Agent"] }
                };
              }
            }
          }
        }
      } catch (ex) { console.log("[VOE] Decrypt error: " + ex.message); }
    }

    // Fallback: buscar mp4/hls directo
    const re = /(?:mp4|hls)['"\s]*:\s*['"]([^'"]+)['"]/gi;
    let m;
    while ((m = re.exec(data)) !== null) {
      let url = m[1];
      if (url.indexOf("aHR0") === 0) try { url = b64decode(url); } catch(e) {}
      return { url, quality: "1080p", verified: true, headers: { Referer: embedUrl } };
    }
    return null;
  }).catch(err => { console.log("[VOE] Error: " + err.message); return null; });
}

// ----- HLSWISH / STREAMWISH -----
const HLSWISH_DOMAIN_MAP = { "hglink.to": "vibuxer.com" };

function unpackEval(payload, radix, symtab) {
  const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return payload.replace(/\b([0-9a-zA-Z]+)\b/g, match => {
    let result = 0;
    for (let i = 0; i < match.length; i++) {
      const pos = chars.indexOf(match[i]);
      if (pos === -1) return match;
      result = result * radix + pos;
    }
    if (isNaN(result) || result >= symtab.length) return match;
    return symtab[result] && symtab[result] !== "" ? symtab[result] : match;
  });
}

function resolveHlswish(embedUrl) {
  let fetchUrl = embedUrl;
  for (let [oldDom, newDom] of Object.entries(HLSWISH_DOMAIN_MAP)) {
    if (fetchUrl.indexOf(oldDom) !== -1) fetchUrl = fetchUrl.replace(oldDom, newDom);
  }
  const embedHostMatch = fetchUrl.match(/^(https?:\/\/[^/]+)/);
  const embedHost = embedHostMatch ? embedHostMatch[1] : "https://hlswish.com";
  return get(fetchUrl, {
    Referer: "https://embed69.org/",
    Origin: "https://embed69.org",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9"
  }).then(data => {
    let fileMatch = data.match(/file\s*:\s*["']([^"']+)["']/i);
    if (fileMatch) {
      let url = fileMatch[1];
      if (url.charAt(0) === "/") url = embedHost + url;
      return { url, quality: "1080p", verified: true, headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"], Referer: embedHost + "/" } };
    }
    const packMatch = data.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[^}]+\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*'([\s\S]+?)'\.split\('\|'\)/);
    if (packMatch) {
      const unpacked = unpackEval(packMatch[1], parseInt(packMatch[2]), packMatch[4].split("|"));
      const m3u8Match = unpacked.match(/["']([^"']{30,}\.m3u8[^"']*)['"]/);
      if (m3u8Match) {
        let url = m3u8Match[1];
        if (url.charAt(0) === "/") url = embedHost + url;
        return { url, quality: "1080p", verified: true, headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"], Referer: embedHost + "/" } };
      }
    }
    const rawM3u8 = data.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
    if (rawM3u8) return { url: rawM3u8[0], quality: "1080p", verified: true, headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"], Referer: embedHost + "/" } };
    return null;
  }).catch(err => { console.log("[HLSWish] Error: " + err.message); return null; });
}

// ----- LACLOUD -----
function resolveLacloud(embedUrl) {
  return get(embedUrl, { Referer: BASE_URL + "/" }).then(html => {
    const m = html.match(/const src\s*=\s*["']([^"']+)["']/);
    if (m) return { url: m[1], quality: "1080p", verified: true, headers: { Referer: embedUrl, "User-Agent": DEFAULT_HEADERS["User-Agent"] } };
    return null;
  });
}

// ----- PACKER (genérico) -----
function resolvePacker(embedUrl) {
  return get(embedUrl, { Referer: BASE_URL + "/" }).then(html => {
    try {
      const packedMatch = html.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]*?\}\s*\('([\s\S]+?)',\s*(\d+),\s*(\d+),\s*[']([\s\S]+?)[']\.split\([']\|[']\)/);
      if (!packedMatch) return null;
      const unpacked = unpack(packedMatch[1], parseInt(packedMatch[2]), packedMatch[4].split('|'));
      const streamMatch = unpacked.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/) ||
                          unpacked.match(/["'](\/[^"']+\.m3u8[^"']*)["']/) ||
                          unpacked.match(/file\s*:\s*["']([^"']+\.m3u8[^"']*)["']/);
      if (streamMatch) {
        let hlsLink = streamMatch[1];
        if (hlsLink.startsWith('/')) {
          const baseUrl = embedUrl.match(/^(https?:\/\/[^/]+)/)[1];
          hlsLink = baseUrl + hlsLink;
        }
        return { url: hlsLink, quality: "1080p", verified: true, headers: { Referer: embedUrl, "User-Agent": DEFAULT_HEADERS["User-Agent"] } };
      }
    } catch (e) { console.log("[Packer] Error: " + e.message); }
    return null;
  });
}

// ----- VIMEOS (con reintentos) -----
function resolveVimeos(embedUrl) {
  const originMatch = embedUrl.match(/^(https?:\/\/[^/]+)/);
  const origin = originMatch ? originMatch[1] : "https://vimeos.net";
  const playHeaders = { "User-Agent": DEFAULT_HEADERS["User-Agent"], Referer: origin + "/", Origin: origin };
  const fetchOpts = {
    Referer: BASE_URL + "/tv/",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-MX,es;q=0.9"
  };
  function extractFileUrl(data) {
    const packMatch = data.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
    if (!packMatch) return null;
    const symtab = packMatch[4].split("|");
    const unpacked = unpackEval(packMatch[1], parseInt(packMatch[2]), symtab);
    let m = unpacked.match(/file:"(https?:\/\/[^"]+\.m3u8[^"]*)"/);
    if (!m) m = unpacked.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/);
    return m ? m[1] : null;
  }
  function attempt(n) {
    return get(embedUrl, fetchOpts).then(data => {
      const masterUrl = extractFileUrl(data);
      if (!masterUrl) {
        console.log(`[Vimeos] Intento ${n} sin URL, reintentando...`);
        return attempt(n + 1);
      }
      const iParam = (masterUrl.match(/[?&]i=([^&]*)/) || ["", "?"])[1];
      console.log(`[Vimeos] Intento ${n} i=${iParam}: ${masterUrl.slice(0, 100)}`);
      if (iParam === "0.0") {
        return { url: masterUrl, quality: "1080p", verified: true, headers: playHeaders };
      }
      return attempt(n + 1);
    }).catch(err => {
      console.log(`[Vimeos] Error intento ${n}: ${err.message}`);
      return attempt(n + 1);
    });
  }
  return attempt(1);
}

// ----- DOODSTREAM -----
function resolveDoodstream(embedUrl) {
  const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
  const embedHost = embedUrl.replace(/\/(d|f)\//, "/e/").replace("dsvplay.com", "d0000d.com");
  return get(embedHost, { "User-Agent": UA, Referer: BASE_URL + "/", Origin: BASE_URL }).then(html => {
    const match = html.match(/\$\.get\(['"](\/pass_md5\/[\w-]+\/([\w-]+))['"]/i);
    if (!match) return null;
    const passPath = match[1];
    const token = match[2];
    const domain = new URL(embedHost).origin;
    return get(domain + passPath, { "User-Agent": UA, Referer: embedHost }).then(videoBaseUrl => {
      if (!videoBaseUrl) return null;
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let randomString = "";
      for (let i = 0; i < 10; i++) randomString += chars.charAt(Math.floor(Math.random() * chars.length));
      const finalUrl = videoBaseUrl + randomString + "?token=" + token + "&expiry=" + Date.now();
      return { url: finalUrl, quality: "720p", verified: true, headers: { "User-Agent": UA, Referer: domain + "/" } };
    });
  }).catch(err => { console.log("[DoodStream] Error: " + err.message); return null; });
}

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

// ========================= TMDB Y BÚSQUEDA LOCAL =========================
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

function findContent(title, originalTitle, year, mediaType, genres, originCountries) {
  // Similar a la versión anterior, pero usando búsqueda directa
  return searchLaMovie(title, originalTitle, year, []);
}

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

// ========================= FUNCIÓN PRINCIPAL =========================
function getStreams(tmdbId, mediaType, season, episode) {
  const resolvedType = (mediaType === "series" ? "tv" : mediaType || "movie");
  console.log(`[LaMovie] Solicitando TMDB:${tmdbId} (${resolvedType})${season ? ` S${season}E${episode}` : ""}`);

  return getTmdbInfo(tmdbId, resolvedType).then(info => {
    if (!info || !info.title) return [];
    console.log(`[LaMovie] TMDB: "${info.title}" (${info.year})`);
    return findContent(info.title, info.originalTitle, info.year, resolvedType, info.genres, info.originCountries).then(found => {
      if (!found || !found.url) {
        console.log("[LaMovie] Contenido no encontrado");
        return [];
      }
      let movieUrl = found.url.startsWith('http') ? found.url : BASE_URL + found.url;

      let targetUrlPromise = Promise.resolve(movieUrl);
      if (resolvedType === "tv" && season && episode) {
        targetUrlPromise = get(movieUrl, { Referer: BASE_URL + "/" }).then(html => {
          const $ = cheerio.load(html);
          let episodeUrl = null;
          $('.list-episodes a').each(function() {
            const txt = $(this).text().toLowerCase();
            if (txt.includes(`temporada ${season}`) && txt.includes(`episodio ${episode}`)) {
              episodeUrl = $(this).attr('href');
            }
          });
          if (!episodeUrl) {
            $('.list-episodes a').each(function() {
              const href = $(this).attr('href') || "";
              if (href.includes(`-${season}x${episode}`) || href.includes(`/episodio-${episode}`)) {
                episodeUrl = href;
              }
            });
          }
          return episodeUrl ? (episodeUrl.startsWith('http') ? episodeUrl : BASE_URL + episodeUrl) : null;
        });
      }

      return targetUrlPromise.then(targetUrl => {
        if (!targetUrl) return [];
        return get(targetUrl, { Referer: BASE_URL + "/" }).then(html => {
          const $ = cheerio.load(html);
          const embeds = [];

          // Mapeo de idiomas
          const langMap = {};
          $('.server-tab .tab').each(function() {
            const id = $(this).attr('data-id');
            const type = $(this).attr('data-type') || $(this).text();
            if (id && type) langMap[id] = type.trim().toLowerCase();
          });

          $('.lang-group').each(function() {
            const $group = $(this);
            const groupId = $group.attr('data-id');
            let langText = langMap[groupId] || $group.find('.lang-title').text().trim().toLowerCase() || "";

            let langLabel = "Desconocido";
            if (langText.includes('latino')) langLabel = "Latino";
            else if (langText.includes('español') || langText.includes('castellano')) langLabel = "Castellano";
            else if (langText.includes('sub')) langLabel = "Subtitulado";
            if (langLabel === "Desconocido" && $group.hasClass('active')) langLabel = "Latino";

            // Solo tomamos Latino para mantener consistencia con la versión original
            if (langLabel !== "Latino") return;

            $group.find('.server-video').each(function() {
              const videoUrl = $(this).attr('data-video');
              const name = $(this).text().trim() || "Server";
              if (videoUrl) {
                embeds.push({ url: videoUrl, quality: "1080p", server: name, language: langLabel });
              }
            });
          });

          if (!embeds.length) {
            console.log("[LaMovie] No se encontraron embeds");
            return [];
          }
          console.log(`[LaMovie] ${embeds.length} embed(s) encontrados`);

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
                const streamTitle = `${embed.language} - ${serverName} ${qualityLabel}`;
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

// Función auxiliar para unpack (P.A.C.K.E.R.)
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
