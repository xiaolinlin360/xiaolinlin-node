import { config } from '../config/default.js'
import { fail } from './respond.js'

/**
 * 公开接口的门卫：只让自己站点的前端来调。
 * 浏览器发起的请求一定带 Origin（跨域）或 Referer（同源），从这里取域名比对。
 *
 * 注意：这只是「防君子不防小人」——curl -H "Referer: ..." 能伪造，
 * 所以需要鉴权的数据（草稿、用户、消息）该挂 auth 还是得挂 auth。
 */
export const siteGuard = (req, res, next) => {
  // 带了有效 token 的（后台页面、冒烟脚本）直接放行，不用折腾 Origin
  if (req.user) return next()

  const from = req.headers.origin || req.headers.referer || ''

  let host = ''
  try {
    host = new URL(from).hostname
  } catch {
    return fail(res, 403, '只允许本站访问')
  }

  if (!config.site.allowedHosts.includes(host)) {
    return fail(res, 403, '只允许本站访问')
  }
  next()
}
