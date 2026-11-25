import pool from '../../model/db.js'

const guestbookController = {
  // 获取留言（分页，最新的在前）
  getGuestbook: (req, res) => {
    let pageSize = Number(req.body.pageSize) || 10
    let pageNum = Number(req.body.pageNum) || 1
    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100

    const _sql = `
      SELECT * FROM guestbooks
      ORDER BY created_at DESC, id DESC
      LIMIT $1 OFFSET $2;
    `

    pool.query(_sql, [pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error('[getGuestbook]', err)
        return res.status(500).json({ code: 500, message: '数据库查询错误', data: null })
      }

      // 邮箱是「可选，不公开」的：匿名访客一律看不到，只有登录的博主（权限 0）能看
      const isOwner = req.user && req.user.permission === 0
      const rows = result.rows.map((row) => {
        if (isOwner) return row
        const { email, ...rest } = row
        return rest
      })

      res.status(200).json({
        code: 200,
        message: 'ok',
        data: { guestbooks: rows, pageNum, pageSize },
      })
    })
  },

  // 获取留言总数
  getTotalGuestbook: (req, res) => {
    pool.query('SELECT COUNT(*)::int AS total FROM guestbooks;', (err, result) => {
      if (err) {
        console.error('[getTotalGuestbook]', err)
        return res.status(500).json({ code: 500, message: '数据库查询错误', data: null })
      }
      res.status(200).json({ code: 200, message: 'ok', data: { total: result.rows[0].total } })
    })
  },

  // 发表留言（匿名：称呼 + 内容，邮箱可选）
  insertGuestbook: (req, res) => {
    const nickname = (req.body.nickname || '').trim()
    const content = (req.body.content || '').trim()
    const email = (req.body.email || '').trim()

    if (!nickname) {
      return res.status(400).json({ code: 400, message: '请填写你的称呼', data: null })
    }
    if (nickname.length > 30) {
      return res.status(400).json({ code: 400, message: '称呼不能超过 30 个字', data: null })
    }
    if (!content) {
      return res.status(400).json({ code: 400, message: '留言内容不能为空', data: null })
    }
    if (content.length > 500) {
      return res.status(400).json({ code: 400, message: '留言不能超过 500 个字', data: null })
    }
    // 邮箱可以不填，填了就得像样
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100)) {
      return res.status(400).json({ code: 400, message: '邮箱格式不对', data: null })
    }

    const _sql =
      'INSERT INTO guestbooks (nickname, content, email) VALUES ($1, $2, $3) RETURNING id, nickname, content, created_at;'

    pool.query(_sql, [nickname, content, email || null], (err, result) => {
      if (err) {
        console.error('[insertGuestbook]', err)
        return res.status(500).json({ code: 500, message: '数据库插入错误', data: null })
      }
      res.status(200).json({ code: 200, message: '留言成功', data: result.rows[0] })
    })
  },

  // 回复留言（只有博主能回；reply 传空就是撤掉回复）
  setReply: (req, res) => {
    const { id } = req.body
    const reply = (req.body.reply || '').trim()

    if (!id) {
      return res.status(400).json({ code: 400, message: '留言 id 不能为空', data: null })
    }
    if (reply.length > 500) {
      return res.status(400).json({ code: 400, message: '回复不能超过 500 个字', data: null })
    }

    // 有内容就写回复并记时间，空字符串则把回复清掉
    const _sql = reply
      ? 'UPDATE guestbooks SET reply = $1, replied_at = NOW() WHERE id = $2 RETURNING id, reply, replied_at;'
      : 'UPDATE guestbooks SET reply = NULL, replied_at = NULL WHERE id = $1 RETURNING id, reply, replied_at;'

    pool.query(_sql, reply ? [reply, id] : [id], (err, result) => {
      if (err) {
        console.error('[setReply]', err)
        if (err.code === '22P02') {
          return res.status(400).json({ code: 400, message: '留言 id 格式不正确', data: null })
        }
        return res.status(500).json({ code: 500, message: '数据库更新错误', data: null })
      }
      if (result.rows.length === 0) {
        return res.status(404).json({ code: 404, message: '留言不存在', data: null })
      }
      res.status(200).json({
        code: 200,
        message: reply ? '回复成功' : '回复已撤掉',
        data: result.rows[0],
      })
    })
  },

  // 删除留言（只有博客主人能删）
  deleteGuestbook: (req, res) => {
    const { id } = req.body
    if (!id) {
      return res.status(400).json({ code: 400, message: '留言 id 不能为空', data: null })
    }

    pool.query('DELETE FROM guestbooks WHERE id = $1 RETURNING id;', [id], (err, result) => {
      if (err) {
        console.error('[deleteGuestbook]', err)
        return res.status(500).json({ code: 500, message: '数据库删除错误', data: null })
      }
      if (result.rowCount === 0) {
        return res.status(404).json({ code: 404, message: '留言不存在或已被删除', data: null })
      }
      res.status(200).json({ code: 200, message: '留言删除成功', data: null })
    })
  },
}

export default guestbookController
