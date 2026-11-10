import pool from '../model/db.js'
import fs from 'node:fs'
import path from 'node:path'
import { DATA_DIR } from '../config/data.js'
import loginController from './login/login.js'
import commentController from './comment/comment.js'
import messageController from './message/message.js'
import articleController from './article/article.js'
import subsetController from './subset/subset.js'
import labelController from './label/labels.js'
import fileController from './file/file.js'
import categoryController from './subset/category.js'
import galleryController from './gallerys/gallerys.js'
import notesController from './notes/notes.js'

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
  getArticleDetail: articleController.getArticleDetail,
  insertArticle: articleController.insertArticle,
  updateArticle: articleController.updateArticle,
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
  //笔记
  getNotes: notesController.getNotes,
  updateNotes: notesController.updateNotes,
  getTotalNotes: notesController.getTotalNotes,
  deleteNotes: notesController.deleteNotes,
  insertNotes: notesController.insertNotes,

  //上传文件（笔记/文章内嵌图片、文章封面等）
  uploadFile: async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ code: 400, message: '没有收到文件', data: null })
    }

    // 文件已由 config/data.js 的 diskStorage 落到 data/<fileId>/<filename>
    const { fileId, file } = req
    const url = `/data/${fileId}/${encodeURIComponent(file.filename)}`

    // 落库：articles.cover_file_id 是指向 files(id) 的外键，
    // 没有这条记录就无法作为封面引用；顺带也让文件出现在「本地文件」页。
    try {
      await pool.query(
        `INSERT INTO files (id, user_id, file_name, type, size, url)
         VALUES ($1, $2, $3, $4, $5, $6);`,
        [fileId, req.user.id, file.filename, file.mimetype, String(file.size), url]
      )
    } catch (err) {
      console.error('[uploadFile] 入库失败:', err)
      // 入库失败就把刚落盘的文件删掉，避免留下没有记录的孤儿文件
      fs.rmSync(path.join(DATA_DIR, fileId), { recursive: true, force: true })
      return res.status(500).json({ code: 500, message: '文件入库失败', data: null })
    }

    return res.status(200).json({
      code: 200,
      message: '上传成功',
      data: {
        id: fileId, // 给文章的 cover_file_id 用
        url,
        file_name: file.filename,
        size: file.size,
        type: file.mimetype,
      },
    })
  },

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
