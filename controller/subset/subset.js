import pool from '../../model/db.js'
import { generateToken, verifyToken } from '../../lib/jwt.js'

const subsetController = {
  //获取分组(单个人的博客，只有单个人的分组所以直接拿到表)
  getSubset: (req, res, next) => {
    let data = []
    if (req.body?.classif) data.push(req.body?.classif)
    let _sql = 'SELECT * FROM subset WHERE classif = $1;'
    if (data.length === 0) _sql = 'SELECT * FROM subset;'
    pool.query(_sql, data, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: result.rows, code: 200 })
      }
    })
  },
  //新建分组
  insertSubset: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    if (!data.classif) {
      return res.status(400).json({ data: { error: '分组名称不能为空' }, code: 400 })
    }
    let _sql = 'INSERT INTO subset (classif, user_id) VALUES ($1, $2);'
    pool.query(_sql, [data.classif, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库插入错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '分组新建成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '分组不存在或已被新建' }, code: 404 })
        }
      }
    })
  },
  //修改分组名字
  updateSubset: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    if (!data.classif) {
      return res.status(400).json({ data: { error: '分组名称不能为空' }, code: 400 })
    }
    let _sql = 'UPDATE subset SET classif = $1 WHERE id = $2 and user_id = $3;'
    pool.query(_sql, [data.classif, data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库更新错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '分组名字更新成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '分组不存在或已被更新' }, code: 404 })
        }
      }
    })
  },
  //删除分组
  deleteSubset: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    let _sql = 'DELETE FROM subset WHERE id = $1 and user_id = $2;'
    pool.query(_sql, [data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库删除错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '分组删除成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '分组不存在或已被删除' }, code: 404 })
        }
      }
    })
  },
}

export default subsetController
