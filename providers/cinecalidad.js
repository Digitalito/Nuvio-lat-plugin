/**
 * cinecalidad - Plugin Nuvio
 * Generado: 2026-05-05T14:22:12.142Z
 */
var __getOwnPropNames = Object.getOwnPropertyNames;
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

// src/shared/utils/unpacker.js
var require_unpacker = __commonJS({
  "src/shared/utils/unpacker.js"(exports2, module2) {
    function unpack(code) {
      try {
        const match = code.match(/eval\(function\(p,a,c,k,e,[rd]\)\{.*?\}\s*\('([\s\S]*?)',\s*(\d+),\s*(\d+),\s*'([\s\S]*?)'\.split\('\|'\)/);
        if (!match)
          return code;
        let [, p, a, c, k] = match;
        a = parseInt(a);
        c = parseInt(c);
        let kArr = k.split("|");
        const intToChar = (v, radix) => {
          const chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
          let res = "";
          while (v > 0) {
            res = chars[v % radix] + res;
            v = Math.floor(v / radix);
          }
          return res || "0";
        };
        const result = p.replace(/\b\w+\b/g, (e) => {
          const index = parseInt(e, 36);
          let word = kArr[index];
          if (!word) {
            const altIndex = parseInt(e, a);
            word = kArr[altIndex];
          }
          return word || e;
        });
        return result;
      } catch (e) {
        console.error("[Unpacker] Error des-empaquetando:", e.message);
        return code;
      }
    }
    module2.exports = { unpack };
  }
});

// src/shared/resolvers/vidhide.js
var require_vidhide = __commonJS({
  "src/shared/resolvers/vidhide.js"(exports2, module2) {
    var { unpack } = require_unpacker();
    var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    function resolveVidhide(url, customReferer) {
      return __async(this, null, function* () {
        try {
          console.log(`[Resolvers] Resolviendo VidHide: ${url}`);
          const origin = new URL(url).origin;
          const referer = customReferer || "https://embed69.org/";
          const response = yield fetch(url, {
            headers: {
              "User-Agent": USER_AGENT,
              "Referer": referer
            }
          });
          if (!response.ok) {
            console.error(`[VidHide] Error de red: ${response.status}`);
            return null;
          }
          let html = yield response.text();
          if (html.includes("window.location.href") && html.length < 1e3) {
            const redirectMatch = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
            if (redirectMatch) {
              console.log(`[VidHide] Detectada redirecci\xF3n JS a: ${redirectMatch[1]}`);
              return resolveVidhide(redirectMatch[1], url);
            }
          }
          const evalMatches = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/g);
          let contentToSearch = html;
          if (evalMatches) {
            console.log(`[VidHide] ${evalMatches.length} Packer(s) detectado(s), desempaquetando...`);
            evalMatches.forEach((m) => {
              try {
                contentToSearch += "\n" + unpack(m);
              } catch (e) {
              }
            });
          }
          const patterns = [
            /"?hls2"?\s*[:=]\s*"([^"]+)"/i,
            /"?hls4"?\s*[:=]\s*"([^"]+)"/i,
            /"?file"?\s*[:=]\s*"([^"]+\.m3u8[^"]*)"/i,
            /"?src"?\s*[:=]\s*"([^"]+\.m3u8[^"]*)"/i,
            /["']?file["']?\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']/i
          ];
          let link = null;
          for (const p of patterns) {
            const m = contentToSearch.match(p);
            if (m && m[1]) {
              link = m[1];
              break;
            }
          }
          if (!link) {
            const m3u8Matches = contentToSearch.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/g);
            if (m3u8Matches) {
              link = m3u8Matches.find((m) => !m.includes("adsystem") && !m.includes("pixel"));
            }
          }
          if (!link) {
            console.error(`[VidHide] No se encontr\xF3 ning\xFAn enlace m3u8 v\xE1lido.`);
            return null;
          }
          let finalUrl = link.startsWith("http") ? link : `${origin}${link}`;
          console.log(`[VidHide] \xC9xito: Enlace extra\xEDdo.`);
          return {
            url: finalUrl,
            quality: "1080p",
            headers: {
              "User-Agent": USER_AGENT,
              "Referer": `${origin}/`
            }
          };
        } catch (e) {
          console.error(`[Resolvers] Error en VidHide: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = resolveVidhide;
  }
});

// src/shared/resolvers/streamwish.js
var require_streamwish = __commonJS({
  "src/shared/resolvers/streamwish.js"(exports2, module2) {
    var { unpack } = require_unpacker();
    var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    function resolveStreamwish(url) {
      return __async(this, null, function* () {
        try {
          console.log(`[Resolvers] Resolviendo Streamwish: ${url}`);
          const domains = [
            "vibuxer.com",
            "awish.pro",
            "dwish.pro",
            "streamwish.to",
            "embedwish.com",
            "strish.com",
            "wishembed.pro"
          ];
          let success = false;
          let html = "";
          let finalOrigin = "";
          if (!url.includes("hglink.to")) {
            try {
              const res = yield fetch(url, { headers: { "User-Agent": USER_AGENT, "Referer": "https://embed69.org/" } });
              if (res.ok) {
                html = yield res.text();
                finalOrigin = new URL(url).origin;
                if (html.includes(".m3u8") || html.includes("eval(function"))
                  success = true;
              }
            } catch (e) {
            }
          }
          if (!success) {
            for (const domain of domains) {
              try {
                const fetchUrl = url.replace(/[^/]+\.(?:com|to|pro|net|org)/, domain);
                console.log(`[Streamwish] Probando espejo: ${domain}`);
                const res = yield fetch(fetchUrl, { headers: { "User-Agent": USER_AGENT, "Referer": "https://embed69.org/" } });
                if (res.ok) {
                  html = yield res.text();
                  finalOrigin = `https://${domain}`;
                  if (html.includes(".m3u8") || html.includes("eval(function")) {
                    success = true;
                    break;
                  }
                }
              } catch (e) {
              }
            }
          }
          if (!success) {
            console.error(`[Streamwish] No se pudo obtener contenido v\xE1lido de ning\xFAn espejo.`);
            return null;
          }
          const m3u8Direct = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
          if (m3u8Direct) {
            console.log(`[Streamwish] Enlace m3u8 directo encontrado.`);
            return { url: m3u8Direct[0], quality: "Auto", headers: { "Referer": finalOrigin + "/" } };
          }
          const evalMatch = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/);
          let contentToSearch = html;
          if (evalMatch) {
            try {
              console.log(`[Streamwish] Packer detectado, desempaquetando...`);
              contentToSearch += "\n" + unpack(evalMatch[0]);
            } catch (e) {
            }
          }
          const fileMatch = contentToSearch.match(/(?:file|source|src|hls)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)['"]/i);
          if (fileMatch) {
            let streamUrl = fileMatch[1];
            if (streamUrl.startsWith("/")) {
              streamUrl = finalOrigin + streamUrl;
            }
            console.log(`[Streamwish] \xC9xito: Enlace extra\xEDdo.`);
            return { url: streamUrl, quality: "Auto", headers: { "Referer": finalOrigin + "/" } };
          }
          const m3u8Fallback = contentToSearch.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
          if (m3u8Fallback) {
            console.log(`[Streamwish] \xC9xito: Enlace m3u8 encontrado en fallback.`);
            return { url: m3u8Fallback[0], quality: "Auto", headers: { "Referer": finalOrigin + "/" } };
          }
          return null;
        } catch (e) {
          console.error(`[Resolvers] Error en Streamwish: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = resolveStreamwish;
  }
});

// src/shared/utils/base64.js
var require_base64 = __commonJS({
  "src/shared/utils/base64.js"(exports2, module2) {
    function base64Decode(str) {
      if (typeof str !== "string")
        return "";
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      let output = "";
      str = str.replace(/=+$/, "");
      if (str.length % 4 === 1)
        return "";
      for (let bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
        buffer = chars.indexOf(buffer);
      }
      try {
        return decodeURIComponent(escape(output));
      } catch (e) {
        return output;
      }
    }
    module2.exports = { base64Decode };
  }
});

// src/shared/resolvers/voe.js
var require_voe = __commonJS({
  "src/shared/resolvers/voe.js"(exports2, module2) {
    var { base64Decode } = require_base64();
    var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    function localAtob(input) {
      if (!input)
        return "";
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      let str = String(input).replace(/=+$/, "").replace(/[\s\n\r\t]/g, "");
      let output = "";
      if (str.length % 4 === 1)
        return "";
      for (let bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
        buffer = chars.indexOf(buffer);
      }
      return output;
    }
    function resolveVoe(url) {
      return __async(this, null, function* () {
        try {
          console.log(`[VOE] Resolviendo: ${url}`);
          let response = yield fetch(url, { headers: { "User-Agent": USER_AGENT, "Referer": url } });
          let html = yield response.text();
          if (html.includes("permanentToken")) {
            const redirectMatch = html.match(/window\.location\.href\s*=\s*'([^']+)'/i);
            if (redirectMatch) {
              console.log(`[VOE] Siguiendo redirecci\xF3n de token: ${redirectMatch[1]}`);
              response = yield fetch(redirectMatch[1], { headers: { "User-Agent": USER_AGENT, "Referer": url } });
              html = yield response.text();
            }
          }
          if (html.includes("window.location.href") && html.length < 2e3) {
            const rm = html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/i);
            if (rm)
              return resolveVoe(rm[1]);
          }
          const jsonMatch = html.match(/<script type="application\/json">([\s\S]*?)<\/script>/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[1].trim());
              let encText = Array.isArray(parsed) ? parsed[0] : parsed;
              if (typeof encText !== "string")
                return null;
              let decoded = encText.replace(/[a-zA-Z]/g, (c) => {
                const code = c.charCodeAt(0);
                const limit = c <= "Z" ? 90 : 122;
                const shifted = code + 13;
                return String.fromCharCode(limit >= shifted ? shifted : shifted - 26);
              });
              const noise = ["@$", "^^", "~@", "%?", "*~", "!!", "#&"];
              for (const n of noise)
                decoded = decoded.split(n).join("");
              const b64_1 = localAtob(decoded);
              if (!b64_1)
                throw new Error("Stage 1 failed");
              let shiftedStr = "";
              for (let j = 0; j < b64_1.length; j++) {
                shiftedStr += String.fromCharCode(b64_1.charCodeAt(j) - 3);
              }
              const reversed = shiftedStr.split("").reverse().join("");
              const decrypted = localAtob(reversed);
              if (!decrypted)
                throw new Error("Stage 2 failed");
              const data = JSON.parse(decrypted);
              if (data && data.source) {
                console.log(`[Resolvers] VOE Success! Enlace extra\xEDdo.`);
                return {
                  url: data.source,
                  quality: "1080p",
                  verified: true,
                  headers: {
                    "User-Agent": USER_AGENT,
                    "Referer": url
                  }
                };
              }
            } catch (ex) {
              console.error(`[Resolvers] VOE Decryption error: ${ex.message}`);
            }
          }
          const m3u8Match = html.match(/["'](https?:\/\/[^"']+?\.m3u8[^"']*?)["']/i);
          if (m3u8Match && !m3u8Match[1].includes("test-videos.co.uk")) {
            return {
              url: m3u8Match[1],
              quality: "Auto",
              verified: false,
              headers: { "Referer": url, "User-Agent": USER_AGENT }
            };
          }
          return null;
        } catch (e) {
          console.error(`[Resolvers] Error en VOE: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = resolveVoe;
  }
});

