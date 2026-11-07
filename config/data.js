// config/data.js
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import multer from 'multer'

export const DATA_DIR = path.join(import.meta.dirname, '..', 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })
// 上传配置
export const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      req.fileId ??= crypto.randomUUID() // 生成 id，路由里用
      cb(null, fs.mkdirSync(path.join(DATA_DIR, req.fileId), { recursive: true }))
    },
    filename(req, file, cb) {
      const name =
        Buffer.from(file.originalname, 'latin1')
          .toString('utf8') // 中文修复
          .replace(/[/\\?%*:|"<>]/g, '_')
          .replace(/\.{2,}/g, '_') || 'unnamed'
      cb(null, name)
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
})
