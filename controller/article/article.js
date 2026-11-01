import pool from '../../model/db.js'
import { generateToken, verifyToken } from '../../lib/jwt.js'

const articleController = {
  //获取文章
  getArticle: (req, res, next) => {
    const data = req.body || {}
    let pageSize = Number(req.body.pageSize) || 10
    let pageNum = Number(req.body.pageNum) || 1
    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100

    // 💡 核心修改：使用 LATERAL 关联标签表，并把标签聚合成 JSON 数组
    let sql = `
    SELECT 
      articles.*, 
      users.name AS username_name,
      COALESCE(t.labels, '[]') AS labels
    FROM articles 
    LEFT JOIN users ON articles.user_id = users.id 
    LEFT JOIN LATERAL (
      SELECT JSON_AGG(JSON_BUILD_OBJECT('id', l.id, 'label_name', l.label_name)) AS labels
      FROM article_label al
      JOIN labels l ON al.label_id = l.id
      WHERE al.article_id = articles.id
    ) t ON true
  `
    const params = []
    let paramIndex = 1
    // 原有条件判断
    if (data.subset_id !== undefined && data.subset_id !== null && data.subset_id !== '') {
      sql += `WHERE articles.subset_id = $${paramIndex} `
      params.push(data.subset_id)
      paramIndex++
    }
    // 动态追加分页（原有逻辑完全不需要动）
    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1};`
    params.push(pageSize, (pageNum - 1) * pageSize)
    pool.query(sql, params, (err, result) => {
      if (err) {
        console.error(err)
        return res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
      }
      res.status(200).json({ data: { articles: result.rows, pageSize, pageNum }, code: 200 })
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
      return res.status(400).json({ data: { message: '发布状态参数错误' }, code: 400 })
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