// src/shared/utils/aes_gcm.js
var require_aes_gcm = __commonJS({
  "src/shared/utils/aes_gcm.js"(exports2, module2) {
    var _CryptoJS = typeof CryptoJS !== "undefined" ? CryptoJS : null;
    function parseB64(b64) {
      if (!b64 || !_CryptoJS)
        return null;
      try {
        const normalized = b64.replace(/-/g, "+").replace(/_/g, "/");
        return _CryptoJS.enc.Base64.parse(normalized);
      } catch (e) {
        return null;
      }
    }
    function decryptGCM(keyWA, ivWA, ciphertextWithTagWA) {
      try {
        if (!keyWA || !ivWA || !ciphertextWithTagWA || !_CryptoJS)
          return null;
        const tagSizeWords = 4;
        const ciphertextWords = ciphertextWithTagWA.words.slice(0, ciphertextWithTagWA.words.length - tagSizeWords);
        const ciphertextWA = _CryptoJS.lib.WordArray.create(
          ciphertextWords,
          ciphertextWithTagWA.sigBytes - 16
        );
        let counterWA = ivWA.clone();
        counterWA.concat(_CryptoJS.lib.WordArray.create([2], 4));
        const decrypted = _CryptoJS.AES.decrypt(
          { ciphertext: ciphertextWA },
          keyWA,
          {
            iv: counterWA,
            mode: _CryptoJS.mode.CTR,
            padding: _CryptoJS.pad.NoPadding
          }
        );
        return decrypted.toString(_CryptoJS.enc.Utf8);
      } catch (e) {
        console.error("[AES-GCM] Error:", e.message);
        return null;
      }
    }
    function decryptByse(playback) {
      try {
        if (!playback || !playback.key_parts || !playback.payload || !playback.iv || !_CryptoJS)
          return null;
        let keyWA = parseB64(playback.key_parts[0]);
        for (let i = 1; i < playback.key_parts.length; i++) {
          const part = parseB64(playback.key_parts[i]);
          if (part)
            keyWA.concat(part);
        }
        const ivWA = parseB64(playback.iv);
        const ciphertextWithTagWA = parseB64(playback.payload);
        return decryptGCM(keyWA, ivWA, ciphertextWithTagWA);
      } catch (e) {
        console.error("[Byse] Failed:", e.message);
        return null;
      }
    }
    module2.exports = { decryptByse };
  }
});

