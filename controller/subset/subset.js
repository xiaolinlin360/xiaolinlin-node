import pool from '../../model/db.js'
import { generateToken, verifyToken } from '../../lib/jwt.js'

const subsetController = {
  //获取分组(单个人的博客，只有单个人的分组所以直接拿到表)
  getSubset: (req, res, next) => {
    const user = req.user.id //从token中获取用户id,后期用来校验博客主账号
    let data = req.body.category_id
    let _sql = 'SELECT * FROM subsets WHERE category_id = $1;'
    pool.query(_sql, [data], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: result.rows, code: 200 })
      }
    })
  },
  //新建分组
  insertSubset: (req, res, next) => {
    const data = req.body
    const user = req.user.id //从token中获取用户id,后期用来校验博客主账号
    if (!data.category_id || !data.name) {
      return res.status(400).json({ data: { message: '分组分类或名称不能为空' }, code: 400 })
    }
    let _sql = 'INSERT INTO subsets (category_id, name) VALUES ($1, $2);'
    pool.query(_sql, [data.category_id, data.name], (err, result) => {
      if (err && err.code === '23505') {
        console.log(err.code)
        res.status(400).json({ data: { message: '分组名称已存在' }, code: 400 })
      } else if (err) {
        res.status(500).json({ data: { message: '数据库插入错误' }, code: 500 })
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
    const user = req.user.id //从token中获取用户id,后期用来校验博客主账号
    if (!data.id) {
      return res.status(400).json({ data: { message: '分组名称不能为空' }, code: 400 })
    }
    let _sql = 'UPDATE subsets SET name = $1 WHERE id = $2;'
    pool.query(_sql, [data.name, data.id], (err, result) => {
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
    let _sql = 'DELETE FROM subsets WHERE id = $1;'
    pool.query(_sql, [data.id], (err, result) => {
      if (err && err.code === '23503') {
        res.status(400).json({ data: { message: '分组下未删除的信息，不能删除' }, code: 400 })
      } else if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库删除错误' }, code: 500 })
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
