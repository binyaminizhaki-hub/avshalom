const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg"
};

function resolvePath(requestUrl) {
  const cleanUrl = (requestUrl || "/").split("?")[0];
  let decodedUrl = cleanUrl;

  try {
    decodedUrl = decodeURIComponent(cleanUrl);
  } catch (_error) {
    return null;
  }

  const pathname = decodedUrl === "/" ? "/index.html" : decodedUrl;
  const candidate = path.normalize(path.join(ROOT, pathname));
  if (!candidate.startsWith(ROOT)) {
    return null;
  }
  return candidate;
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url || "/");
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const isVideo = [".mp4", ".webm", ".ogg"].includes(ext);

  fs.stat(filePath, (statErr, stat) => {
    if (statErr) {
      if (statErr.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=UTF-8" });
        res.end("Not found");
      } else {
        res.writeHead(500, { "Content-Type": "text/plain; charset=UTF-8" });
        res.end("Server error");
      }
      return;
    }

    const fileSize = stat.size;
    const rangeHeader = req.headers["range"];

    if (isVideo && rangeHeader) {
      // Handle Range request for video streaming
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      if (start >= fileSize || end >= fileSize) {
        res.writeHead(416, {
          "Content-Range": `bytes */${fileSize}`,
          "Content-Type": contentType
        });
        res.end();
        return;
      }

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
      stream.on("error", () => res.end());
    } else {
      // Regular file serving
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": fileSize,
        "Accept-Ranges": isVideo ? "bytes" : "none"
      });

      if (req.method === "HEAD") {
        res.end();
        return;
      }

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on("error", () => res.end());
    }
  });
});

server.listen(PORT, () => {
  console.log(`Site running at http://localhost:${PORT}`);
});
