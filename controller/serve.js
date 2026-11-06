import pool from '../model/db.js'
import loginController from './login/login.js'
import commentController from './comment/comment.js'
import messageController from './message/message.js'
import articleController from './article/article.js'
import subsetController from './subset/subset.js'
import labelController from './label/labels.js'
import fileController from './file/file.js'
import categoryController from './subset/category.js'
import galleryController from './gallerys/gallerys.js'

const serve = {
  //登录注册
  isRegistered: loginController.isRegistered,
  login: loginController.login,
  insertUser: loginController.insertUser,
  //评论
  getComment: commentController.getComment,
  getTotalComment: commentController.getTotalComment,
  deleteComment: commentController.deleteComment,
  //消息
  getMessage: messageController.getMessage,
  getTotalMessage: messageController.getTotalMessage,
  readMessage: messageController.readMessage,
  //文章
  getArticle: articleController.getArticle,
  getTotalArticle: articleController.getTotalArticle,
  updateArticleStatus: articleController.updateArticleStatus,
  deleteArticle: articleController.deleteArticle,
  //子集
  getCategory: categoryController.getCategory, //获取分组分类
  getSubset: subsetController.getSubset,
  insertSubset: subsetController.insertSubset,
  updateSubset: subsetController.updateSubset,
  deleteSubset: subsetController.deleteSubset,
  //标签
  getLabels: labelController.getLabels,
  insertLabels: labelController.insertLabels,
  updateLabels: labelController.updateLabels,
  deleteLabels: labelController.deleteLabels,
  //文件
  getFile: fileController.getFile,
  getTotalFile: fileController.getTotalFile,
  //画廊
  getGallery: galleryController.getGallery,
  getTotalGallery: galleryController.getTotalGallery,
  deleteGallery: galleryController.deleteGallery,
  // moveFile: fileController.moveFile,
  //获取日记diary（分页查询）（模糊查询那些后面在做）
  getDiary: (req, res, next) => {
    const pageSize = req.body.pageSize || 10
    const pageNum = req.body.pageNum || 0
    const user = req.user.id
    let _sql = 'SELECT * FROM diary WHERE user_id = $1 ORDER BY id DESC LIMIT $2 OFFSET $3;'
    pool.query(_sql, [user, pageSize, (pageNum - 1) * pageSize], (err, result) => {
      if (err) {
        console.error(err)
        res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
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
        res.status(500).json({ data: { message: '数据库查询错误' }, code: 500 })
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
        res.status(500).json({ data: { message: '数据库插入错误' }, code: 500 })
      } else {
        if (result.rowCount > 0) {
          res.status(200).json({ data: { message: '日记新建成功' }, code: 200 })
        } else {
          res.status(404).json({ data: { message: '日记不存在或已被新建' }, code: 404 })
        }
      }
    })
  },
  v3pz: (req, res, next) => {
    res.status(200).json({ data: { message: 'v3pz' }, code: 200 })
  },
}
export default serve
