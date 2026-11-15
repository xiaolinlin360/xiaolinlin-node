import pool from '../../model/db.js'
import { generateToken } from '../../lib/jwt.js'
import { ok, fail } from '../../lib/respond.js'
import { hashPassword, checkPassword } from '../../lib/password.js'

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
  login: async (req, res, next) => {
    const { name, password } = req.body
    if (!name || !password) return fail(res, 400, '用户名和密码不能为空')
    // 注意：不在 SQL 里比对密码，因为库里存的是哈希，取出来在 JS 里比
    let _sql = `
    SELECT id, name, email, phone, permission, imgurl, created_at, password
    FROM users WHERE name = $1;
  `
    try {
      const result = await pool.query(_sql, [name])
      if (result.rows.length === 0) {
        // 401：账号或密码不对。前端据此区分"登录失败"与"会话过期"
        return fail(res, 401, '账号或密码不正确')
      }
      const user = result.rows[0]
      if (!(await checkPassword(user, password))) {
        return fail(res, 401, '账号或密码不正确')
      }
      delete user.password
      const token = generateToken(user.id, user.name, user.permission)
      // token 放进 data，信封保持三件套，不再往顶层挂字段
      ok(res, { token, user }, '登录成功')
    } catch (err) {
      console.error('[login]', err)
      fail(res, 500, '数据库查询错误')
    }
  },
  //获取个人信息
  getProfile: (req, res) => {
    let _sql =
      'SELECT id, name, email, phone, permission, imgurl, created_at FROM users WHERE id = $1;'

    pool.query(_sql, [req.user.id], (err, result) => {
      if (err) {
        console.error('[getProfile]', err)
        return fail(res, 500, '数据库查询错误')
      }
      if (result.rows.length === 0) return fail(res, 404, '用户不存在')
      ok(res, result.rows[0])
    })
  },

  //修改个人信息（目前只改名称和头像）
  updateProfile: (req, res) => {
    const name = (req.body.name || '').trim()
    const imgurl = req.body.imgurl || ''

    if (!name) return fail(res, 400, '名称不能为空')
    if (name.length > 20) return fail(res, 400, '名称不能超过 20 个字')

    let _sql = `
      UPDATE users
      SET name = $1, imgurl = $2
      WHERE id = $3
      RETURNING id, name, email, phone, permission, imgurl, created_at;
    `

    pool.query(_sql, [name, imgurl, req.user.id], (err, result) => {
      if (err) {
        console.error('[updateProfile]', err)
        if (err.code === '23505') return fail(res, 409, '这个名称已被使用')
        return fail(res, 500, '数据库更新错误')
      }
      ok(res, result.rows[0], '保存成功')
    })
  },

  //获取用户列表（用户管理页）
  getUsers: (req, res) => {
    let _sql =
      'SELECT id, name, email, phone, permission, imgurl, created_at FROM users ORDER BY permission, created_at;'

    pool.query(_sql, (err, result) => {
      if (err) {
        console.error('[getUsers]', err)
        return fail(res, 500, '数据库查询错误')
      }
      ok(res, result.rows)
    })
  },

  //添加用户（仅 0 级能调）
  addUser: async (req, res) => {
    const name = (req.body.name || '').trim()
    const email = (req.body.email || '').trim()
    const password = req.body.password || ''
    const phone = req.body.phone || null
    const permission = Number(req.body.permission ?? 1)

    if (!name) return fail(res, 400, '名称不能为空')
    if (name.length > 20) return fail(res, 400, '名称不能超过 20 个字')
    if (!email) return fail(res, 400, '邮箱不能为空')
    if (!password) return fail(res, 400, '密码不能为空')

    // 存进库的是 argon2id 哈希（自带盐），不是明文
    const hash = await hashPassword(password)

    let _sql = `
      INSERT INTO users (name, email, phone, password, permission)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, email, phone, permission, created_at;
    `

    try {
      const result = await pool.query(_sql, [name, email, phone, hash, permission])
      ok(res, result.rows[0], '添加成功')
    } catch (err) {
      console.error('[addUser]', err)
      if (err.code === '23505') return fail(res, 409, '名称、邮箱或手机号已被使用')
      fail(res, 500, '数据库插入错误')
    }
  },

  //修改某个用户的权限（仅 0 级能调，且不能改自己）
  updatePermission: (req, res) => {
    const { id } = req.body
    const permission = Number(req.body.permission)

    if (!id) return fail(res, 400, '用户 id 不能为空')
    if (!Number.isInteger(permission) || permission < 0) {
      return fail(res, 400, '权限值必须是不小于 0 的整数')
    }
    if (id === req.user.id) return fail(res, 400, '不能修改自己的权限')

    let _sql = 'UPDATE users SET permission = $1 WHERE id = $2 RETURNING id, name, permission;'

    pool.query(_sql, [permission, id], (err, result) => {
      if (err) {
        console.error('[updatePermission]', err)
        return fail(res, 500, '数据库更新错误')
      }
      if (result.rowCount === 0) return fail(res, 404, '用户不存在')
      ok(res, result.rows[0], '权限已更新')
    })
  },
}

export default loginController
