import pool from '../../model/db.js'
import crypto from 'node:crypto'
import { ok, fail } from '../../lib/respond.js'

const noteController = {
  // 1. 获取笔记（分页查询，支持 subset_id 及 id 过滤）
  getNotes: (req, res, next) => {
    let pageSize = Number(req.body.pageSize) || 10
    let pageNum = Number(req.body.pageNum) || 1
    let subset_id = req.body.subset_id
    let note_ids = req.body.note_ids // 支持数组 / 逗号分隔字符串 / 单个 UUID

    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100

    let _sql = 'SELECT * FROM notes'
    let queryParams = []
    let whereClauses = []

    // 处理 subset_id 过滤
    if (subset_id) {
      queryParams.push(subset_id)
      whereClauses.push(`subset_id = $${queryParams.length}`)
    }

    // 处理 note_ids 过滤：兼容数组、逗号分隔字符串、单个值
    if (note_ids !== undefined && note_ids !== null && note_ids !== '') {
      const ids = (Array.isArray(note_ids) ? note_ids : String(note_ids).split(','))
        .map((s) => s.trim())
        .filter(Boolean)

      // 传了空数组 / 空字符串 / 全是逗号，直接返回空结果
      if (ids.length === 0) {
        return ok(res, { notes: [], pageSize, pageNum })
      }

      queryParams.push(ids)
      whereClauses.push(`id = ANY($${queryParams.length}::uuid[])`)
    }

    // 拼装 WHERE
    if (whereClauses.length > 0) {
      _sql += ` WHERE ${whereClauses.join(' AND ')}`
    }

    // 排序
    _sql += ' ORDER BY created_at DESC, id DESC'

    // 分页
    queryParams.push(pageSize)
    _sql += ` LIMIT $${queryParams.length}`
    queryParams.push((pageNum - 1) * pageSize)
    _sql += ` OFFSET $${queryParams.length}`

    // 执行查询
    pool.query(_sql, queryParams, (err, result) => {
      if (err) {
        console.error('[getNotes]', err)
        return fail(res, 500, '数据库查询错误')
      }
      ok(res, { notes: result.rows, pageSize, pageNum })
    })
  },

  // 2. 获取笔记总数（支持与 getNotes 相同的过滤条件，保证分页器一致）
  getTotalNotes: (req, res, next) => {
    let subset_id = req.body?.subset_id
    let note_ids = req.body?.note_ids

    let _sql = 'SELECT COUNT(*)::int AS total FROM notes'
    let queryParams = []
    let whereClauses = []

    if (subset_id) {
      queryParams.push(subset_id)
      whereClauses.push(`subset_id = $${queryParams.length}`)
    }

    if (note_ids !== undefined && note_ids !== null && note_ids !== '') {
      let ids = Array.isArray(note_ids) ? note_ids : [note_ids]
      if (ids.length === 0) {
        return ok(res, { total: 0 })
      }
      queryParams.push(ids)
      whereClauses.push(`id = ANY($${queryParams.length}::uuid[])`)
    }

    if (whereClauses.length > 0) {
      _sql += ` WHERE ${whereClauses.join(' AND ')}`
    }

    pool.query(_sql, queryParams, (err, result) => {
      if (err) {
        console.error('[getTotalNotes]', err)
        return fail(res, 500, '数据库查询错误')
      }
      ok(res, { total: result.rows[0].total })
    })
  },

  // 3. 新增笔记
  insertNotes: async (req, res) => {
    const { title, content, subset_id } = req.body

    // 基础校验：title 和 content 都是必填
    if (!title || !content) {
      return fail(res, 400, '标题和内容不能为空')
    }

    // 生成 UUID
    const id = crypto.randomUUID()

    // 插入数据库
    const _sql = `
      INSERT INTO notes (id, title, content, subset_id) 
      VALUES ($1, $2, $3, $4) 
      RETURNING *
    `
    const params = [id, title, content, subset_id || null]

    try {
      const result = await pool.query(_sql, params)
      ok(res, result.rows[0], '笔记创建成功')
    } catch (err) {
      console.error('[insertNotes]', err)
      fail(res, 500, '数据库插入错误')
    }
  },

  // 4. 修改笔记
  updateNotes: async (req, res) => {
    const { id, title, content, subset_id } = req.body

    if (!id) {
      return fail(res, 400, '缺少笔记ID')
    }

    // 动态拼接 SQL（只更新前端传过来的字段）
    let updateFields = []
    let params = []
    let paramIndex = 1

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`)
      params.push(title)
    }
    if (content !== undefined) {
      updateFields.push(`content = $${paramIndex++}`)
      params.push(content)
    }
    if (subset_id !== undefined) {
      updateFields.push(`subset_id = $${paramIndex++}`)
      params.push(subset_id || null)
    }

    if (updateFields.length === 0) {
      return fail(res, 400, '没有提供需要更新的字段')
    }

    // 把 id 放到参数数组最后
    params.push(id)
    const _sql = `
      UPDATE notes 
      SET ${updateFields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING *
    `

    try {
      const result = await pool.query(_sql, params)
      if (result.rowCount > 0) {
        ok(res, result.rows[0], '笔记更新成功')
      } else {
        fail(res, 404, '笔记不存在或已被删除')
      }
    } catch (err) {
      console.error('[updateNotes]', err)
      fail(res, 500, '数据库更新错误')
    }
  },

  // 5. 删除笔记
  deleteNotes: async (req, res) => {
    const { id } = req.body

    if (!id) {
      return fail(res, 400, '缺少笔记ID')
    }

    const _sql = 'DELETE FROM notes WHERE id = $1 RETURNING id'

    try {
      const result = await pool.query(_sql, [id])
      if (result.rowCount > 0) {
        ok(res, null, '笔记删除成功')
      } else {
        fail(res, 404, '笔记不存在或已被删除')
      }
    } catch (err) {
      console.error('[deleteNotes]', err)
      fail(res, 500, '数据库删除错误')
    }
  },
}

export default noteController
