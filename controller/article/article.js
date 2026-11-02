import pool from '../../model/db.js'
import { generateToken, verifyToken } from '../../lib/jwt.js'

const articleController = {
  //获取文章
  getArticle: (req, res, next) => {
    const data = req.body || {}

    let pageSize = Number(data.pageSize) || 10
    let pageNum = Number(data.pageNum) || 1
    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100

    const subsetId = data.subset_id && data.subset_id !== '' ? data.subset_id : null

    const sql = `
    WITH paged AS (
      SELECT *
      FROM articles
      WHERE ($3::uuid IS NULL OR subset_id = $3::uuid)
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    )
    SELECT
      a.id,
      a.state,
      a.title,
      a.content,
      a.user_id,
      f.url AS url,               -- 通过 cover_file_id 拿到的封面 URL
      COALESCE(tf.file_urls, '[]'::json) AS file_urls, -- 聚合的文件ID数组或URL数组
      a.introduce,
      a.subset_id,
      a.created_at,
      u.name AS username_name,
      COALESCE(tl.labels, '[]'::json) AS labels
    FROM paged a
    -- 1. 关联封面文件
    LEFT JOIN files f ON f.id = a.cover_file_id  
    -- 2. 关联用户
    LEFT JOIN users u ON u.id = a.user_id        
    -- 3. 聚合该文章关联的所有文件 (通过 files.article_id)
    LEFT JOIN LATERAL (
      SELECT json_agg(f_sub.id ORDER BY f_sub.created_at) AS file_urls
      FROM files f_sub
      WHERE f_sub.article_id = a.id
    ) tf ON TRUE
    -- 4. 聚合标签
    LEFT JOIN LATERAL (
      SELECT json_agg(
               json_build_object('id', l.id, 'label_name', l.label_name)
               ORDER BY l.id
             ) AS labels
      FROM article_label al
      JOIN labels l ON l.id = al.label_id        
      WHERE al.article_id = a.id
    ) tl ON TRUE
    ORDER BY a.created_at DESC
  `

    const params = [pageSize, (pageNum - 1) * pageSize, subsetId]

    pool.query(sql, params, (err, result) => {
      if (err) {
        console.error('SQL Error:', err)
        return res.status(500).json({
          data: { message: '数据库查询错误' },
          code: 500,
        })
      }
      res.status(200).json({
        data: { articles: result.rows, pageSize, pageNum },
        code: 200,
      })
    })
  },
  //获取文章总数
  getTotalArticle: (req, res) => {
    const subset_id = req.body?.subset_id
    const _sql = subset_id
      ? 'SELECT COUNT(*)::int AS total FROM articles WHERE subset_id = $1;'
      : 'SELECT COUNT(*)::int AS total FROM articles;'
    pool.query(_sql, subset_id ? [subset_id] : [], (err, result) => {
      if (err) return res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
      res.status(200).json({ data: { total: result.rows[0].total }, code: 200 })
    })
  },
  //修改文章的发布状态
  updateArticleStatus: (req, res, next) => {
    const data = req.body
    const user = req.user.id // 当前登录用户id
    // 文章状态state=true=已发布，false=草稿
    if (data.state === undefined) {
      return res.status(400).json({ code: 400, message: '发布状态参数错误', data: null })
    }
    let _sql = 'UPDATE articles SET state = $1 WHERE id = $2 AND user_id = $3;'
    pool.query(_sql, [data.state, data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库更新错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '文章发布状态更新成功' }, code: 200 })
        } else {
          res.status(400).json({ data: { message: '文章不存在或已被更新' }, code: 400 })
        }
      }
    })
  },
  //删除文章
  deleteArticle: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    // 删除文章时，需要先删除文章的标签，再删除文章
    let _sql = `
      WITH target_article AS (
        SELECT id FROM articles WHERE id = $1 AND user_id = $2
      ), deleted_labels AS (
        DELETE FROM article_label WHERE article_id IN (SELECT id FROM target_article)
      )
      DELETE FROM articles WHERE id IN (SELECT id FROM target_article);
    `
    pool.query(_sql, [data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库删除错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '文章删除成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '文章不存在或已被删除' }, code: 404 })
        }
      }
    })
  },

  //发布文章之后再做
}

export default articleController
