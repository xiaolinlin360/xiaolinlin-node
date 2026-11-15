import pool from '../../model/db.js'
import { validateGalleryBody } from './utils/validateGalleryBody.js'
import { attachPhotos } from './utils/attachPhotos.js'

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
      COALESCE(f.urls, '[]'::json) AS gallery_urls,
      COALESCE(f.cnt, 0) AS photo_count
    FROM paged g
    LEFT JOIN LATERAL (
      SELECT json_agg(f_sub.url ORDER BY f_sub.created_at) AS urls,
             COUNT(*)::int AS cnt
      FROM files f_sub
      WHERE f_sub.gallery_id = g.id
    ) f ON TRUE
    ORDER BY g.created_at DESC
    `

    // 传入三个参数：pageSize, offset, subset_id
    const params = [pageSize, (pageNum - 1) * pageSize, subset_id]

    pool.query(sql, params, (err, result) => {
      if (err) {
        console.error('[getGallery] SQL Error:', err)
        return res.status(500).json({ code: 500, message: '数据库查询错误', data: null })
      }
      res.status(200).json({
        code: 200,
        message: 'ok',
        data: { gallerys: result.rows, pageSize, pageNum },
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
      if (err) return res.status(500).json({ code: 500, message: '数据库查询错误', data: null })
      res.status(200).json({ code: 200, message: 'ok', data: { total: result.rows[0].total } })
    })
  },

  // 获取图库详情（编辑回显：带照片明细）
  getGalleryDetail: (req, res) => {
    const { id } = req.body
    if (!id) return res.status(400).json({ code: 400, message: '图库 id 不能为空', data: null })

    const _sql = `
      SELECT
        g.*,
        COALESCE(tp.photos, '[]'::json) AS photos
      FROM gallerys g
      LEFT JOIN LATERAL (
        SELECT json_agg(
                 json_build_object(
                   'id',        f.id,
                   'file_name', f.file_name,
                   'url',       f.url,
                   'size',      f.size,
                   'type',      f.type
                 ) ORDER BY f.created_at
               ) AS photos
        FROM files f
        WHERE f.gallery_id = g.id
      ) tp ON TRUE
      WHERE g.id = $1;
    `

    pool.query(_sql, [id], (err, result) => {
      if (err) {
        console.error('[getGalleryDetail]', err)
        return res.status(500).json({ code: 500, message: '数据库查询错误', data: null })
      }
      if (result.rows.length === 0) {
        return res.status(404).json({ code: 404, message: '图库不存在', data: null })
      }
      res.status(200).json({ code: 200, message: 'ok', data: result.rows[0] })
    })
  },

  // 新建图库（照片 id 和表单一起提交，在本事务里挂上去）
  insertGallery: async (req, res) => {
    const errMsg = validateGalleryBody(req.body)
    if (errMsg) return res.status(400).json({ code: 400, message: errMsg, data: null })

    const { title, subset_id } = req.body
    const photo_ids = Array.isArray(req.body.photo_ids) ? req.body.photo_ids.filter(Boolean) : []

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query(
        'INSERT INTO gallerys (title, subset_id) VALUES ($1, $2) RETURNING id;',
        [title.trim(), subset_id]
      )
      const galleryId = result.rows[0].id

      await attachPhotos(client, galleryId, photo_ids)
      await client.query('COMMIT')

      res.status(200).json({ code: 200, message: '图库创建成功', data: { id: galleryId } })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('[insertGallery]', err)
      if (err.code === '23503') {
        return res.status(400).json({ code: 400, message: '分组不存在', data: null })
      }
      if (err.code === '22P02') {
        return res.status(400).json({ code: 400, message: '照片 id 格式不正确', data: null })
      }
      res.status(500).json({ code: 500, message: '数据库插入错误', data: null })
    } finally {
      client.release()
    }
  },

  // 编辑图库
  updateGallery: async (req, res) => {
    const { id } = req.body
    if (!id) return res.status(400).json({ code: 400, message: '图库 id 不能为空', data: null })

    const errMsg = validateGalleryBody(req.body)
    if (errMsg) return res.status(400).json({ code: 400, message: errMsg, data: null })

    const { title, subset_id } = req.body
    const photo_ids = Array.isArray(req.body.photo_ids) ? req.body.photo_ids.filter(Boolean) : []

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query(
        'UPDATE gallerys SET title = $1, subset_id = $2 WHERE id = $3 RETURNING id;',
        [title.trim(), subset_id, id]
      )
      if (result.rowCount === 0) {
        await client.query('ROLLBACK')
        return res.status(404).json({ code: 404, message: '图库不存在', data: null })
      }

      await attachPhotos(client, id, photo_ids)
      await client.query('COMMIT')

      res.status(200).json({ code: 200, message: '图库更新成功', data: { id } })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('[updateGallery]', err)
      if (err.code === '23503') {
        return res.status(400).json({ code: 400, message: '分组不存在', data: null })
      }
      if (err.code === '22P02') {
        return res.status(400).json({ code: 400, message: '照片 id 格式不正确', data: null })
      }
      res.status(500).json({ code: 500, message: '数据库更新错误', data: null })
    } finally {
      client.release()
    }
  },

  // 删除图库（照片会因外键 ON DELETE SET NULL 保留在「本地文件」里）
  deleteGallery: (req, res) => {
    const { id } = req.body
    if (!id) return res.status(400).json({ code: 400, message: '图库 id 不能为空', data: null })

    pool.query('DELETE FROM gallerys WHERE id = $1 RETURNING id;', [id], (err, result) => {
      if (err) {
        console.error('[deleteGallery]', err)
        if (err.code === '23503') {
          return res
            .status(400)
            .json({ code: 400, message: '该图库下还有照片，不能删除', data: null })
        }
        return res.status(500).json({ code: 500, message: '数据库删除错误', data: null })
      }
      if (result.rowCount === 0) {
        return res.status(404).json({ code: 404, message: '图库不存在或已被删除', data: null })
      }
      res.status(200).json({ code: 200, message: '图库删除成功', data: null })
    })
  },
}

export default galleryController
