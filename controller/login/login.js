import pool from '../../model/db.js'
import { generateToken } from '../../lib/jwt.js'
import { ok, fail } from '../../lib/respond.js'

//查询是否注册
const loginController = {
  isRegistered: (req, res, next) => {
    let _sql = 'SELECT id, name, email FROM users WHERE id = $1;'
    pool.query(_sql, [req.body.id], (err, result) => {
      if (err) {
        console.error('[isRegistered]', err)
        return fail(res, 500, '数据库查询错误')
      }
      if (result.rows.length > 0) {
        ok(res, { registered: true, users: result.rows })
      } else {
        ok(res, { registered: false })
      }
    })
  },
  //注册用户
  insertUser: (req, res, next) => {
    const data = req.body
    let _sql = 'INSERT INTO users (id, name,email,created_at) VALUES ($1, $2,$3,$4) RETURNING *;'
    pool.query(_sql, [data.id, data.name, data.email, data.created_at], (err, result) => {
      if (err) {
        console.error('[insertUser]', err)
        return fail(res, 500, '数据库插入错误')
      }
      const user = result.rows[0]
      ok(
        res,
        { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
        '用户注册成功'
      )
    })
  },
  //登录
  login: (req, res, next) => {
    const data = req.body
    let _sql =
      'SELECT id, name, email, phone, permission, imgurl, created_at FROM users WHERE name = $1 AND password = $2;'
    pool.query(_sql, [data.name, data.password], (err, result) => {
      if (err) {
        console.error('[login]', err)
        return fail(res, 500, '数据库查询错误')
      }
      if (result.rows.length === 0) {
        // 401：账号或密码不对。前端据此区分"登录失败"与"会话过期"
        return fail(res, 401, '账号或密码不正确')
      }

      const user = result.rows[0]
      const token = generateToken(user.id, user.name, user.permission)
      // token 放进 data，信封保持三件套，不再往顶层挂字段
      ok(res, { token, user }, '登录成功')
    })
  },
}

export default loginController
