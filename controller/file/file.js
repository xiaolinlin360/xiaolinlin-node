import pool from '../../model/db.js'
import { ok, fail } from '../../lib/respond.js'
import { DATA_DIR } from '../../config/data.js'
import { calcDirSize } from './utils/calcDirSize.js'
import { formatSize } from './utils/formatSize.js'

// 第一次算完把结果记下来，30 秒内再有人问就直接给记下来的结果，不去重新算；超过 30 秒才算一次新的
const SIZE_CACHE_TTL = 30 * 1000
let sizeCache = { at: 0, bytes: 0, count: 0 }

const fileController = {
  //获取文件（分页查询）
  getFile: (req, res, next) => {
    let pageSize = Number(req.body.pageSize) || 10
    let pageNum = Number(req.body.pageNum) || 1
    let fileUrls = req.body.file_urls

    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100
    let _sql = 'SELECT * FROM files'
    let queryParams = []
    // 1. 处理 file_urls：去掉所有符号 → 只保留十六进制 → 按 32 位切成 UUID
    if (fileUrls !== undefined && fileUrls !== null && fileUrls !== '') {
      const hex = String(fileUrls)
        .toLowerCase()
        .replace(/[^0-9a-f]/g, '')
      const ids = (hex.match(/.{32}/g) || []).map(
        (s) =>
          `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
      )
      if (ids.length === 0) {
        return ok(res, { files: [], pageSize, pageNum })
      }
      queryParams.push(ids)
      _sql += ` WHERE id = ANY($${queryParams.length}::uuid[])`
    }
    // 2. 排序
    _sql += ' ORDER BY created_at DESC, id DESC'
    // 3. 分页
    queryParams.push(pageSize)
    _sql += ` LIMIT $${queryParams.length}`
    queryParams.push((pageNum - 1) * pageSize)
    _sql += ` OFFSET $${queryParams.length}`
    // 4. 执行查询
    pool.query(_sql, queryParams, (err, result) => {
      if (err) {
        console.error('[getFile]', err)
        return fail(res, 500, '数据库查询错误')
      }
      ok(res, { files: result.rows, pageSize, pageNum })
    })
  },
  //获取文件总数（支持与 getFile 相同的 id 过滤，保证分页器总数一致）
  getTotalFile: (req, res, next) => {
    let fileUrls = req.body?.file_urls

    // 与 getFile 完全一致的过滤口径：单值转数组、空数组直接返回 0
    if (fileUrls !== undefined && fileUrls !== null && fileUrls !== '') {
      if (!Array.isArray(fileUrls)) fileUrls = [fileUrls]
      if (fileUrls.length === 0) {
        return ok(res, { total: 0 })
      }
      let _sql = 'SELECT COUNT(*)::int AS total FROM files WHERE id = ANY($1);'
      pool.query(_sql, [fileUrls], (err, result) => {
        if (err) {
          console.error('[getTotalFile]', err)
          return fail(res, 500, '数据库查询错误')
        }
        ok(res, { total: result.rows[0].total })
      })
      return
    }

    let _sql = 'SELECT COUNT(*)::int AS total FROM files;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error('[getTotalFile]', err)
        return fail(res, 500, '数据库查询错误')
      }
      ok(res, { total: result.rows[0].total })
    })
  },
  // 获取 data 目录占用（总览页「本地文件」卡片用）
  getStorageSize: async (req, res) => {
    try {
      const now = Date.now()
      if (now - sizeCache.at > SIZE_CACHE_TTL) {
        const { bytes, count } = await calcDirSize(DATA_DIR)
        sizeCache = { at: now, bytes, count }
      }

      ok(res, {
        bytes: sizeCache.bytes,
        count: sizeCache.count,
        text: formatSize(sizeCache.bytes),
      })
    } catch (err) {
      console.error('[getStorageSize]', err)
      fail(res, 500, '目录统计失败')
    }
  },
}

export default fileController
