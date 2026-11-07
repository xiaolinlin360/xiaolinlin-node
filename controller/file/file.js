import pool from '../../model/db.js'
import crypto from 'node:crypto' // 引入 crypto 兜底

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
        return res.status(200).json({
          data: { files: [], pageSize, pageNum },
          code: 200,
        })
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
        console.error(err)
        res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({
          data: { files: result.rows, pageSize, pageNum },
          code: 200,
        })
      }
    })
  },
  //获取文件总数（支持与 getFile 相同的 id 过滤，保证分页器总数一致）
  getTotalFile: (req, res, next) => {
    let fileUrls = req.body?.file_urls

    // 与 getFile 完全一致的过滤口径：单值转数组、空数组直接返回 0
    if (fileUrls !== undefined && fileUrls !== null && fileUrls !== '') {
      if (!Array.isArray(fileUrls)) fileUrls = [fileUrls]
      if (fileUrls.length === 0) {
        return res.status(200).json({ data: { total: 0 }, code: 200 })
      }
      let _sql = 'SELECT COUNT(*)::int AS total FROM files WHERE id = ANY($1);'
      pool.query(_sql, [fileUrls], (err, result) => {
        if (err) {
          console.error(err)
          res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
        } else {
          res.status(200).json({ data: { total: result.rows[0].total }, code: 200 })
        }
      })
      return
    }

    let _sql = 'SELECT COUNT(*)::int AS total FROM files;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: { total: result.rows[0].total }, code: 200 })
      }
    })
  },
  // 上传文件
  uploadFile: async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ data: { message: '未接收到文件' }, code: 400 })
    }

    // 1. 获取自动生成的 id 和文件信息
    const id = crypto.randomUUID()
    const { filename, mimetype, size } = req.file

    // 2. 获取可选参数与用户 ID (user_id 请根据你的鉴权中间件调整，如 req.user.id)
    const { article_id, gallery_id, user_id } = req.body

    // 3. 拼接可直接访问的 URL (自动处理中文/空格编码)
    const url = `${req.protocol}://${req.get('host')}/data/${id}/${encodeURIComponent(filename)}`

    // 4. 插入数据库 (利用 RETURNING * 直接拿到完整数据返回给前端)
    const _sql = `
      INSERT INTO files (id, user_id, file_name, type, size, url, article_id, gallery_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `
    const params = [
      id,
      user_id || null,
      filename,
      mimetype,
      size, // 截图里 size 是 text，传数字过去 PG 会自动转
      url,
      article_id || null,
      gallery_id || null,
    ]

    try {
      const result = await pool.query(_sql, params)
      res.status(200).json({ data: result.rows[0], code: 200 })
    } catch (err) {
      console.error('文件上传入库失败:', err)
      res.status(500).json({ data: { message: '数据库插入错误' }, code: 500 })
    }
  },
  //文件删除和修改后面在做吧
  //移动文件到不同的分类（修改subset id）
  //后续在考虑是否需要这个功能
  // moveFile: (req, res, next) => {
  //   const data = req.body
  //   let _sql = 'UPDATE files SET subset_id = $1 WHERE id = $2;'
  //   pool.query(_sql, [data.subset_id, data.id], (err, result) => {
  //     if (err) {
  //       console.error(err)
  //       res.status(500).json({ data: { error: '数据库更新错误' }, code: 500 })
  //     } else {
  //       if (result.rowCount > 0) {
  //         res.status(200).json({ data: { message: '文件移动成功' }, code: 200 })
  //       } else {
  //         res.status(404).json({ data: { message: '文件不存在或已被移动' }, code: 404 })
  //       }
  //     }
  //   })
  // },
}

export default fileController
