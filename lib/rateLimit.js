/**
 * 极简内存限流器（零依赖）。
 *
 * 用途：给「公开、且会被脚本刷」的接口兜底 —— 匿名留言、登录试探。
 *
 * 为什么不用 express-rate-limit：
 *   这个项目是单实例部署，内存计数完全够用，少一个依赖少一份维护成本。
 *
 * 局限（重要，别忘）：
 *   计数存在进程内存里。一旦上多实例 / 负载均衡 / serverless，
 *   每个实例各算各的，等于没限流 —— 那时请换成共享存储（Redis）方案。
 *   另外重启进程会清空计数，这是开发期想要的行为。
 */
const SWEEP_INTERVAL = 60 * 1000

/**
 * @param {object} options
 * @param {number} [options.windowMs] 时间窗，默认 60 秒
 * @param {number} [options.max] 时间窗内允许的次数，默认 5
 * @param {string} [options.message] 超限时返回的提示
 * @param {string} [options.keyPrefix] 计数分组前缀（不同接口用不同前缀，互不干扰）
 */
export const rateLimit = ({
  windowMs = 60 * 1000,
  max = 5,
  message = '操作太频繁了，请稍后再试',
  keyPrefix = 'rl',
} = {}) => {
  /** @type {Map<string, { count: number, resetAt: number }>} */
  const buckets = new Map()

  // 定期清掉过期桶，否则 Map 会随着 IP 数量无限增长
  const sweeper = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(key)
    }
  }, SWEEP_INTERVAL)
  // unref：别让这个定时器拖住进程退出
  sweeper.unref?.()

  return (req, res, next) => {
    const key = `${keyPrefix}|${req.ip}`
    const now = Date.now()

    let bucket = buckets.get(key)
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs }
      buckets.set(key, bucket)
    }

    bucket.count += 1

    const retryAfter = Math.ceil(Math.max(0, bucket.resetAt - now) / 1000)
    res.setHeader('X-RateLimit-Limit', String(max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)))
    res.setHeader('Retry-After', String(retryAfter))

    if (bucket.count > max) {
      // 429 而不是 400：语义明确，前端也能单独处理
      return res.status(429).json({ code: 429, message, data: null, retryAfter })
    }

    next()
  }
}
