import pool from '../../model/db.js'

const categoryController = {
  //获取分组分类
  getCategory: (req, res, next) => {
    let _sql = 'SELECT * FROM category;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: result.rows, code: 200 })
      }
    })
  },
}

export default categoryController
