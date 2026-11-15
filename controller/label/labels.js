import pool from '../../model/db.js'
import { ok, fail } from '../../lib/respond.js'
import { buildLabelsQuery } from './utils/buildLabelsQuery.js'

const labelController = {
  //获取所有标签
  getLabels: async (req, res, next) => {
    const { sql, values } = buildLabelsQuery(req.body?.keyword ?? req.query?.keyword)
    try {
      const { rows } = await pool.query(sql, values)
      ok(res, rows)
    } catch (err) {
      console.error('[getLabels]', err)
      fail(res, 500, '数据库查询错误')
    }
  },

  //新建标签
  insertLabels: (req, res, next) => {
    const data = req.body
    if (!data.label_name) {
      return fail(res, 400, '标签名称不能为空')
    }
    let _sql = 'INSERT INTO labels (label_name) VALUES ($1);'
    pool.query(_sql, [data.label_name], (err, result) => {
      if (err) {
        console.error('[insertLabels]', err)
        return fail(res, 500, '数据库插入错误')
      }
      if (result.rowCount > 0) {
        ok(res, null, '标签新建成功')
      } else {
        fail(res, 404, '标签不存在或已被新建')
      }
    })
  },
  //修改标签名字
  updateLabels: (req, res, next) => {
    const data = req.body
    if (!data.label_name) {
      return fail(res, 400, '标签名称不能为空')
    }
    let _sql = 'UPDATE labels SET label_name = $1 WHERE id = $2;'
    pool.query(_sql, [data.label_name, data.id], (err, result) => {
      if (err) {
        console.error('[updateLabels]', err)
        return fail(res, 500, '数据库更新错误')
      }
      if (result.rowCount > 0) {
        ok(res, null, '标签名字更新成功')
      } else {
        fail(res, 404, '标签不存在或已被更新')
      }
    })
  },
  //删除标签
  deleteLabels: (req, res, next) => {
    const data = req.body
    let _sql = 'DELETE FROM labels WHERE id = $1 ;'
    pool.query(_sql, [data.id], (err, result) => {
      if (err) {
        console.error('[deleteLabels]', err)
        return fail(res, 500, '数据库删除错误')
      }
      if (result.rowCount > 0) {
        ok(res, null, '标签删除成功')
      } else {
        fail(res, 404, '标签不存在或已被删除')
      }
    })
  },
}
export default labelController
