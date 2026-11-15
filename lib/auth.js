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
