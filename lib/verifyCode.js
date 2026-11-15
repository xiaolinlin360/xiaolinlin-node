/**
 * 验证码：先存在内存 Map 里。
 *
 * 为什么够用：验证码只活 5 分钟，重启就失效也无所谓；项目是单进程的。
 * 以后要上多实例 / 需要防刷，再换成 Redis。
 */
const codes = new Map() // key: `${userId}:${channel}` → { code, expiresAt }

const TTL = 5 * 60 * 1000 // 5 分钟

/** 生成 6 位数字验证码并存起来 */
export const createCode = (userId, channel) => {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  codes.set(`${userId}:${channel}`, { code, expiresAt: Date.now() + TTL })
  return code
}

/** 校验：存在、没过期、数字对得上 */
export const verifyCode = (userId, channel, code) => {
  const item = codes.get(`${userId}:${channel}`)
  if (!item) return false

  if (item.expiresAt < Date.now()) {
    codes.delete(`${userId}:${channel}`)
    return false
  }

  return item.code === code
}

/** 用完之后立刻作废，防止同一个码重复使用 */
export const removeCode = (userId, channel) => codes.delete(`${userId}:${channel}`)

/**
 * 真正把验证码发出去
 */
export const sendCode = async (channel, to, code) => {
  const number = 5
  let url = null
  if (channel === 'email') url = 'https://push.spug.cc/mail/XlxGd8Ja3gr2bn0R'
  else url = 'https://push.spug.cc/sms/fms53C2vRRWyNe58kFz9FQ'
  console.log('发送验证码')

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, code, number, scene: '更新密码', minute: number }),
  })
    .then((res) => res.json())
    .then((data) => console.log(data))
    .catch((err) => console.log(err))
}
