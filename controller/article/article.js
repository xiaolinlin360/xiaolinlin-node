import pool from '../../model/db.js'
import { generateToken, verifyToken } from '../../lib/jwt.js'

const articleController = {
  //获取文章
  getArticle: (req, res, next) => {
    const data = req.body || {}
    const pageSize = Number(data.pageSize) || 10
    const pageNum = Number(data.pageNum) || 1
    let sql =
      'SELECT articles.*, users.name AS username_name FROM articles LEFT JOIN users ON articles.user_id = users.id '
    const params = []
    let paramIndex = 1
    // 合并条件判断（拦截 undefined, null, 空字符串）
    if (data.subset_id !== undefined && data.subset_id !== null && data.subset_id !== '') {
      sql += `WHERE articles.subset_id = $${paramIndex} `
      params.push(data.subset_id)
      paramIndex++
    }
    // 动态追加分页
    sql += `ORDER BY articles.id LIMIT $${paramIndex} OFFSET $${paramIndex + 1};`
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
  getTotalArticle: (req, res, next) => {
    let _sql = 'SELECT COUNT(*) AS total FROM articles;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        const total = Number(result.rows[0].total)
        res.status(200).json({ data: { total: total }, code: 200 })
      }
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
}

export default articleController
