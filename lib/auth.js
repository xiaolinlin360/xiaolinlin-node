import { verifyToken } from '../lib/jwt.js'
import { fail } from './respond.js'

export const auth = (req, res, next) => {
  const authHeader = req.headers.authorization
  //如果没有授权头，或者不是Bearer开头，返回401错误
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, 401, '未授权')
  }
  // 从授权头中提取 token
  const token = authHeader.slice(7)
  const decoded = verifyToken(token)
  if (!decoded) {
    return fail(res, 401, '无效的 token')
  }

  req.user = decoded
  next()
}

/**
 * 危险操作守卫：只有 0 级（最高权限）能通过。
 * 用法：app.post('/xxx', auth, requireAdmin, handler)
 */
export const requireAdmin = (req, res, next) => {
  if (req.user.permission !== 0) {
    return fail(res, 403, '只有最高权限才能操作')
  }
  next()
}

/**
 * 可选登录：带了有效 token 就把用户挂到 req.user，没带也放行。
 * 给前后台复用的「查」接口用：登录了是后台视角，没登录就是访客视角。
 */
export const authOptional = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const decoded = verifyToken(authHeader.slice(7))
    if (decoded) req.user = decoded
  }
  next()
}
