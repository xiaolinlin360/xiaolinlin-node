/** UUID 正则：用来判断 keyword 到底是在查 id，还是在查名字 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 根据 keyword 生成查询语句与参数（纯函数，便于单测） */
export const buildLabelsQuery = (keyword = '') => {
  const kw = String(keyword).trim()
  if (!kw) return { sql: 'SELECT * FROM labels ORDER BY id ASC', values: [] }
  const byId = UUID_RE.test(kw)
  return {
    sql: `SELECT * FROM labels WHERE ${byId ? 'id = $1' : 'label_name ILIKE $1'} ORDER BY id ASC`,
    values: [byId ? kw : `%${kw}%`],
  }
}
