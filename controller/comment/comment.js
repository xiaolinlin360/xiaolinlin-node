import pool from '../../model/db.js'
import { generateToken, verifyToken } from '../../lib/jwt.js'

const commentController = {
  //获取评论（全查询，无论是系统通知还是用户的评论）
  getComment: (req, res, next) => {
    let pageSize = Number(req.body.pageSize) || 10
    let pageNum = Number(req.body.pageNum) || 1

    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100

    // 使用 JOIN 关联 users 表获取头像，并按 created_at 倒序排列（最新在前）
    let _sql = `
        SELECT 
            c.id, 
            c.article_id, 
            c.user_id, 
            c.content, 
            c.is_complained, 
            c.created_at, 
            c.updated_at,
            u.name, 
            u.imgurl 
        FROM comments c
        LEFT JOIN users u ON u.id = c.user_id
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT $1 OFFSET $2
    `

    pool.query(_sql, [pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({
          data: {
            comments: result.rows,
            pageSize,
            pageNum,
          },
          code: 200,
        })
      }
    })
  },
  //获取评论总数，总页码让前端自己算
  getTotalComment: (req, res, next) => {
    let _sql = 'SELECT COUNT(*) AS total FROM comments;'
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
  //删除评论
  deleteComment: (req, res, next) => {
    let _sql = 'DELETE FROM comments WHERE id = $1;'
    pool.query(_sql, [req.body.id], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: null, error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: { message: '评论删除成功', error: null }, code: 200 })
      }
    })
  },
}

export default commentController