// src/shared/resolvers/filemoon.js
var require_filemoon = __commonJS({
  "src/shared/resolvers/filemoon.js"(exports2, module2) {
    var { unpack } = require_unpacker();
    var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    var { decryptByse } = require_aes_gcm();
    function resolveFilemoon(url) {
      return __async(this, null, function* () {
        var _a, _b, _c, _d;
        try {
          console.log(`[Resolvers] Filemoon Shield-Resolving: ${url}`);
          const urlObj = new URL(url);
          const hostname = urlObj.hostname;
          const videoId = urlObj.pathname.split("/").filter((p) => !!p).pop();
          if (!videoId)
            return null;
          try {
            const hasAES = typeof CryptoJS !== "undefined" && !!CryptoJS.AES;
            if (hasAES) {
              const playbackUrl = `https://${hostname}/api/videos/${videoId}/embed/playback`;
              console.log(`[Resolvers] Filemoon consultando API Playback...`);
              const response2 = yield fetch(playbackUrl, {
                headers: {
                  "User-Agent": USER_AGENT,
                  "Referer": url,
                  "Origin": `https://${hostname}`,
                  "X-Embed-Parent": url,
                  "Accept": "application/json"
                }
              });
              if (response2.ok) {
                const playbackData = yield response2.json();
                if (playbackData && playbackData.playback) {
                  const decrypted = decryptByse(playbackData.playback);
                  if (decrypted) {
                    const data = JSON.parse(decrypted);
                    const directUrl = ((_b = (_a = data == null ? void 0 : data.sources) == null ? void 0 : _a[0]) == null ? void 0 : _b.url) || (data == null ? void 0 : data.url);
                    if (directUrl) {
                      console.log(`[Resolvers] Filemoon Shield Success!`);
                      return {
                        url: directUrl,
                        quality: ((_d = (_c = data == null ? void 0 : data.sources) == null ? void 0 : _c[0]) == null ? void 0 : _d.label) || "1080p",
                        verified: true,
                        headers: {
                          "User-Agent": USER_AGENT,
                          "Referer": `https://${hostname}/`,
                          "Origin": `https://${hostname}`
                        }
                      };
                    }
                  }
                }
              }
            } else {
              console.log(`[Resolvers] Filemoon Shield omitido: CryptoJS.AES no disponible.`);
            }
          } catch (e) {
            console.log(`[Resolvers] Filemoon Shield Fall\xF3: ${e.message}`);
          }
          console.log(`[Resolvers] Filemoon Fallback: Buscando Packer...`);
          let response = yield fetch(url, {
            headers: {
              "User-Agent": USER_AGENT,
              "Referer": "https://www.cinecalidad.vg/"
            }
          });
          let html = yield response.text();
          const directMatch = html.match(/(?:file|source|src|hls|url)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
          if (directMatch) {
            console.log(`[Resolvers] Filemoon Direct Match Success!`);
            return { url: directMatch[1], quality: "Auto", headers: { "Referer": url, "User-Agent": USER_AGENT } };
          }
          const evalMatch = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/g);
          let contentToSearch = html;
          if (evalMatch) {
            evalMatch.forEach((m) => {
              try {
                const unpacked = unpack(m);
                if (unpacked)
                  contentToSearch += "\n" + unpacked;
              } catch (e) {
              }
            });
          }
          const fileMatch = contentToSearch.match(/(?:file|source|src|hls|url)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/i);
          if (fileMatch) {
            console.log(`[Resolvers] Filemoon Packer Success!`);
            return {
              url: fileMatch[1],
              quality: "Auto",
              headers: { "Referer": url, "User-Agent": USER_AGENT }
            };
          }
          return null;
        } catch (e) {
          console.error(`[Resolvers] Error en Filemoon: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = resolveFilemoon;
  }
});

// src/shared/resolvers/streamtape.js
var require_streamtape = __commonJS({
  "src/shared/resolvers/streamtape.js"(exports2, module2) {
    var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    function resolveStreamtape(url) {
      return __async(this, null, function* () {
        try {
          console.log(`[Resolvers] Streamtape: ${url}`);
          const origin = new URL(url).origin;
          const response = yield fetch(url, {
            headers: { "User-Agent": USER_AGENT, "Referer": origin + "/" }
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          const vidconfigMatch = html.match(/var\s+vidconfig\s*=\s*(\{[^;]+\})/);
          if (vidconfigMatch) {
            try {
              const vidconfig = JSON.parse(vidconfigMatch[1]);
              const videoId = vidconfig.id;
              if (videoId) {
                const apiUrl = `${origin}/api/video/view?id=${videoId}`;
                const apiRes = yield fetch(apiUrl, {
                  headers: { "User-Agent": USER_AGENT, "Referer": url }
                });
                if (apiRes.ok) {
                  const data = yield apiRes.json();
                  if (data && data.result) {
                    const streamUrl = data.result.startsWith("//") ? "https:" + data.result : data.result;
                    return {
                      url: streamUrl,
                      quality: "HD",
                      headers: { "User-Agent": USER_AGENT, "Referer": origin + "/" }
                    };
                  }
                }
              }
            } catch (_) {
            }
          }
          const partA = html.match(/id="ideoolink">\s*<a[^>]*href="([^"]+)"/i);
          if (partA) {
            let streamUrl = partA[1];
            if (streamUrl.startsWith("//"))
              streamUrl = "https:" + streamUrl;
            return {
              url: streamUrl,
              quality: "HD",
              headers: { "User-Agent": USER_AGENT, "Referer": origin + "/" }
            };
          }
          const tokenMatch = html.match(/document\.getElementById\('ideoolink'\)\.innerHTML\s*=\s*["']([^"']+)["']/i);
          if (tokenMatch) {
            let streamUrl = tokenMatch[1].replace(/\\'/g, "'").replace(/\\"/g, '"');
            const hrefMatch = streamUrl.match(/href=["']([^"']+)["']/i);
            if (hrefMatch) {
              let finalUrl = hrefMatch[1];
              if (finalUrl.startsWith("//"))
                finalUrl = "https:" + finalUrl;
              return {
                url: finalUrl,
                quality: "HD",
                headers: { "User-Agent": USER_AGENT, "Referer": origin + "/" }
              };
            }
          }
          const tapeMatch = html.match(/https?:\/\/[^"'\s]+tapecontent\.net[^"'\s]*/i);
          if (tapeMatch) {
            return {
              url: tapeMatch[0],
              quality: "HD",
              headers: { "User-Agent": USER_AGENT, "Referer": origin + "/" }
            };
          }
          return null;
        } catch (e) {
          console.error(`[Resolvers] Error Streamtape: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = resolveStreamtape;
  }
});

// src/shared/resolvers/goodstream.js
var require_goodstream = __commonJS({
  "src/shared/resolvers/goodstream.js"(exports2, module2) {
    var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    function resolveGoodstream(url) {
      return __async(this, null, function* () {
        try {
          console.log(`[Resolvers] Resolviendo GoodStream (Nuvio-UA Mode): ${url}`);
          const origin = new URL(url).origin;
          const response = yield fetch(url, {
            headers: {
              "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
              "accept-language": "es-ES,es;q=0.9",
              "cache-control": "no-cache",
              "pragma": "no-cache",
              "priority": "u=0, i",
              "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
              "sec-ch-ua-mobile": "?0",
              "sec-ch-ua-platform": '"Windows"',
              "sec-fetch-dest": "document",
              "sec-fetch-mode": "navigate",
              "sec-fetch-site": "cross-site",
              "sec-fetch-user": "?1",
              "upgrade-insecure-requests": "1",
              "cookie": "aff=64; ref_url=cinecalidad.vg",
              "Referer": "https://www.cinecalidad.vg/",
              "User-Agent": USER_AGENT
            }
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          let videoUrl = null;
          const fileMatch = html.match(/file:\s*"([^"]+)"/);
          if (fileMatch) {
            videoUrl = fileMatch[1];
          }
          if (videoUrl) {
            console.log(`[Resolvers] GoodStream Success!`);
            return {
              url: videoUrl,
              quality: "1080p",
              verified: true,
              headers: {
                "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "Referer": origin + "/",
                "User-Agent": USER_AGENT
              }
            };
          }
          return null;
        } catch (e) {
          console.error(`[Resolvers] Error en GoodStream: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = resolveGoodstream;
  }
});

// src/shared/resolvers/generic_packer.js
var require_generic_packer = __commonJS({
  "src/shared/resolvers/generic_packer.js"(exports2, module2) {
    var { unpack } = require_unpacker();
    var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    function resolveGenericPacker(url, referer) {
      return __async(this, null, function* () {
        try {
          console.log(`[Resolvers] GenericPacker: ${url}`);
          const origin = new URL(url).origin;
          const response = yield fetch(url, {
            headers: {
              "User-Agent": USER_AGENT,
              "Referer": referer || origin + "/"
            }
          });
          if (!response.ok)
            return null;
          const html = yield response.text();
          let contentToSearch = html;
          const evalMatches = html.match(/eval\(function\(p,a,c,k,e,[rd]\)[\s\S]*?\.split\('\|'\)[^\)]*\)\)/g);
          if (evalMatches) {
            for (const em of evalMatches) {
              try {
                contentToSearch += "\n" + unpack(em);
              } catch (e) {
              }
            }
          }
          const fileMatch = contentToSearch.match(/(?:file|source|src|hls|stream_url|url)\s*[=:]\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)['"]/i);
          if (fileMatch) {
            let streamUrl = fileMatch[1];
            if (streamUrl.startsWith("/"))
              streamUrl = origin + streamUrl;
            return {
              url: streamUrl,
              quality: "Auto",
              headers: { "Referer": origin + "/", "User-Agent": USER_AGENT }
            };
          }
          const m3u8Match = contentToSearch.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/i);
          if (m3u8Match) {
            return {
              url: m3u8Match[0],
              quality: "Auto",
              headers: { "Referer": origin + "/", "User-Agent": USER_AGENT }
            };
          }
          return null;
        } catch (e) {
          console.error(`[Resolvers] Error GenericPacker: ${e.message}`);
          return null;
        }
      });
    }
    module2.exports = resolveGenericPacker;
  }
});

// src/shared/utils/m3u8.js
var require_m3u8 = __commonJS({
  "src/shared/utils/m3u8.js"(exports2, module2) {
    var m3u8Parser = {
      getQualityFromHeight(height) {
        const h = parseInt(height);
        if (h >= 2160)
          return "4K";
        if (h >= 1440)
          return "1440p";
        if (h >= 1080)
          return "1080p";
        if (h >= 720)
          return "720p";
        if (h >= 480)
          return "480p";
        if (h >= 360)
          return "360p";
        return null;
      },
      /**
       * Busca patrones de calidad 100% seguros en la URL para evitar descargas innecesarias
       */
      getQualityFromSafePatterns(url) {
        if (!url)
          return null;
        const u = url.toLowerCase();
        if (u.includes(",h,.urlset"))
          return "1080p";
        if (u.includes(",n,.urlset"))
          return "720p";
        if (u.includes(",l,.urlset"))
          return "480p";
        const standardMatch = u.match(/[_-](1080|720|480|360)p?(\.m3u8|$|\?)/);
        if (standardMatch)
          return standardMatch[1] + "p";
        return null;
      },
      getQualityFromContent(content) {
        if (!content)
          return null;
        try {
          const lines = content.split("\n");
          let bestHeight = 0;
          for (const line of lines) {
            if (line.includes("RESOLUTION=")) {
              const match = line.match(/RESOLUTION=\d+x(\d+)/i);
              if (match) {
                const height = parseInt(match[1]);
                if (height > bestHeight)
                  bestHeight = height;
              }
            }
          }
          return bestHeight > 0 ? this.getQualityFromHeight(bestHeight) : null;
        } catch (e) {
          return null;
        }
      },
      detectRealQuality(_0) {
        return __async(this, arguments, function* (url, headers = {}) {
          try {
            const fastQuality = this.getQualityFromSafePatterns(url);
            if (fastQuality)
              return { quality: fastQuality, error: null };
            const response = yield fetch(url, { headers }).catch(() => null);
            if (!response || !response.ok)
              return null;
            const content = yield response.text();
            const realQuality = this.getQualityFromContent(content);
            return realQuality ? { quality: realQuality, error: null } : null;
          } catch (e) {
            return null;
          }
        });
      }
    };
    module2.exports = m3u8Parser;
  }
});

// src/shared/resolvers/index.js
var require_resolvers = __commonJS({
  "src/shared/resolvers/index.js"(exports2, module2) {
    var resolveVidhide = require_vidhide();
    var resolveStreamwish = require_streamwish();
    var resolveVoe = require_voe();
    var resolveFilemoon = require_filemoon();
    var resolveStreamtape = require_streamtape();
    var resolveGoodstream = require_goodstream();
    var resolveGenericPacker = require_generic_packer();
    var m3u8Parser = require_m3u8();
    var registry = {
      vidhide: resolveVidhide,
      streamwish: resolveStreamwish,
      filemoon: resolveFilemoon,
      voe: resolveVoe,
      streamtape: resolveStreamtape,
      vimeos: resolveGoodstream,
      goodstream: resolveGoodstream
    };
    function resolve(servername, url) {
      return __async(this, null, function* () {
        const name = String(servername).toLowerCase().trim();
        if (registry[name]) {
          console.log(`[Resolvers] Iniciando resoluci\xF3n para: ${name}`);
          const result = yield registry[name](url);
          if (!result) {
            console.log(`[Resolvers] ${name} no devolvi\xF3 ning\xFAn enlace.`);
            return null;
          }
          if (result && result.url) {
            try {
              console.log(`[Resolvers] Detectando calidad real para: ${name}`);
              const detection = yield m3u8Parser.detectRealQuality(result.url, result.headers || {});
              if (detection && detection.quality) {
                console.log(`[Resolvers] Calidad detectada: ${detection.quality}`);
                result.quality = detection.quality;
                result.verified = true;
              } else if (detection && detection.error) {
                console.log(`[Resolvers] Depuraci\xF3n de calidad: ${detection.error}`);
                result.debug = detection.error;
              }
            } catch (e) {
              console.error(`[Resolvers] Fallo en detecci\xF3n de calidad: ${e.message}`);
            }
          }
          console.log(`[Resolvers] Finalizada resoluci\xF3n de: ${name}`);
          return result;
        }
        console.log(`[Resolvers] Servidor no soportado: ${name}`);
        return null;
      });
    }
    module2.exports = { resolve };
  }
});

// src/cinecalidad/extractor.js
var require_extractor = __commonJS({
  "src/cinecalidad/extractor.js"(exports2, module2) {
    var cheerio = require("cheerio");
    var tmdb = require_tmdb();
    var resolvers = require_resolvers();
    var HOST = "https://www.cinecalidad.vg";
    var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    var HEADERS = {
      "User-Agent": UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-MX,es;q=0.9",
      "Referer": HOST + "/"
    };
    function b64decode(str) {
      try {
        return atob(str);
      } catch (e) {
        return null;
      }
    }
    function buildSlug(title) {
      return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    }
    function getServerName(url) {
      const lower = url.toLowerCase();
      if (lower.includes("voe"))
        return "VOE";
      if (lower.includes("streamwish") || lower.includes("vibuxer") || lower.includes("hglink") || lower.includes("hlswish"))
        return "StreamWish";
      if (lower.includes("vidhide") || lower.includes("vidsrc"))
        return "VidHide";
      if (lower.includes("filemoon"))
        return "Filemoon";
      if (lower.includes("vimeos"))
        return "Vimeos";
      if (lower.includes("goodstream"))
        return "GoodStream";
      if (lower.includes("mixdrop"))
        return "Mixdrop";
      if (lower.includes("streamtape"))
        return "Streamtape";
      return "Online";
    }
    function getMovieBySlug(slug, year) {
      return __async(this, null, function* () {
        const slugs = [slug, `${slug}-2`, `${slug}-3`];
        for (const s of slugs) {
          const url = `${HOST}/pelicula/${s}/`;
          try {
            const res = yield fetch(url, { headers: HEADERS, skipSizeCheck: true });
            if (res.ok) {
              const html = yield res.text();
              if (html.includes('data-src="')) {
                if (year) {
                  const yearMatch = html.match(/\((\d{4})\)/);
                  if (yearMatch && yearMatch[1] === year)
                    return url;
                } else {
                  return url;
                }
              }
            }
          } catch (e) {
          }
        }
        return null;
      });
    }
    function searchInSite(query) {
      return __async(this, null, function* () {
        try {
          const url = `${HOST}/?s=${encodeURIComponent(query)}`;
          const res = yield fetch(url, { headers: HEADERS, skipSizeCheck: true });
          if (!res.ok)
            return [];
          const html = yield res.text();
          const $ = cheerio.load(html);
          const results = [];
          $("a").each((i, el) => {
            const href = $(el).attr("href");
            if (href && href.includes("/pelicula/") && !results.includes(href)) {
              results.push(href);
            }
          });
          return results;
        } catch (e) {
          return [];
        }
      });
    }
    function extractStreams(movieUrl) {
      return __async(this, null, function* () {
        try {
          console.log(`[CineCalidad] Extrayendo de: ${movieUrl}`);
          const res = yield fetch(movieUrl, { headers: HEADERS, skipSizeCheck: true });
          if (!res.ok)
            return [];
          const html = yield res.text();
          const embedUrls = /* @__PURE__ */ new Set();
          const b64Regex = /data-src="([A-Za-z0-9+/=]{20,})"/g;
          let match;
          while ((match = b64Regex.exec(html)) !== null) {
            const decoded = b64decode(match[1]);
            if (decoded && decoded.startsWith("http")) {
              embedUrls.add(decoded);
            }
          }
          const finalUrls = [];
          for (const url of embedUrls) {
            if (url.includes("cinecalidad") && url.includes("?id=")) {
              try {
                const midRes = yield fetch(url, { headers: HEADERS, skipSizeCheck: true });
                if (midRes.ok) {
                  const midHtml = yield midRes.text();
                  const btnMatch = midHtml.match(/id="btn_enlace"[^>]*href="([^"]+)"/);
                  if (btnMatch)
                    finalUrls.push(btnMatch[1]);
                  else {
                    const iframeMatch = midHtml.match(/<iframe[^>]+src="([^"]+)"/);
                    if (iframeMatch)
                      finalUrls.push(iframeMatch[1]);
                  }
                }
              } catch (e) {
              }
            } else {
              finalUrls.push(url);
            }
          }
          const streams = [];
          for (const url of finalUrls) {
            const serverName = getServerName(url);
            console.log(`[CineCalidad] Resolviendo ${serverName}: ${url}`);
            try {
              const resolved = yield resolvers.resolve(serverName, url);
              if (resolved && resolved.url) {
                streams.push({
                  name: serverName,
                  url: resolved.url,
                  quality: resolved.quality || "HD",
                  language: "Latino",
                  headers: resolved.headers || { "User-Agent": UA, "Referer": HOST + "/" }
                });
              }
            } catch (e) {
              console.error(`[CineCalidad] Error resolviendo ${url}:`, e.message);
            }
          }
          return streams;
        } catch (e) {
          console.error("[CineCalidad] Error extrayendo streams:", e.message);
          return [];
        }
      });
    }
    function getStreams(tmdbId, mediaType, season, episode, providedTitle) {
      return __async(this, null, function* () {
        if (mediaType === "tv")
          return [];
        try {
          let title = providedTitle;
          let year = null;
          if (!title && tmdbId) {
            const details = yield tmdb.getDetails(tmdbId, mediaType);
            if (details) {
              title = details.title || details.original_title;
              year = (details.release_date || "").substring(0, 4);
            }
          }
          if (!title) {
            console.log(`[CineCalidad] Error: No se pudo determinar el t\xEDtulo para TMDB:${tmdbId}`);
            return [];
          }
          console.log(`[CineCalidad] Buscando: ${title} ${year ? "(" + year + ")" : ""}`);
          let movieUrl = yield getMovieBySlug(buildSlug(title), year);
          if (!movieUrl) {
            const searchResults = yield searchInSite(title);
            if (searchResults.length > 0)
              movieUrl = searchResults[0];
          }
          if (!movieUrl && tmdbId) {
            console.log(`[CineCalidad] Probando alias de TMDB...`);
            const aliases = yield tmdb.getTmdbAliases(tmdbId, mediaType);
            const filteredAliases = aliases.filter((a) => /^[a-zA-Z0-9\s\-\:\.\,¡!¿?áéíóúÁÉÍÓÚñÑ]+$/.test(a)).filter((a) => a.toLowerCase() !== title.toLowerCase()).slice(0, 5);
            for (const alias of filteredAliases) {
              movieUrl = yield getMovieBySlug(buildSlug(alias), year);
              if (movieUrl)
                break;
              const aliasResults = yield searchInSite(alias);
              if (aliasResults.length > 0) {
                movieUrl = aliasResults[0];
                break;
              }
            }
          }
          if (!movieUrl) {
            console.log(`[CineCalidad] No se encontr\xF3 la pel\xEDcula.`);
            return [];
          }
          return yield extractStreams(movieUrl);
        } catch (e) {
          console.error("[CineCalidad] Error fatal:", e.message);
          return [];
        }
      });
    }
    module2.exports = { getStreams };
  }
});

// src/cinecalidad/index.js
var extractor = require_extractor();
module.exports = {
  getStreams: extractor.getStreams
};
