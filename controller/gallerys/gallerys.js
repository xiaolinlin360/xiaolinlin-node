import pool from '../../model/db.js'

const galleryController = {
  // 获取画廊列表
  getGallery: (req, res, next) => {
    const data = req.body || {}

    let pageSize = Number(data.pageSize) || 10
    let pageNum = Number(data.pageNum) || 1
    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100

    const sql = `
    WITH paged AS (
      SELECT *
      FROM gallerys
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    )
    SELECT
      g.id,
      g.title,
      g.created_at,
      COALESCE(f.urls, '[]'::json) AS gallery_urls
    FROM paged g
    LEFT JOIN LATERAL (
      SELECT json_agg(f_sub.url ORDER BY f_sub.created_at) AS urls
      FROM files f_sub
      WHERE f_sub.gallery_id = g.id
    ) f ON TRUE
    ORDER BY g.created_at DESC
    `

    const params = [pageSize, (pageNum - 1) * pageSize]

    pool.query(sql, params, (err, result) => {
      if (err) {
        console.error('SQL Error:', err)
        return res.status(500).json({
          data: { message: '数据库查询错误' },
          code: 500,
        })
      }
      res.status(200).json({
        data: { gallerys: result.rows, pageSize, pageNum },
        code: 200,
      })
    })
  },

  // 获取画廊总数
  getTotalGallery: (req, res) => {
    const _sql = 'SELECT COUNT(*)::int AS total FROM gallerys;'

    pool.query(_sql, [], (err, result) => {
      if (err) return res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
      res.status(200).json({ data: { total: result.rows[0].total }, code: 200 })
    })
  },

  // 删除画廊
  deleteGallery: (req, res, next) => {
    const data = req.body
    const user = req.user.id // 当前登录用户id，用于检查画廊是否属于当前用户
    // 删除画廊时，需要先删除该画廊下关联的 files 文件记录，再删除画廊本身
    let _sql = `
      WITH target_gallery AS (
        SELECT id FROM gallerys WHERE id = $1
      ), deleted_files AS (
        DELETE FROM files WHERE gallery_id IN (SELECT id FROM target_gallery)
      )
      DELETE FROM gallerys WHERE id IN (SELECT id FROM target_gallery);
    `

    pool.query(_sql, [data.id], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库删除错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '画廊删除成功' }, code: 200 })
        } else {
          res.status(400).json({ data: { message: '画廊不存在或已被删除' }, code: 400 })
        }
      }
    })
  },
}

export default galleryController
