/**
 * 统一响应信封 —— 前后端唯一契约。
 *
 *   { code, message, data }
 */

// 成功响应：默认 200，message 默认 'ok'
export const ok = (res, data = null, message = 'ok') =>
  res.status(200).json({ code: 200, message, data })

// 失败响应：code 自动等于 status
export const fail = (res, status, message, data = null) =>
  res.status(status).json({ code: status, message, data })
