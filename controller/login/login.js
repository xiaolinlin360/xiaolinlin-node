import pool from '../../model/db.js'
import { generateToken } from '../../lib/jwt.js'
import { ok, fail } from '../../lib/respond.js'
import { hashPassword, checkPassword } from '../../lib/password.js'
import { createCode, verifyCode, removeCode, sendCode } from '../../lib/verifyCode.js'

/** 把邮箱/手机打码后再返回给前端显示，如 ab***@blog.com / 861***8000 */
const maskTarget = (target) => {
  if (target.includes('@')) {
    const [name, domain] = target.split('@')
    return `${name.slice(0, 2)}***@${domain}`
  }
  return `${target.slice(0, 3)}***${target.slice(-4)}`
}

/** 校验 channel + target（要绑定的新邮箱 / 新手机号），返回错误文案或 null */
const checkTarget = (channel, target) => {
  if (channel === 'email') {
    if (!/^\S+@\S+\.\S+$/.test(target)) return '邮箱格式不正确'
    return null
  }
  if (channel === 'phone') {
    if (!/^86\d{11}$/.test(target)) return '手机号格式：86 + 11 位，例如 8613800138000'
    return null
  }
  return 'channel 只能是 email 或 phone'
}

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
  //获取个人信息：带 token 就是自己的；没带就默认站点主人（前台首页要用）
  getProfile: (req, res) => {
    const _sql = `
      SELECT id, name, email, phone, permission, imgurl, created_at
      FROM users
      WHERE id = COALESCE($1::uuid, (SELECT id FROM users WHERE permission = 0 ORDER BY created_at LIMIT 1));
    `

    pool.query(_sql, [req.user?.id ?? null], (err, result) => {
      if (err) {
        console.error('[getProfile]', err)
        return fail(res, 500, '数据库查询错误')
      }
      if (result.rows.length === 0) return fail(res, 404, '用户不存在')

      const profile = result.rows[0]
      // 游客只看名字和头像，手机号、邮箱别往外发
      if (!req.user) {
        delete profile.email
        delete profile.phone
      }
      ok(res, profile)
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

  //方式一：用原密码改密码
  updatePassword: async (req, res) => {
    const oldPassword = req.body.oldPassword || ''
    const newPassword = req.body.newPassword || ''

    if (!oldPassword) return fail(res, 400, '请输入原密码')
    if (newPassword.length < 6) return fail(res, 400, '新密码至少 6 位')

    try {
      const result = await pool.query('SELECT password FROM users WHERE id = $1;', [req.user.id])
      if (!(await checkPassword(result.rows[0], oldPassword))) {
        return fail(res, 400, '原密码不正确')
      }

      const hash = await hashPassword(newPassword)
      await pool.query('UPDATE users SET password = $1 WHERE id = $2;', [hash, req.user.id])
      ok(res, null, '密码已修改')
    } catch (err) {
      console.error('[updatePassword]', err)
      fail(res, 500, '数据库更新错误')
    }
  },

  //方式二/三：先发验证码（发到当前登录用户自己的邮箱或手机）
  sendCode: async (req, res) => {
    const channel = req.body.channel
    if (channel !== 'email' && channel !== 'phone') {
      return fail(res, 400, 'channel 只能是 email 或 phone')
    }

    try {
      const result = await pool.query('SELECT email, phone FROM users WHERE id = $1;', [
        req.user.id,
      ])
      const user = result.rows[0]
      const target = channel === 'email' ? user.email : user.phone

      if (!target) return fail(res, 400, channel === 'email' ? '你还没绑定邮箱' : '你还没绑定手机号')

      const code = createCode(req.user.id, channel, target)
      await sendCode(channel, target, code)

      // 本地调试用：NODE_ENV 不是 production 时把验证码一起返回，
      // 这样不接第三方也能在浏览器里走通。接好邮件/短信后删掉 code 字段即可。
      const isDev = process.env.NODE_ENV !== 'production'
      ok(
        res,
        isDev ? { target: maskTarget(target), code } : { target: maskTarget(target) },
        '验证码已发送'
      )
    } catch (err) {
      console.error('[sendCode]', err)
      fail(res, 500, '验证码发送失败')
    }
  },

  //方式二/三：用验证码重置密码
  resetPasswordByCode: async (req, res) => {
    const { channel, code } = req.body
    const newPassword = req.body.newPassword || ''

    if (channel !== 'email' && channel !== 'phone') {
      return fail(res, 400, 'channel 只能是 email 或 phone')
    }
    if (!code) return fail(res, 400, '请输入验证码')
    if (newPassword.length < 6) return fail(res, 400, '新密码至少 6 位')

    try {
      // 密码重置用的是「当前已绑定的邮箱/手机」，所以要先把 target 查出来
      const result = await pool.query('SELECT email, phone FROM users WHERE id = $1;', [
        req.user.id,
      ])
      const target =
        channel === 'email' ? result.rows[0].email : result.rows[0].phone

      if (!verifyCode(req.user.id, channel, target, code)) {
        return fail(res, 400, '验证码不正确或已过期')
      }

      const hash = await hashPassword(newPassword)
      await pool.query('UPDATE users SET password = $1 WHERE id = $2;', [hash, req.user.id])
      removeCode(req.user.id, channel, target) // 用完即作废
      ok(res, null, '密码已重置')
    } catch (err) {
      console.error('[resetPasswordByCode]', err)
      fail(res, 500, '数据库更新错误')
    }
  },

  //发送「更换绑定」的验证码：发到你想绑定的新邮箱/新手机
  sendContactCode: async (req, res) => {
    const { channel } = req.body
    const target = (req.body.target || '').trim()

    const error = checkTarget(channel, target)
    if (error) return fail(res, 400, error)

    try {
      const code = createCode(req.user.id, channel, target)
      await sendCode(channel, target, code, '更换绑定')

      const isDev = process.env.NODE_ENV !== 'production'
      ok(
        res,
        isDev ? { target: maskTarget(target), code } : { target: maskTarget(target) },
        '验证码已发送'
      )
    } catch (err) {
      console.error('[sendContactCode]', err)
      fail(res, 500, '验证码发送失败')
    }
  },

  //更换邮箱 / 手机号（验证码必须是发给这个新地址的）
  updateContact: async (req, res) => {
    const { channel, code } = req.body
    const target = (req.body.target || '').trim()

    const error = checkTarget(channel, target)
    if (error) return fail(res, 400, error)
    if (!code) return fail(res, 400, '请输入验证码')

    if (!verifyCode(req.user.id, channel, target, code)) {
      return fail(res, 400, '验证码不正确或已过期')
    }

    try {
      const field = channel === 'email' ? 'email' : 'phone'
      await pool.query(`UPDATE users SET ${field} = $1 WHERE id = $2;`, [target, req.user.id])
      removeCode(req.user.id, channel, target)

      const result = await pool.query('SELECT email, phone FROM users WHERE id = $1;', [
        req.user.id,
      ])
      ok(res, result.rows[0], channel === 'email' ? '邮箱已更换' : '手机号已更换')
    } catch (err) {
      console.error('[updateContact]', err)
      if (err.code === '23505') {
        return fail(res, 409, channel === 'email' ? '这个邮箱已被占用' : '这个手机号已被占用')
      }
      fail(res, 500, '数据库更新错误')
    }
  },
}

export default loginController
