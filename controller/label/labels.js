import pool from '../../model/db.js'
import { generateToken, verifyToken } from '../../lib/jwt.js'
const labelController = {
  //获取所有标签
  getLabels: (req, res, next) => {
    let _sql = 'SELECT * FROM labels;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: result.rows, code: 200 })
      }
    })
  },

  //新建标签
  insertLabels: (req, res, next) => {
    const data = req.body
    const user = req.user.id //当前登录用户（以后再判断是否是当前登录用户）
    if (!data.label_name) {
      return res.status(400).json({ data: { error: '标签名称不能为空' }, code: 400 })
    }
    let _sql = 'INSERT INTO labels (label_name) VALUES ($1);'
    pool.query(_sql, [data.label_name], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库插入错误' })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '标签新建成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '标签不存在或已被新建' }, code: 404 })
        }
      }
    })
  },
  //修改标签名字
  updateLabels: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    if (!data.label_name) {
      return res.status(400).json({ error: '标签名称不能为空' })
    }
    let _sql = 'UPDATE labels SET label_name = $1 WHERE id = $2;'
    pool.query(_sql, [data.label_name, data.id], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库更新错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '标签名字更新成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '标签不存在或已被更新' }, code: 404 })
        }
      }
    })
  },
  //删除标签
  deleteLabels: (req, res, next) => {
    const data = req.body
    const user = req.user.id //当前登录用户（以后再判断是否是当前登录用户）
    let _sql = 'DELETE FROM labels WHERE id = $1 ;'
    pool.query(_sql, [data.id], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库删除错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '标签删除成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '标签不存在或已被删除' }, code: 404 })
        }
      }
    })
  },
}
export default labelController
