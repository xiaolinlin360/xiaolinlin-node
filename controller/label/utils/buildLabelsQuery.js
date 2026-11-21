/** UUID 正则：用来判断 keyword 到底是在查 id，还是在查名字 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 根据 keyword 生成查询语句与参数（纯函数，便于单测）
 *
 * @param keyword 标签名或 id 的一部分
 * @param publishedOnly 只数已发布的文章（前台用）；后台传 false，草稿也一起数
 */
export const buildLabelsQuery = (keyword = '', publishedOnly = true) => {
  const kw = String(keyword).trim()

  // $1 = publishedOnly，关键词从 $2 开始，参数顺序就不会乱
  const values = [publishedOnly]
  let where = ''
  if (kw) {
    const byId = UUID_RE.test(kw)
    where = `WHERE l.${byId ? 'id = $2' : 'label_name ILIKE $2'}`
    values.push(byId ? kw : `%${kw}%`)
  }

  return {
    sql: `
      SELECT l.id, l.label_name, l.created_at,
             COUNT(a.id) FILTER (WHERE NOT $1::boolean OR a.state)::int AS count
      FROM labels l
      LEFT JOIN article_label al ON al.label_id = l.id
      LEFT JOIN articles a ON a.id = al.article_id
      ${where}
      GROUP BY l.id
      ORDER BY l.id ASC;`,
    values,
  }
}
