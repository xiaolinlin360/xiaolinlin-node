import jwt from 'jsonwebtoken'
import { JWT_SECRET, JWT_EXPIRES } from '../config/config.js'

//生成一个token
export const generateToken = (userId, name) => {
  return jwt.sign(
    { userId: userId, name: name }, // payload：想放进 token 的数据
    JWT_SECRET, // 密钥
    { expiresIn: JWT_EXPIRES } // 有效期
  )
}
//验证token
//验证token是否有效
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}
