import pool from '../model/db.js'
import { generateToken, verifyToken } from '../lib/jwt.js'
const serve = {
  //查询是否注册
  isRegistered: (req, res, next) => {
    let _sql = 'SELECT * FROM users WHERE id = $1;'
    pool.query(_sql, [req.body.id], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      }
      if (result.rows.length > 0) {
        console.log(result)
        res.status(200).json({ data: { registered: true, users: result.rows }, code: 200 })
      } else {
        res.status(200).json({ data: { registered: false }, code: 200 })
      }
    })
  },
  //注册用户
  insertUser: (req, res, next) => {
    const data = req.body
    let _sql = 'INSERT INTO users (id, name,mail,password) VALUES ($1, $2,$3,$4) RETURNING *;'
    pool.query(_sql, [data.id, data.name, data.mail, data.password], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库插入错误' }, code: 500 })
      } else {
        const user = result.rows[0]
        res.status(200).json({
          message: '用户注册成功',
          data: { id: user.id, name: user.name, mail: user.mail },
          code: 200,
        })
      }
    })
  },
  //登录
  login: (req, res, next) => {
    const data = req.body
    let _sql = 'SELECT * FROM users WHERE name = $1 AND password = $2;'
    pool.query(_sql, [data.name, data.password], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        if (result.rows.length > 0) {
          const user = result.rows[0]
          // 生成token
          const token = generateToken(user.id, user.name)
          res.status(200).json({ data: { message: '登录成功' }, token: token, code: 200 })
        } else {
          res.status(401).json({ data: { message: '登录失败' }, code: 401 })
        }
      }
    })
  },
  //获取评论（全查询，无论是系统通知还是用户的评论）
  getComment: (req, res, next) => {
    let pageSize = Number(req.body.pageSize) || 10
    let pageNum = Number(req.body.pageNum) || 1
    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100
    let _sql = 'SELECT * FROM comment ORDER BY id LIMIT $1 OFFSET $2;'
    pool.query(_sql, [pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: { comments: result.rows, pageSize, pageNum }, code: 200 })
      }
    })
  },
  //获取评论总数，总页码让前端自己算
  getTotalComment: (req, res, next) => {
    let _sql = 'SELECT COUNT(*) AS total FROM comment;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        const total = Number(result.rows[0].total)
        res.status(200).json({ data: { total: total }, code: 200 })
      }
    })
  },
  //获取私信message
  getMessage: (req, res, next) => {
    // 用token中的id查询
    const user = req.user.id
    let pageSize = Number(req.body.pageSize) || 10
    let pageNum = Number(req.body.pageNum) || 1
    if (pageNum < 1) pageNum = 1
    if (pageSize < 1) pageSize = 10
    if (pageSize > 100) pageSize = 100
    let _sql = 'SELECT * FROM message WHERE user_id = $1 ORDER BY id LIMIT $2 OFFSET $3;'
    pool.query(_sql, [user, pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: { messages: result.rows, pageSize, pageNum }, code: 200 })
      }
    })
  },
  //获取私信总数
  getTotalMessage: (req, res, next) => {
    // 用token中的id查询
    const user = req.user.id
    let _sql = 'SELECT COUNT(*) AS total FROM message WHERE user_id = $1;'
    pool.query(_sql, [user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        const total = Number(result.rows[0].total)
        res.status(200).json({ data: { total: total }, code: 200 })
      }
    })
  },
  //将某一条私信标记为已读
  readMessage: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    let _sql = 'UPDATE message SET isread = 1 WHERE id = $1 and user_id = $2;'
    pool.query(_sql, [data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ error: '数据库更新错误' })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '私信标记为已读成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '私信不存在或已被标记' }, code: 404 })
        }
      }
    })
  },
  //获取文章
  getArticle: (req, res, next) => {
    const data = req.body
    const pageSize = data.pageSize || 10
    const pageNum = data.pageNum || 0
    let _sql = 'SELECT * FROM article ORDER BY id LIMIT $1 OFFSET $2;'
    pool.query(_sql, [pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: { articles: result.rows, pageSize, pageNum }, code: 200 })
      }
    })
  },
  //获取文章总数
  getTotalArticle: (req, res, next) => {
    let _sql = 'SELECT COUNT(*) AS total FROM article;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        const total = Number(result.rows[0].total)
        res.status(200).json({ data: { total: total }, code: 200 })
      }
    })
  },
  //修改文章的发布状态
  updateArticleStatus: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    // 文章状态0：草稿，1：已发布
    if (data.is_complained !== 0 && data.is_complained !== 1) {
      return res.status(400).json({ message: '发布状态参数错误' })
    }
    let _sql = 'UPDATE article SET is_complained = $1 WHERE id = $2;'
    pool.query(_sql, [data.is_complained, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库更新错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '文章发布状态更新成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '文章不存在或已被更新' }, code: 404 })
        }
      }
    })
  },
  //删除文章
  deleteArticle: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    let _sql = 'DELETE FROM article WHERE id = $1 and user_id = $2;'
    pool.query(_sql, [data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库删除错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '文章删除成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '文章不存在或已被删除' }, code: 404 })
        }
      }
    })
  },
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

  //获取标签
  getLabel: (req, res, next) => {
    let data = req.body?.label_name
    if (!data) {
      return res.status(400).json({ data: { error: '标签名称不能为空' }, code: 400 })
    }
    const user = req.user.id
    let _sql = 'SELECT * FROM label WHERE label_name = $1 and user_id = $2;'
    pool.query(_sql, [data, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: result.rows, code: 200 })
      }
    })
  },

  //新建标签
  insertLabel: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    if (!data.label_name) {
      return res.status(400).json({ data: { error: '标签名称不能为空' }, code: 400 })
    }
    let _sql = 'INSERT INTO label (label_name, user_id) VALUES ($1, $2);'
    pool.query(_sql, [data.label_name, user], (err, result) => {
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
  updateLabel: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    if (!data.label_name) {
      return res.status(400).json({ error: '标签名称不能为空' })
    }
    let _sql = 'UPDATE label SET label_name = $1 WHERE id = $2 and user_id = $3;'
    pool.query(_sql, [data.label_name, data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库更新错误' }, code: 500 })
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
  deleteLabel: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    let _sql = 'DELETE FROM label WHERE id = $1 and user_id = $2;'
    pool.query(_sql, [data.id, user], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库删除错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '标签删除成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '标签不存在或已被删除' }, code: 404 })
        }
      }
    })
  },
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
  //获取日记diary（分页查询）（模糊查询那些后面在做）
  getDiary: (req, res, next) => {
    const pageSize = req.body.pageSize || 10
    const pageNum = req.body.pageNum || 0
    const user = req.user.id
    let _sql = 'SELECT * FROM diary WHERE user_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3;'
    pool.query(_sql, [user, pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: result.rows, code: 200 })
      }
    })
  },
  //获取日记总数
  getTotalDiary: (req, res, next) => {
    let _sql = 'SELECT COUNT(*) FROM diary;'
    pool.query(_sql, (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库查询错误' }, code: 500 })
      } else {
        res.status(200).json({ data: result.rows[0].count, code: 200 })
      }
    })
  },
  //新建日记
  insertDiary: (req, res, next) => {
    const data = req.body
    const user = req.user.id
    let _sql = 'INSERT INTO diary (user_id, title, content) VALUES ($1, $2, $3);'
    pool.query(_sql, [user, data.title, data.content], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { error: '数据库插入错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '日记新建成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '日记不存在或已被新建' }, code: 404 })
        }
      }
    })
  },
}
export default serve
