import pool from '../../model/db.js'
import { generateToken, verifyToken } from '../../lib/jwt.js'

const fileController = {
  //获取文件（分页查询）
  getFile: (req, res, next) => {
    let pageSize = Number(req.body.pageSize) || 10
    let pageNum = Number(req.body.pageNum) || 1
    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100

    let _sql = 'SELECT * FROM files created_at BY id DESC LIMIT $1 OFFSET $2;'
    pool.query(_sql, [pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: { files: result.rows, pageSize, pageNum }, code: 200 })
      }
    })
  },
  //获取文件总数（后面需要微调，还有文件分类那些都没写）
  getTotalFile: (req, res, next) => {
    let _sql = 'SELECT COUNT(*) FROM files;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: { total: Number(result.rows[0].count) }, code: 200 })
      }
    })
  },
  //文件删除和修改后面在做吧
  //移动文件到不同的分类（修改subset id）
  //后续在考虑是否需要这个功能
  // moveFile: (req, res, next) => {
  //   const data = req.body
  //   let _sql = 'UPDATE files SET subset_id = $1 WHERE id = $2;'
  //   pool.query(_sql, [data.subset_id, data.id], (err, result) => {
  //     if (err) {
  //       console.error(err)
  //       res.status(500).json({ data: { error: '数据库更新错误' }, code: 500 })
  //     } else {
  //       if (result.rowCount > 0) {
  //         res.status(200).json({ data: { message: '文件移动成功' }, code: 200 })
  //       } else {
  //         res.status(404).json({ data: { message: '文件不存在或已被移动' }, code: 404 })
  //       }
  //     }
  //   })
  // },
}

export default fileController
