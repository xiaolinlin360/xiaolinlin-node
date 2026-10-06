import pool from '../model/db.js'
import { generateToken, verifyToken } from '../lib/jwt.js'
const serve = {
  //查询是否注册
  isRegistered: (req, res, next) => {
    let _sql = 'SELECT * FROM users WHERE id = $1;'
    pool.query(_sql, [req.body.id], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库查询错误' })
      }
      if (result.rows.length > 0) {
        console.log(result)
        res.status(200).json({ users: result.rows })
      } else {
        res.status(200).json({ registered: false })
      }
    })
  },
  //注册用户
  insertUser: (req, res, next) => {
    const data = req.body
    let _sql = 'INSERT INTO users (id, name,mail,password) VALUES ($1, $2,$3,$4) RETURNING *;'
    pool.query(_sql, [data.id, data.name, data.mail, data.password], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库插入错误' })
      } else {
        const user = result.rows[0]
        res.status(200).json({
          message: '用户注册成功',
          user: { id: user.id, name: user.name, mail: user.mail },
        })
      }
    })
  },
  //登录
  login: (req, res, next) => {
    const data = req.body
    let _sql = 'SELECT * FROM users WHERE name = $1 AND password = $2;'
    pool.query(_sql, [data.name, data.password], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库查询错误' })
      } else {
        if (result.rows.length > 0) {
          const user = result.rows[0]
          // 生成token
          const token = generateToken(user.id, user.name)
          res.status(200).json({ message: '登录成功', token: token })
        } else {
          res.status(401).json({ message: '登录失败' })
        }
      }
    })
  },
  //获取评论（全查询，无论是系统通知还是用户的评论）
  getComment: (req, res, next) => {
    let pageSize = Number(req.body.pageSize) || 10
    let pageNum = Number(req.body.pageNum) || 1
    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100
    let _sql = 'SELECT * FROM comment ORDER BY id LIMIT $1 OFFSET $2;'
    pool.query(_sql, [pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库查询错误' })
      } else {
        res.status(200).json({ data: result.rows, pageSize, pageNum })
      }
    })
  },
  //获取评论总数，总页码让前端自己算
  getTotalComment: (req, res, next) => {
    let _sql = 'SELECT COUNT(*) AS total FROM comment;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库查询错误' })
      } else {
        const total = Number(result.rows[0].total)
        res.status(200).json({ total: total })
      }
    })
  },
  //获取私信message
  getMessage: (req, res, next) => {
    // 用token中的id查询
    const user = req.user.id
    let pageSize = Number(req.body.pageSize) || 10
    let pageNum = Number(req.body.pageNum) || 1
    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100
    let _sql = 'SELECT * FROM message WHERE user_id = $1 ORDER BY id LIMIT $2 OFFSET $3;'
    pool.query(_sql, [user, pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库查询错误' })
      } else {
        res.status(200).json({ data: result.rows, pageSize, pageNum })
      }
    })
  },
  //获取私信总数
  getTotalMessage: (req, res, next) => {
    // 用token中的id查询
    const user = req.user.id
    let _sql = 'SELECT COUNT(*) AS total FROM message WHERE user_id = $1;'
    pool.query(_sql, [user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库查询错误' })
      } else {
        const total = Number(result.rows[0].total)
        res.status(200).json({ total: total })
      }
    })
  },
  //将某一条私信标记为已读
  readMessage: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    let _sql = 'UPDATE message SET isread = 1 WHERE id = $1 and user_id = $2;'
    pool.query(_sql, [data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库更新错误' })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ message: '私信标记为已读成功' })
        } else {
          res.status(404).json({ message: '私信不存在或已被标记' })
        }
      }
    })
  },
  //获取文章
  getArticle: (req, res, next) => {
    let _sql = 'SELECT * FROM article ORDER BY id LIMIT $1 OFFSET $2;'
    pool.query(_sql, [pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库查询错误' })
      } else {
        res.status(200).json({ data: result.rows, pageSize, pageNum })
      }
    })
  },
  //获取文章总数
  getTotalArticle: (req, res, next) => {
    let _sql = 'SELECT COUNT(*) AS total FROM article;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库查询错误' })
      } else {
        const total = Number(result.rows[0].total)
        res.status(200).json({ total: total })
      }
    })
  },
  //修改文章的发布状态
  updateArticleStatus: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    // 文章状态0：草稿，1：已发布
    if (data.is_complained !== 0 && data.is_complained !== 1) {
      return res.status(400).json({ message: '发布状态参数错误' })
    }
    let _sql = 'UPDATE article SET is_complained = $1 WHERE id = $2;'
    pool.query(_sql, [data.is_complained, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库更新错误' })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ message: '文章发布状态更新成功' })
        } else {
          res.status(404).json({ message: '文章不存在或已被更新' })
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
        res.status(500).json({ error: '数据库删除错误' })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ message: '文章删除成功' })
        } else {
          res.status(404).json({ message: '文章不存在或已被删除' })
        }
      }
    })
  },
  //获取分组(单个人的博客，只有单个人的分组所以直接拿到表)
  getSubset: (req, res, next) => {
    let data = []
    if (req.body?.classif) data.push(req.body?.classif)
    let _sql = 'SELECT * FROM subset WHERE classif = $1;'
    if (data.length === 0) _sql = 'SELECT * FROM subset;'
    pool.query(_sql, data, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库查询错误' })
      } else {
        res.status(200).json({ data: result.rows })
      }
    })
  },
}
export default serve
