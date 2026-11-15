import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2'

/**
 * 生成密码哈希（argon2id）
 */
export const hashPassword = async (password) => argonHash(password)

/**
 * 校验密码
 */
export const checkPassword = async (user, password) => argonVerify(user.password, password)
