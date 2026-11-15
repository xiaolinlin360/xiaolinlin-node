import pool from '../../model/db.js'
import { ok, fail } from '../../lib/respond.js'

const categoryController = {
  //获取分组分类
  getCategory: (req, res, next) => {
    let _sql = 'SELECT * FROM category;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error(err)
        return fail(res, 500, '数据库查询错误')
      }
      ok(res, result.rows)
    })
  },
}

export default categoryController
