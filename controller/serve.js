import pool from '../model/db.js'
import { generateToken, verifyToken } from '../lib/jwt.js'
const serve = {
  //查询是否注册
  isRegistered: (req, res, next) => {
    let _sql = 'SELECT * FROM users WHERE id = $1;'
    pool.query(_sql, [req.body.userId], (err, result) => {
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
          const token = generateToken(user.id, user.name)
          res.status(200).json({ message: '登录成功', token: token })
        } else {
          res.status(401).json({ message: '登录失败' })
        }
      }
    })
  },
  //获取评论
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
}
export default serve
