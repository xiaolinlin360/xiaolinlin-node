/**
 * 验证码：先存在内存 Map 里。
 *
 * 为什么够用：验证码只活 5 分钟，重启就失效也无所谓；项目是单进程的。
 * 以后要上多实例 / 需要防刷，再换成 Redis。
 */
const codes = new Map() // key: `${userId}:${channel}:${target}` → { code, expiresAt }

const TTL = 5 * 60 * 1000 // 5 分钟

// key 里必须带 target：
// 否则「给旧邮箱发的码」也能拿去绑定一个新邮箱，等于没验证所有权
const key = (userId, channel, target) => `${userId}:${channel}:${target}`

/** 生成 6 位数字验证码并存起来 */
export const createCode = (userId, channel, target) => {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  codes.set(key(userId, channel, target), { code, expiresAt: Date.now() + TTL })
  return code
}

/** 校验：存在、没过期、数字对得上 */
export const verifyCode = (userId, channel, target, code) => {
  const item = codes.get(key(userId, channel, target))
  if (!item) return false

  if (item.expiresAt < Date.now()) {
    codes.delete(key(userId, channel, target))
    return false
  }

  return item.code === code
}

/** 用完之后立刻作废，防止同一个码重复使用 */
export const removeCode = (userId, channel, target) => codes.delete(key(userId, channel, target))

/**
 * 真正把验证码发出去（调用 spug.cc 的推送接口）。
 * 发送失败会抛错，调用方据此返回 500，不会出现「提示已发送但用户没收到」。
 */
export const sendCode = async (channel, to, code, scene = '更换绑定或重置密码或登录') => {
  const number = 5
  const url =
    channel === 'email'
      ? 'https://push.spug.cc/mail/XlxGd8Ja3gr2bn0R'
      : 'https://push.spug.cc/sms/fms53C2vRRWyNe58kFz9FQ'
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, code, number, scene, minute: number }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`验证码发送失败：HTTP ${res.status}`)
}
