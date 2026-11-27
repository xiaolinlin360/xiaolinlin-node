import pool from '../../model/db.js'
import { ok, fail } from '../../lib/respond.js'
import { validateArticleBody } from './utils/validateArticleBody.js'
import { attachFiles } from './utils/attachFiles.js'

const articleController = {
  //获取文章
  getArticle: (req, res, next) => {
    const data = req.body || {}

    let pageSize = Number(data.pageSize) || 10
    let pageNum = Number(data.pageNum) || 1
    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100

    // top = 页面上选的那个分类（其实就是子分类 id）；
    // subset_id 是历史写法，两个都认，前端统一用 top
    const top = data.top ?? data.subset_id
    const subsetId = top && top !== '' ? top : null

    // 前台访客（没登录）只能看已发布的，草稿别漏出去
    const stateSql = req.user ? '' : ' AND state = true'

    const sql = `
    WITH paged AS (
      SELECT *
      FROM articles
      WHERE ($3::uuid IS NULL OR subset_id = $3::uuid)${stateSql}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    )
    SELECT
      a.id,
      a.state,
      a.title,
      a.content,
      a.user_id,
      a.views,        -- 浏览量（前台每打开一次详情 +1）
      a.praise_count, -- 收藏（点赞）数
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
        console.error('[getArticle] SQL Error:', err)
        return fail(res, 500, '数据库查询错误')
      }
      ok(res, { articles: result.rows, pageSize, pageNum })
    })
  },
  //获取文章总数
  getTotalArticle: (req, res) => {
    const top = req.body?.top ?? req.body?.subset_id
    const subset_id = top && top !== '' ? top : null
    const stateSql = req.user ? '' : ' AND state = true'
    const _sql = subset_id
      ? `SELECT COUNT(*)::int AS total FROM articles WHERE subset_id = $1${stateSql};`
      : `SELECT COUNT(*)::int AS total FROM articles WHERE TRUE${stateSql};`
    pool.query(_sql, subset_id ? [subset_id] : [], (err, result) => {
      if (err) {
        console.error('[getTotalArticle]', err)
        return fail(res, 500, '数据库查询错误')
      }
      ok(res, { total: result.rows[0].total })
    })
  },
  //修改文章的发布状态
  updateArticleStatus: (req, res, next) => {
    const data = req.body
    const user = req.user.id // 当前登录用户id
    // 文章状态state=true=已发布，false=草稿
    if (data.state === undefined) {
      return fail(res, 400, '发布状态参数错误')
    }
    let _sql = 'UPDATE articles SET state = $1 WHERE id = $2 AND user_id = $3;'
    pool.query(_sql, [data.state, data.id, user], (err, result) => {
      if (err) {
        console.error('[updateArticleStatus]', err)
        return fail(res, 500, '数据库更新错误')
      }
      if (result.rowCount > 0) {
        ok(res, null, '文章发布状态更新成功')
      } else {
        // 找不到 = 文章不存在，或者不属于当前登录用户
        fail(res, 404, '文章不存在或不属于当前用户')
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
        console.error('[deleteArticle]', err)
        return fail(res, 500, '数据库删除错误')
      }
      if (result.rowCount > 0) {
        ok(res, null, '文章删除成功')
      } else {
        fail(res, 404, '文章不存在或不属于当前用户')
      }
    })
  },

  // 收藏 +1：前端用 localStorage 记「我收藏过哪些」，这里只管加数字
  praise: (req, res) => {
    const { id } = req.body
    if (!id) return fail(res, 400, '文章 id 不能为空')

    const _sql =
      'UPDATE articles SET praise_count = praise_count + 1 WHERE id = $1 AND state = true RETURNING praise_count;'
    pool.query(_sql, [id], (err, result) => {
      if (err) {
        console.error('[praise]', err)
        if (err.code === '22P02') return fail(res, 400, '文章 id 格式不正确')
        return fail(res, 500, '数据库更新错误')
      }
      if (result.rows.length === 0) return fail(res, 404, '文章不存在或未发布')
      ok(res, { praise_count: result.rows[0].praise_count })
    })
  },

  // 取消收藏 -1：跟 praise 对称，点错了能撤回
  offPraise: (req, res) => {
    const { id } = req.body
    if (!id) return fail(res, 400, '文章 id 不能为空')

    // GREATEST 兜一下，别让数字减成负数
    const _sql =
      'UPDATE articles SET praise_count = GREATEST(praise_count - 1, 0) WHERE id = $1 AND state = true RETURNING praise_count;'
    pool.query(_sql, [id], (err, result) => {
      if (err) {
        console.error('[offPraise]', err)
        if (err.code === '22P02') return fail(res, 400, '文章 id 格式不正确')
        return fail(res, 500, '数据库更新错误')
      }
      if (result.rows.length === 0) return fail(res, 404, '文章不存在或未发布')
      ok(res, { praise_count: result.rows[0].praise_count })
    })
  },

  //获取文章详情（编辑回显 + 前台详情页共用）
  getArticleDetail: (req, res) => {
    const { id } = req.body
    if (!id) return fail(res, 400, '文章 id 不能为空')

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
      WHERE a.id = $1${req.user ? '' : ' AND a.state = true'};
    `

    pool.query(_sql, [id], (err, result) => {
      if (err) {
        console.error('[getArticleDetail]', err)
        // 22P02 = 传了个不是 UUID 的 id
        if (err.code === '22P02') {
          return fail(res, 400, '文章 id 格式不正确')
        }
        return fail(res, 500, '数据库查询错误')
      }
      if (result.rows.length === 0) {
        return fail(res, 404, '文章不存在')
      }
      ok(res, result.rows[0])
    })
  },

  // 浏览量 +1：打开详情页时调一次
  addView: (req, res) => {
    const { id } = req.body
    if (!id) return fail(res, 400, '文章 id 不能为空')

    const _sql = 'UPDATE articles SET views = views + 1 WHERE id = $1 AND state = true RETURNING views;'
    pool.query(_sql, [id], (err, result) => {
      if (err) {
        console.error('[addView]', err)
        if (err.code === '22P02') return fail(res, 400, '文章 id 格式不正确')
        return fail(res, 500, '数据库更新错误')
      }
      if (result.rows.length === 0) return fail(res, 404, '文章不存在或未发布')
      ok(res, { views: result.rows[0].views })
    })
  },

  //新建文章（正文+封面+附件 id 一次性提交，附件在本事务里挂上去）
  insertArticle: async (req, res) => {
    const errMsg = validateArticleBody(req.body)
    if (errMsg) return fail(res, 400, errMsg)

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

      ok(res, { id: articleId }, '文章创建成功')
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('[insertArticle]', err)
      if (err.code === '23503') {
        return fail(res, 400, '分组或封面文件不存在')
      }
      if (err.code === '22P02') {
        return fail(res, 400, '附件 id 格式不正确')
      }
      fail(res, 500, '数据库插入错误')
    } finally {
      client.release()
    }
  },

  //编辑文章
  updateArticle: async (req, res) => {
    const { id } = req.body
    if (!id) return fail(res, 400, '文章 id 不能为空')

    const errMsg = validateArticleBody(req.body)
    if (errMsg) return fail(res, 400, errMsg)

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
        return fail(res, 404, '文章不存在或不属于当前用户')
      }

      await attachFiles(client, id, attachment_ids)
      await client.query('COMMIT')

      ok(res, { id }, '文章更新成功')
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('[updateArticle]', err)
      if (err.code === '23503') {
        return fail(res, 400, '分组或封面文件不存在')
      }
      if (err.code === '22P02') {
        return fail(res, 400, '附件 id 格式不正确')
      }
      fail(res, 500, '数据库更新错误')
    } finally {
      client.release()
    }
  },
}

export default articleController
