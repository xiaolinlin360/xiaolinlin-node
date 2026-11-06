import pool from '../../model/db.js'

const galleryController = {
  // 获取画廊列表
  getGallery: (req, res, next) => {
    const data = req.body || {}

    let pageSize = Number(data.pageSize) || 10
    let pageNum = Number(data.pageNum) || 1
    const subset_id = data.subset_id || null // 获取查询条件，没有则传 null

    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100

    const sql = `
    WITH paged AS (
      SELECT *
      FROM gallerys
      WHERE ($3::uuid IS NULL OR subset_id = $3::uuid) 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    )
    SELECT
      g.id,
      g.title,
      g.subset_id, -- 返回该字段给前端
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

    // 传入三个参数：pageSize, offset, subaet_id
    const params = [pageSize, (pageNum - 1) * pageSize, subset_id]

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
    const data = req.body || {}
    const subset_id = data.subset_id || null

    const _sql = `
      SELECT COUNT(*)::int AS total 
      FROM gallerys 
      WHERE ($1::uuid IS NULL OR subset_id = $1::uuid)
    `

    pool.query(_sql, [subset_id], (err, result) => {
      if (err) return res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
      res.status(200).json({ data: { total: result.rows[0].total }, code: 200 })
    })
  },

  // 删除画廊 (保持不变)
  deleteGallery: (req, res, next) => {
    // ... 原代码保持不变 ...
  },
}

export default galleryController
