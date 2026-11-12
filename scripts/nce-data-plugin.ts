import { createReadStream, statSync } from 'node:fs'
import type { ServerResponse } from 'node:http'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'

const MIME_TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

function isNceRequest(pathname: string) {
  return pathname === '/nce' || pathname.startsWith('/nce/') || pathname === '/nce-batches' || pathname.startsWith('/nce-batches/')
}

function respondRangeNotSatisfiable(res: ServerResponse, size: number) {
  res.statusCode = 416
  res.setHeader('Content-Range', `bytes */${size}`)
  res.end()
}

function serveNceData(dataDir: string): Connect.NextHandleFunction {
  const root = path.resolve(dataDir)
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep

  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }

    let pathname: string
    try {
      pathname = decodeURIComponent((req.url ?? '').split('?')[0])
    } catch {
      res.statusCode = 400
      res.end('Bad Request')
      return
    }
    if (!isNceRequest(pathname)) {
      next()
      return
    }

    const filePath = path.resolve(root, `.${pathname}`)
    if (filePath !== root && !filePath.startsWith(rootPrefix)) {
      res.statusCode = 403
      res.end('Forbidden')
      return
    }

    // Extension-less paths are client routes (/nce), not data: let the SPA answer.
    const isDataFile = path.extname(pathname) !== ''

    let stats
    try {
      stats = statSync(filePath)
    } catch {
      if (isDataFile) {
        res.statusCode = 404
        res.end('Not Found')
        return
      }
      next()
      return
    }
    if (!stats.isFile()) {
      if (isDataFile) {
        res.statusCode = 404
        res.end('Not Found')
        return
      }
      next()
      return
    }

    const mime = MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
    res.setHeader('Content-Type', mime)
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Cache-Control', 'no-cache')

    const range = req.headers.range
    if (!range) {
      res.statusCode = 200
      res.setHeader('Content-Length', stats.size)
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      createReadStream(filePath)
        .on('error', () => res.destroy())
        .pipe(res)
      return
    }

    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match || (!match[1] && !match[2])) {
      respondRangeNotSatisfiable(res, stats.size)
      return
    }

    let start: number
    let end: number
    if (!match[1]) {
      const suffixLength = Number(match[2])
      if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
        respondRangeNotSatisfiable(res, stats.size)
        return
      }
      start = Math.max(0, stats.size - suffixLength)
      end = stats.size - 1
    } else {
      start = Number(match[1])
      end = match[2] ? Number(match[2]) : stats.size - 1
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= stats.size) {
      respondRangeNotSatisfiable(res, stats.size)
      return
    }
    end = Math.min(end, stats.size - 1)

    res.statusCode = 206
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`)
    res.setHeader('Content-Length', end - start + 1)
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    createReadStream(filePath, { start, end })
      .on('error', () => res.destroy())
      .pipe(res)
  }
}

/** Serves nce-data from /nce/** and /nce-batches/** without copying it into the build. */
export function nceDataPlugin(dataDir: string): Plugin {
  const middleware = serveNceData(dataDir)
  return {
    name: 'nce-local-data',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
