import fs from 'node:fs/promises'
import path from 'node:path'
/** 递归统计目录的占用大小与文件个数 */
export const calcDirSize = async (dir) => {
  let bytes = 0
  let count = 0

  // 目录不存在 / 无权限时按空处理，避免整个接口 500
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])

  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const sub = await calcDirSize(full)
      bytes += sub.bytes
      count += sub.count
    } else if (entry.isFile()) {
      const stat = await fs.stat(full).catch(() => null)
      if (stat) {
        bytes += stat.size
        count += 1
      }
    }
  }

  return { bytes, count }
}
