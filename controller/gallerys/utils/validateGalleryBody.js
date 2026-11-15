/** 图库表单校验，返回错误文案或 null */
export const validateGalleryBody = (body = {}) => {
  const { title, subset_id } = body
  if (!title || !String(title).trim()) return '图库名称不能为空'
  if (String(title).length > 40) return '图库名称不能超过 40 个字符'
  if (!subset_id) return '请选择分组'
  return null
}
