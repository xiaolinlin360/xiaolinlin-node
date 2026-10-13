import pool from '../../model/db.js'
import { generateToken, verifyToken } from '../../lib/jwt.js'

const fileController = {
  //获取文件（分页查询）
  getFile: (req, res, next) => {
    const pageSize = req.body.pageSize || 10
    const pageNum = req.body.pageNum || 0
    let _sql = 'SELECT * FROM file ORDER BY id DESC LIMIT $1 OFFSET $2;'
    pool.query(_sql, [pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: result.rows, code: 200 })
      }
    })
  },
  //获取文件总数（后面需要微调，还有文件分类那些都没写）
  getTotalFile: (req, res, next) => {
    let _sql = 'SELECT COUNT(*) FROM file;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: result.rows[0].count, code: 200 })
      }
    })
  },
  //文件删除和修改后面在做吧
  //移动文件到不同的分类（修改subset id）
  moveFile: (req, res, next) => {
    const data = req.body
    let _sql = 'UPDATE file SET subset_id = $1 WHERE id = $2;'
    pool.query(_sql, [data.subset_id, data.id], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库更新错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '文件移动成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '文件不存在或已被移动' }, code: 404 })
        }
      }
    })
  },
}

export default fileController
