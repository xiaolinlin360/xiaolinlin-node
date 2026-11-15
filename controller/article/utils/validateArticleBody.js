/** 新建 / 编辑文章共用的字段校验，返回错误文案或 null */
export const validateArticleBody = (body = {}) => {
  const { title, introduce, content, subset_id } = body
  if (!title || !String(title).trim()) return '标题不能为空'
  if (String(title).length > 40) return '标题不能超过 40 个字符'
  if (!introduce || !String(introduce).trim()) return '简介不能为空'
  if (String(introduce).length > 400) return '简介不能超过 400 个字符'
  if (!content || !String(content).trim()) return '正文不能为空'
  if (!subset_id) return '请选择文章分组'
  return null
}
