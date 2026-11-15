/** 把附件挂到文章上：先解绑这篇文章原有的，再绑定新的（前端每次都传全量列表） */
export const attachFiles = async (client, articleId, attachmentIds) => {
  await client.query('UPDATE files SET article_id = NULL WHERE article_id = $1;', [articleId])
  if (attachmentIds.length > 0) {
    await client.query('UPDATE files SET article_id = $1 WHERE id = ANY($2::uuid[]);', [
      articleId,
      attachmentIds,
    ])
  }
}
