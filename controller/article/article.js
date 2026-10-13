import pool from '../../model/db.js'
import { generateToken, verifyToken } from '../../lib/jwt.js'

const articleController = {
  //获取文章
  getArticle: (req, res, next) => {
    const data = req.body
    const pageSize = data.pageSize || 10
    const pageNum = data.pageNum || 1
    let _sql = 'SELECT * FROM article ORDER BY id LIMIT $1 OFFSET $2;'
    pool.query(_sql, [pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: { articles: result.rows, pageSize, pageNum }, code: 200 })
      }
    })
  },
  //获取文章总数
  getTotalArticle: (req, res, next) => {
    let _sql = 'SELECT COUNT(*) AS total FROM article;'
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
    const user = req.user.id
    // 文章状态0=草稿，1=已发布，2=审核中，3=已删除
    if (data.state !== 0 && data.state !== 1 && data.state !== 2 && data.state !== 3) {
      return res.status(400).json({ data: { message: '发布状态参数错误' }, code: 400 })
    }
    let _sql = 'UPDATE article SET is_complained = $1 WHERE id = $2;'
    pool.query(_sql, [data.is_complained, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库更新错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '文章发布状态更新成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '文章不存在或已被更新' }, code: 404 })
        }
      }
    })
  },
  //删除文章
  deleteArticle: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    let _sql = 'DELETE FROM article WHERE id = $1 and user_id = $2;'
    pool.query(_sql, [data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库删除错误' }, code: 500 })
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
