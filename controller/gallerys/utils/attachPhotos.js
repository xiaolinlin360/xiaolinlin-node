/** 把照片挂到图库上：先解绑这个图库原有的，再绑定新的（前端每次传全量列表） */
export const attachPhotos = async (client, galleryId, photoIds) => {
  await client.query('UPDATE files SET gallery_id = NULL WHERE gallery_id = $1;', [galleryId])
  if (photoIds.length > 0) {
    await client.query('UPDATE files SET gallery_id = $1 WHERE id = ANY($2::uuid[]);', [
      galleryId,
      photoIds,
    ])
  }
}
