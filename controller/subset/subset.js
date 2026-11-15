import pool from '../../model/db.js'
import { ok, fail } from '../../lib/respond.js'

const subsetController = {
  //获取分组(单个人的博客，只有单个人的分组所以直接拿到表)
  getSubset: (req, res, next) => {
    const category_id = req.body.category_id
    const keyword = req.body.keyword
    let _sql = 'SELECT * FROM subsets WHERE category_id = $1'
    let queryParams = [category_id]

    // 如果存在关键字，则追加模糊查询条件
    if (keyword && String(keyword).trim() !== '') {
      // 使用 ILIKE 不区分大小写匹配，并加上 % 通配符
      _sql += ` AND name ILIKE $${queryParams.length + 1}`
      queryParams.push(`%${String(keyword).trim()}%`)
    }

    // 顺便加上一个排序，让新创建的在前面（按需保留）
    _sql += ' ORDER BY created_at DESC'

    pool.query(_sql, queryParams, (err, result) => {
      if (err) {
        console.error(err)
        return fail(res, 500, '数据库查询错误')
      }
      ok(res, result.rows)
    })
  },
  //新建分组
  insertSubset: (req, res, next) => {
    const data = req.body
    if (!data.category_id || !data.name) {
      return fail(res, 400, '分组分类或名称不能为空')
    }
    let _sql = 'INSERT INTO subsets (category_id, name) VALUES ($1, $2);'
    pool.query(_sql, [data.category_id, data.name], (err, result) => {
      if (err && err.code === '23505') {
        return fail(res, 400, '分组名称已存在')
      }
      if (err) {
        console.error('[insertSubset]', err)
        return fail(res, 500, '数据库插入错误')
      }
      if (result.rowCount > 0) {
        ok(res, null, '分组新建成功')
      } else {
        fail(res, 404, '分组不存在或已被新建')
      }
    })
  },
  //修改分组名字
  updateSubset: (req, res, next) => {
    const data = req.body
    if (!data.id) {
      return fail(res, 400, '分组名称不能为空')
    }
    let _sql = 'UPDATE subsets SET name = $1 WHERE id = $2;'
    pool.query(_sql, [data.name, data.id], (err, result) => {
      if (err) {
        console.error('[updateSubset]', err)
        return fail(res, 500, '数据库更新错误')
      }
      if (result.rowCount > 0) {
        ok(res, null, '分组名字更新成功')
      } else {
        fail(res, 404, '分组不存在或已被更新')
      }
    })
  },
  //删除分组
  deleteSubset: (req, res, next) => {
    const data = req.body
    let _sql = 'DELETE FROM subsets WHERE id = $1;'
    pool.query(_sql, [data.id], (err, result) => {
      if (err && err.code === '23503') {
        return fail(res, 400, '分组下还有内容，不能删除')
      }
      if (err) {
        console.error('[deleteSubset]', err)
        return fail(res, 500, '数据库删除错误')
      }
      if (result.rowCount > 0) {
        ok(res, null, '分组删除成功')
      } else {
        fail(res, 404, '分组不存在或已被删除')
      }
    })
  },
}

export default subsetController
