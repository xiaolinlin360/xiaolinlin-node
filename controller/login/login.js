import pool from '../../model/db.js'
import { generateToken, verifyToken } from '../../lib/jwt.js'

//查询是否注册
const loginController = {
  isRegistered: (req, res, next) => {
    let _sql = 'SELECT * FROM users WHERE id = $1;'
    pool.query(_sql, [req.body.id], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      }
      if (result.rows.length > 0) {
        console.log(result)
        res.status(200).json({ data: { registered: true, users: result.rows }, code: 200 })
      } else {
        res.status(200).json({ data: { registered: false }, code: 200 })
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
        res.status(500).json({ data: { error: '数据库插入错误' }, code: 500 })
      } else {
        const user = result.rows[0]
        res.status(200).json({
          message: '用户注册成功',
          data: { id: user.id, name: user.name, mail: user.mail },
          code: 200,
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
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        if (result.rows.length > 0) {
          const user = result.rows[0]
          // 生成token
          const token = generateToken(user.id, user.name)
          res
            .status(200)
            .json({ data: { message: '登录成功', user: user }, token: token, code: 200 })
        } else {
          res.status(401).json({ data: { message: '登录失败' }, code: 401 })
        }
      }
    })
  },
}

export default loginController
