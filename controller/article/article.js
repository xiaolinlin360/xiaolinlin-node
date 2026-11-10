import pool from '../../model/db.js'

/** 新建 / 编辑共用的字段校验，返回错误文案或 null */
const validateArticleBody = (body = {}) => {
  const { title, introduce, content, subset_id } = body
  if (!title || !String(title).trim()) return '标题不能为空'
  if (String(title).length > 40) return '标题不能超过 40 个字符'
  if (!introduce || !String(introduce).trim()) return '简介不能为空'
  if (String(introduce).length > 400) return '简介不能超过 400 个字符'
  if (!content || !String(content).trim()) return '正文不能为空'
  if (!subset_id) return '请选择文章分组'
  return null
}

/** 把附件挂到文章上：先解绑这篇文章原有的，再绑定新的（前端每次都传全量列表） */
const attachFiles = async (client, articleId, attachmentIds) => {
  await client.query('UPDATE files SET article_id = NULL WHERE article_id = $1;', [articleId])
  if (attachmentIds.length > 0) {
    await client.query('UPDATE files SET article_id = $1 WHERE id = ANY($2::uuid[]);', [
      articleId,
      attachmentIds,
    ])
  }
}

const articleController = {
  //获取文章
  getArticle: (req, res, next) => {
    const data = req.body || {}

    let pageSize = Number(data.pageSize) || 10
    let pageNum = Number(data.pageNum) || 1
    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100

    const subsetId = data.subset_id && data.subset_id !== '' ? data.subset_id : null

    const sql = `
    WITH paged AS (
      SELECT *
      FROM articles
      WHERE ($3::uuid IS NULL OR subset_id = $3::uuid)
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    )
    SELECT
      a.id,
      a.state,
      a.title,
      a.content,
      a.user_id,
      f.url AS url,               -- 通过 cover_file_id 拿到的封面 URL
      COALESCE(tf.file_urls, '[]'::json) AS file_urls, -- 聚合的文件ID数组或URL数组
      a.introduce,
      a.subset_id,
      a.created_at,
      u.name AS username_name,
      COALESCE(tl.labels, '[]'::json) AS labels
    FROM paged a
    -- 1. 关联封面文件
    LEFT JOIN files f ON f.id = a.cover_file_id  
    -- 2. 关联用户
    LEFT JOIN users u ON u.id = a.user_id        
    -- 3. 聚合该文章关联的所有文件 (通过 files.article_id)
    LEFT JOIN LATERAL (
      SELECT json_agg(f_sub.id ORDER BY f_sub.created_at) AS file_urls
      FROM files f_sub
      WHERE f_sub.article_id = a.id
    ) tf ON TRUE
    -- 4. 聚合标签
    LEFT JOIN LATERAL (
      SELECT json_agg(
               json_build_object('id', l.id, 'label_name', l.label_name)
               ORDER BY l.id
             ) AS labels
      FROM article_label al
      JOIN labels l ON l.id = al.label_id        
      WHERE al.article_id = a.id
    ) tl ON TRUE
    ORDER BY a.created_at DESC
  `

    const params = [pageSize, (pageNum - 1) * pageSize, subsetId]

    pool.query(sql, params, (err, result) => {
      if (err) {
        console.error('SQL Error:', err)
        return res.status(500).json({
          data: { message: '数据库查询错误' },
          code: 500,
        })
      }
      res.status(200).json({
        data: { articles: result.rows, pageSize, pageNum },
        code: 200,
      })
    })
  },
  //获取文章总数
  getTotalArticle: (req, res) => {
    const subset_id = req.body?.subset_id
    const _sql = subset_id
      ? 'SELECT COUNT(*)::int AS total FROM articles WHERE subset_id = $1;'
      : 'SELECT COUNT(*)::int AS total FROM articles;'
    pool.query(_sql, subset_id ? [subset_id] : [], (err, result) => {
      if (err) return res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
      res.status(200).json({ data: { total: result.rows[0].total }, code: 200 })
    })
  },
  //修改文章的发布状态
  updateArticleStatus: (req, res, next) => {
    const data = req.body
    const user = req.user.id // 当前登录用户id
    // 文章状态state=true=已发布，false=草稿
    if (data.state === undefined) {
      return res.status(400).json({ code: 400, message: '发布状态参数错误', data: null })
    }
    let _sql = 'UPDATE articles SET state = $1 WHERE id = $2 AND user_id = $3;'
    pool.query(_sql, [data.state, data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库更新错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '文章发布状态更新成功' }, code: 200 })
        } else {
          res.status(400).json({ data: { message: '文章不存在或已被更新' }, code: 400 })
        }
      }
    })
  },
  //删除文章
  deleteArticle: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    // 删除文章时，需要先删除文章的标签，再删除文章
    let _sql = `
      WITH target_article AS (
        SELECT id FROM articles WHERE id = $1 AND user_id = $2
      ), deleted_labels AS (
        DELETE FROM article_label WHERE article_id IN (SELECT id FROM target_article)
      )
      DELETE FROM articles WHERE id IN (SELECT id FROM target_article);
    `
    pool.query(_sql, [data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库删除错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '文章删除成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '文章不存在或已被删除' }, code: 404 })
        }
      }
    })
  },

  //获取文章详情（编辑回显用）
  getArticleDetail: (req, res) => {
    const { id } = req.body
    if (!id) return res.status(400).json({ code: 400, message: '文章 id 不能为空', data: null })

    const _sql = `
      SELECT
        a.*,
        u.name AS username_name,
        f.url  AS url,
        COALESCE(tf.file_urls,  '[]'::json) AS file_urls,
        COALESCE(ta.attachments,'[]'::json) AS attachments,
        COALESCE(tl.labels,     '[]'::json) AS labels
      FROM articles a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN files f ON f.id = a.cover_file_id
      LEFT JOIN LATERAL (
        SELECT json_agg(f_sub.id ORDER BY f_sub.created_at) AS file_urls
        FROM files f_sub
        WHERE f_sub.article_id = a.id
      ) tf ON TRUE
      -- 附件：回显要文件名字，所以返回对象而不是裸 id
      LEFT JOIN LATERAL (
        SELECT json_agg(
                 json_build_object(
                   'id',        f2.id,
                   'file_name', f2.file_name,
                   'url',       f2.url,
                   'size',      f2.size,
                   'type',      f2.type
                 ) ORDER BY f2.created_at
               ) AS attachments
        FROM files f2
        WHERE f2.article_id = a.id
      ) ta ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(
                 json_build_object('id', l.id, 'label_name', l.label_name)
                 ORDER BY l.id
               ) AS labels
        FROM article_label al
        JOIN labels l ON l.id = al.label_id
        WHERE al.article_id = a.id
      ) tl ON TRUE
      WHERE a.id = $1;
    `

    pool.query(_sql, [id], (err, result) => {
      if (err) {
        console.error('[getArticleDetail]', err)
        return res.status(500).json({ code: 500, message: '数据库查询错误', data: null })
      }
      if (result.rows.length === 0) {
        return res.status(404).json({ code: 404, message: '文章不存在', data: null })
      }
      res.status(200).json({ code: 200, message: 'ok', data: result.rows[0] })
    })
  },

  //新建文章（正文+封面+附件 id 一次性提交，附件在本事务里挂上去）
  insertArticle: async (req, res) => {
    const errMsg = validateArticleBody(req.body)
    if (errMsg) return res.status(400).json({ code: 400, message: errMsg, data: null })

    const { title, introduce, content, subset_id } = req.body
    const state = req.body.state === true
    const cover_file_id = req.body.cover_file_id || null
    const attachment_ids = Array.isArray(req.body.attachment_ids)
      ? req.body.attachment_ids.filter(Boolean)
      : []

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query(
        `INSERT INTO articles (user_id, subset_id, title, introduce, content, cover_file_id, state)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id;`,
        [req.user.id, subset_id, title.trim(), introduce.trim(), content, cover_file_id, state]
      )
      const articleId = result.rows[0].id

      await attachFiles(client, articleId, attachment_ids)
      await client.query('COMMIT')

      res.status(200).json({ code: 200, message: '文章创建成功', data: { id: articleId } })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('[insertArticle]', err)
      if (err.code === '23503') {
        return res.status(400).json({ code: 400, message: '分组或封面文件不存在', data: null })
      }
      if (err.code === '22P02') {
        return res.status(400).json({ code: 400, message: '附件 id 格式不正确', data: null })
      }
      res.status(500).json({ code: 500, message: '数据库插入错误', data: null })
    } finally {
      client.release()
    }
  },

  //编辑文章
  updateArticle: async (req, res) => {
    const { id } = req.body
    if (!id) return res.status(400).json({ code: 400, message: '文章 id 不能为空', data: null })

    const errMsg = validateArticleBody(req.body)
    if (errMsg) return res.status(400).json({ code: 400, message: errMsg, data: null })

    const { title, introduce, content, subset_id } = req.body
    const state = req.body.state === true
    const cover_file_id = req.body.cover_file_id || null
    const attachment_ids = Array.isArray(req.body.attachment_ids)
      ? req.body.attachment_ids.filter(Boolean)
      : []

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const result = await client.query(
        `UPDATE articles
         SET title = $1, introduce = $2, content = $3, subset_id = $4,
             cover_file_id = $5, state = $6
         WHERE id = $7 AND user_id = $8
         RETURNING id;`,
        [
          title.trim(),
          introduce.trim(),
          content,
          subset_id,
          cover_file_id,
          state,
          id,
          req.user.id,
        ]
      )

      if (result.rowCount === 0) {
        await client.query('ROLLBACK')
        return res
          .status(404)
          .json({ code: 404, message: '文章不存在或不属于当前用户', data: null })
      }

      await attachFiles(client, id, attachment_ids)
      await client.query('COMMIT')

      res.status(200).json({ code: 200, message: '文章更新成功', data: { id } })
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('[updateArticle]', err)
      if (err.code === '23503') {
        return res.status(400).json({ code: 400, message: '分组或封面文件不存在', data: null })
      }
      if (err.code === '22P02') {
        return res.status(400).json({ code: 400, message: '附件 id 格式不正确', data: null })
      }
      res.status(500).json({ code: 500, message: '数据库更新错误', data: null })
    } finally {
      client.release()
    }
  },
}

export default articleController