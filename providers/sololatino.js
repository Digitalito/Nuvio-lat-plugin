/**
 * sololatino - Plugin Nuvio
 * Generado: 2026-05-05T14:22:12.205Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/shared/utils/tmdb.js
var require_tmdb = __commonJS({
  "src/shared/utils/tmdb.js"(exports2, module2) {
    function getTmdbApiKey() {
      const settings = typeof globalThis !== "undefined" && globalThis.SCRAPER_SETTINGS || {};
      const appKey = settings.tmdb_api_key || settings.tmdbApiKey || (typeof TMDB_API_KEY !== "undefined" ? TMDB_API_KEY : null);
      return appKey || "439c478a771f35c05022f9feabcca01c";
    }
    var NUVIO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    function getImdbId(tmdbId, mediaType) {
      return __async(this, null, function* () {
        try {
          const type = String(mediaType || "").toLowerCase().includes("movie") ? "movie" : "tv";
          const apiKey = getTmdbApiKey();
          const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${apiKey}`;
          console.log(`[TMDB] Consultando (${type}): ${tmdbId}`);
          const response = yield fetch(url, {
            headers: { "User-Agent": NUVIO_UA }
          });
          if (!response.ok)
            return null;
          const data = yield response.json();
          return data ? data.imdb_id || null : null;
        } catch (e) {
          console.error("[TMDB] Error obteniendo IMDB ID:", e.message);
          return null;
        }
      });
    }
    function getDetails(tmdbId, mediaType) {
      return __async(this, null, function* () {
        try {
          const type = String(mediaType || "").toLowerCase().includes("movie") ? "movie" : "tv";
          const apiKey = getTmdbApiKey();
          const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${apiKey}&language=es-MX`;
          const response = yield fetch(url, {
            headers: { "User-Agent": NUVIO_UA }
          });
          if (!response.ok)
            return null;
          return yield response.json();
        } catch (e) {
          console.error("[TMDB] Error obteniendo detalles:", e.message);
          return null;
        }
      });
    }
    function getTmdbAliases(tmdbId, mediaType) {
      return __async(this, null, function* () {
        try {
          const type = String(mediaType || "").toLowerCase().includes("movie") ? "movie" : "tv";
          const apiKey = getTmdbApiKey();
          const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/alternative_titles?api_key=${apiKey}`;
          const response = yield fetch(url, {
            headers: { "User-Agent": NUVIO_UA }
          });
          if (!response.ok)
            return [];
          const data = yield response.json();
          if (!data)
            return [];
          const titles = data.titles || data.results || [];
          return titles.map((t) => t.title || t.name);
        } catch (e) {
          console.error("[TMDB] Error obteniendo alias:", e.message);
          return [];
        }
      });
    }
    module2.exports = { getImdbId, getDetails, getTmdbAliases };
  }
});

// src/sololatino/extractor.js
var require_extractor = __commonJS({
  "src/sololatino/extractor.js"(exports2, module2) {
    var tmdb = require_tmdb();
    var host = "https://player.pelisserieshoy.com";
    var refererBase = "https://sololatino.net/";
    var NUVIO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    function getStreams2(tmdbId, mediaType, season, episode) {
      return __async(this, null, function* () {
        var _a;
        try {
          console.log(`[SoloLatino] MediafireResolver v2.8.2: ${mediaType} ID:${tmdbId}`);
          let imdbId = tmdbId;
          if (!String(tmdbId).startsWith("tt")) {
            imdbId = yield tmdb.getImdbId(tmdbId, mediaType);
          }
          if (!imdbId)
            return [];
          const isMovie = mediaType === "movie";
          const ep = String(episode || 1).padStart(2, "0");
          const slug = isMovie ? imdbId : `${imdbId}-${season || 1}x${ep}`;
          const oWeb = `${host}/f/${slug}`;
          const headers = { "User-Agent": NUVIO_UA, "Referer": refererBase };
          const response = yield fetch(oWeb, { headers });
          if (!response.ok)
            return [];
          const html = yield response.text();
          const setCookieHeaders = response.headers.get("set-cookie");
          let cookie = "";
          if (setCookieHeaders) {
            cookie = setCookieHeaders.split(",").map((c) => c.split(";")[0].trim()).join("; ");
          }
          const tokenMatch = html.match(/(?:let\s+token|const\s+_t|tok|_t|token)\s*.*['"]([a-f0-9]{32})['"]/i);
          const token = tokenMatch ? tokenMatch[1] : "";
          if (!token)
            return [];
          const commonHeaders = __spreadProps(__spreadValues({}, headers), {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Referer": oWeb,
            "X-Requested-With": "XMLHttpRequest"
          });
          if (cookie)
            commonHeaders["Cookie"] = cookie;
          yield fetch(`${host}/s.php`, { method: "POST", headers: commonHeaders, body: `a=click&tok=${token}` }).catch(() => {
          });
          const listRes = yield fetch(`${host}/s.php`, { method: "POST", headers: commonHeaders, body: `a=1&tok=${token}` });
          const listData = yield listRes.json();
          const latServers = ((_a = listData.langs_s) == null ? void 0 : _a.LAT) || listData.s || [];
          const streams = [];
          for (const srv of latServers) {
            try {
              const sResponse = yield fetch(`${host}/s.php`, {
                method: "POST",
                headers: __spreadProps(__spreadValues({}, commonHeaders), { "Origin": host }),
                body: `a=2&v=${srv[1]}&tok=${token}`
              });
              const sData = yield sResponse.json();
              if (!sData || !sData.u)
                continue;
              let videoUrl = sData.u;
              const masterHeaders = {
                "User-Agent": NUVIO_UA,
                "Referer": oWeb,
                "origin": host
              };
              if (cookie)
                masterHeaders["Cookie"] = cookie;
              if (videoUrl.includes("/api/source/")) {
                const domain = new URL(videoUrl).hostname;
                const apiRes = yield fetch(videoUrl, {
                  method: "POST",
                  headers: __spreadProps(__spreadValues({}, masterHeaders), { "Content-Type": "application/x-www-form-urlencoded" }),
                  body: `r=https%3A%2F%2Fre.sololatino.net%2F&d=${domain}`
                });
                const apiData = yield apiRes.json();
                if (apiData.success && apiData.data && apiData.data.length > 0) {
                  videoUrl = apiData.data[apiData.data.length - 1].file;
                }
              }
              if (!videoUrl.startsWith("http")) {
                videoUrl = host + videoUrl;
              }
              try {
                const finalRes = yield fetch(videoUrl, { method: "HEAD", headers: masterHeaders, redirect: "follow" });
                if (finalRes.url && finalRes.url.includes("mediafire.com")) {
                  streams.push({
                    name: `SoloLatino - Directo`,
                    url: finalRes.url,
                    quality: "1080p",
                    language: "Latino",
                    // Ya no necesitamos origin, Mediafire va directo. Solo el Referer que vimos en tu cURL.
                    headers: {
                      "User-Agent": NUVIO_UA,
                      "Referer": "https://player.pelisserieshoy.com/"
                    }
                  });
                  continue;
                }
              } catch (e) {
              }
            } catch (e) {
            }
          }
          return streams;
        } catch (error) {
          return [];
        }
      });
    }
    module2.exports = { getStreams: getStreams2 };
  }
});

// src/sololatino/index.js
var extractor = require_extractor();
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log(`[SoloLatino] Buscando streams para ID: ${tmdbId}`);
      const streams = yield extractor.getStreams(tmdbId, mediaType, season, episode);
      return streams;
    } catch (error) {
      console.error(`[SoloLatino Index Error]:`, error.message);
      return [];
    }
  });
}
module.exports = { getStreams };
