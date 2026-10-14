import pool from '../../model/db.js'

const messageController = {
  //获取私信message
  getMessage: (req, res, next) => {
    // 用token中的id查询
    const user = req.user.id
    let pageSize = Number(req.body.pageSize) || 10
    let pageNum = Number(req.body.pageNum) || 1
    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100

    // 通过 sender_id 关联 users 表，拿到发送者的头像和名字
    const _sql = `
    SELECT
      m.*,
      u.imgurl AS sender_imgurl,
      u.name   AS sender_name
    FROM message m
    LEFT JOIN users u ON u.id = m.sender_id
    WHERE m.receiver_id = $1
    ORDER BY m.id
    LIMIT $2 OFFSET $3;
  `
    pool.query(_sql, [user, pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        return res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      }
      res.status(200).json({
        data: { messages: result.rows, pageSize, pageNum },
        code: 200,
      })
    })
  },
  //获取私信总数
  getTotalMessage: (req, res, next) => {
    // 用token中的id查询
    const user = req.user.id
    let _sql = 'SELECT COUNT(*) AS total FROM message WHERE receiver_id = $1;'
    pool.query(_sql, [user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        const total = Number(result.rows[0].total)
        res.status(200).json({ data: { total: total }, code: 200 })
      }
    })
  },
  //将某一条私信标记为已读
  readMessage: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    let _sql = 'UPDATE message SET is_read = 1 WHERE id = $1 and receiver_id = $2;'
    pool.query(_sql, [data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库更新错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '私信标记为已读成功', is_read: 1 }, code: 200 })
        } else {
          res
            .status(404)
            .json({ data: { message: '私信不存在或已被标记', is_read: -1 }, code: 404 })
        }
      }
    })
  },
}

export default messageController
