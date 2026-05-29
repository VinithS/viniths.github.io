/*
  Dev-only authoring middleware (Vite plugin).

  Mounts two POST endpoints during `astro dev` ONLY:

    POST /__dev/tweet  { text }
      → prepends a note to src/content/tweets.json (id = max+1, date = today UTC)

    POST /__dev/album  { title, place, date, coverIndex, images: [{ name, alt, dataUrl }] }
      → writes the uploaded images under public/photos/<slug>/, then appends an
        album to src/content/photos.json (cover = the coverIndex image, aspect
        measured client-side and sent as `aspect`).

  Zero production footprint: this plugin exposes ONLY `configureServer`, a hook
  Vite calls when starting the dev server. It is never invoked during
  `astro build`, so none of this Node fs code is bundled into the static site.
  The UI that calls these endpoints is gated behind `import.meta.env.DEV` in the
  pages, so it is dead-code-stripped from the production build too.

  Requests/writes are local-only authoring conveniences; validation is basic
  (this never runs on a deployed server).
*/

import { promises as fs } from "node:fs";
import path from "node:path";

const PROJECT_ROOT = process.cwd();
const TWEETS_JSON = path.join(PROJECT_ROOT, "src/content/tweets.json");
const PHOTOS_JSON = path.join(PROJECT_ROOT, "src/content/photos.json");
const PHOTOS_DIR = path.join(PROJECT_ROOT, "public/photos");

const MAX_BODY_BYTES = 60 * 1024 * 1024; // 60MB — album uploads are base64.
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);

function slugify(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function todayUtcMonth() {
  // "YYYY-MM" in UTC — matches the photos schema + the date-desc sort.
  return new Date().toISOString().slice(0, 7);
}

function todayUtcDate() {
  // "YYYY-MM-DD" in UTC — tweets store a full date.
  return new Date().toISOString().slice(0, 10);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (e) {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(body);
}

async function readJsonFile(file) {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

async function writeJsonFile(file, data) {
  // Pretty-printed with a trailing newline so the diff matches the
  // hand-authored style of the existing content files.
  await fs.writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

// data:[mime];base64,XXXX  →  { ext, buffer }
function decodeDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || "");
  if (!m) throw new Error("bad dataUrl");
  const mime = m[1];
  const buffer = Buffer.from(m[2], "base64");
  const ext = (mime.split("/")[1] || "").toLowerCase().replace("jpeg", "jpg");
  if (!ALLOWED_EXT.has(ext)) throw new Error(`unsupported image type: ${mime}`);
  return { ext, buffer };
}

async function handleTweet(req, res) {
  const body = await readJsonBody(req);
  const text = String(body.text ?? "").trim();
  if (!text) return sendJson(res, 400, { error: "text is required" });
  if (text.length > 250)
    return sendJson(res, 400, { error: "text exceeds 250 chars" });

  const tweets = await readJsonFile(TWEETS_JSON);
  const maxId = tweets.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0);
  const entry = { id: String(maxId + 1), date: todayUtcDate(), text };
  // Newest first in the file too (the page sorts by date anyway).
  tweets.unshift(entry);
  await writeJsonFile(TWEETS_JSON, tweets);
  return sendJson(res, 200, { ok: true, entry });
}

async function handleAlbum(req, res) {
  const body = await readJsonBody(req);
  const title = String(body.title ?? "").trim();
  const place = String(body.place ?? "").trim();
  const date = String(body.date ?? "").trim() || todayUtcMonth();
  const images = Array.isArray(body.images) ? body.images : [];
  const coverIndex = Number.isInteger(body.coverIndex) ? body.coverIndex : 0;
  const aspect = Number(body.aspect);

  if (!title) return sendJson(res, 400, { error: "title is required" });
  if (!images.length)
    return sendJson(res, 400, { error: "at least one image is required" });
  if (!/^\d{4}-\d{2}$/.test(date))
    return sendJson(res, 400, { error: 'date must be "YYYY-MM"' });
  if (!(aspect > 0))
    return sendJson(res, 400, { error: "aspect must be a positive number" });

  const photos = await readJsonFile(PHOTOS_JSON);

  // Unique slug/id for the album folder.
  let base = slugify(title) || "album";
  let id = base;
  let n = 2;
  const existing = new Set(photos.map((p) => p.id));
  while (existing.has(id)) id = `${base}-${n++}`;

  const albumDir = path.join(PHOTOS_DIR, id);
  await fs.mkdir(albumDir, { recursive: true });

  const written = [];
  for (let i = 0; i < images.length; i++) {
    const { ext, buffer } = decodeDataUrl(images[i].dataUrl);
    const fname = `${String(i + 1).padStart(2, "0")}.${ext}`;
    await fs.writeFile(path.join(albumDir, fname), buffer);
    written.push({
      src: `/photos/${id}/${fname}`,
      alt: String(images[i].alt ?? "").trim() || title,
    });
  }

  // Clamp both ends — a hand-crafted negative index would otherwise index
  // written[-1] (undefined) and throw after the files are already on disk.
  const safeCover = Math.max(0, Math.min(coverIndex, written.length - 1));
  const cover = written[safeCover].src;
  const album = {
    id,
    title,
    description: place || title,
    date,
    cover,
    aspect,
    images: written,
  };
  photos.push(album);
  await writeJsonFile(PHOTOS_JSON, photos);
  return sendJson(res, 200, { ok: true, album });
}

/*
  Build-time companion: stub the dev-only authoring islands to an empty
  component during `vite build`. The pages import these islands at the top
  of their frontmatter and only render them under import.meta.env.DEV — but
  Astro still discovers the island via the import and would emit its hydration
  chunk to dist/_astro/ (an orphan JS file carrying the /__dev/ endpoints).
  Replacing the source with an empty component in build means Rollup emits
  nothing, so production ships zero authoring footprint.
*/
const DEV_ISLAND_RE = /\/src\/components\/dev\/(TweetComposer|AlbumCreator)\.svelte$/;

/** @returns {import('vite').Plugin} */
export function stripDevIslands() {
  return {
    name: "pf-strip-dev-islands",
    apply: "build", // build only; the serve plugin keeps the real source in dev
    enforce: "pre", // run before the Svelte compiler sees the file
    load(id) {
      // id may carry a query (?...) from the Astro/Svelte pipeline; match the path part.
      const pathPart = id.split("?")[0];
      if (DEV_ISLAND_RE.test(pathPart)) {
        // An empty Svelte 5 component: renders nothing, pulls in nothing.
        return "<script></script>";
      }
      return null;
    },
  };
}

/** @returns {import('vite').Plugin} */
export function devAuthoring() {
  return {
    name: "pf-dev-authoring",
    apply: "serve", // dev server only; ignored by `vite build`
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/__dev/")) return next();
        if (req.method !== "POST") return next();
        try {
          if (req.url.startsWith("/__dev/tweet")) return await handleTweet(req, res);
          if (req.url.startsWith("/__dev/album")) return await handleAlbum(req, res);
          return next();
        } catch (err) {
          server.config.logger.error(`[dev-authoring] ${err?.message || err}`);
          return sendJson(res, 500, { error: String(err?.message || err) });
        }
      });
    },
  };
}
