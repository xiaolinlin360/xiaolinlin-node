import pool from '../model/db.js'
import fs from 'node:fs'
import path from 'node:path'
import { DATA_DIR } from '../config/data.js'
import { ok, fail } from '../lib/respond.js'
import loginController from './login/login.js'
import guestbookController from './guestbook/guestbook.js'
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
  getProfile: loginController.getProfile,
  updateProfile: loginController.updateProfile,
  getUsers: loginController.getUsers,
  addUser: loginController.addUser,
  updatePermission: loginController.updatePermission,
  //留言板
  getGuestbook: guestbookController.getGuestbook,
  getTotalGuestbook: guestbookController.getTotalGuestbook,
  insertGuestbook: guestbookController.insertGuestbook,
  deleteGuestbook: guestbookController.deleteGuestbook,
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
  getStorageSize: fileController.getStorageSize,
  //画廊
  getGallery: galleryController.getGallery,
  getTotalGallery: galleryController.getTotalGallery,
  getGalleryDetail: galleryController.getGalleryDetail,
  insertGallery: galleryController.insertGallery,
  updateGallery: galleryController.updateGallery,
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
      return fail(res, 400, '没有收到文件')
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
      return fail(res, 500, '文件入库失败')
    }

    ok(
      res,
      {
        id: fileId, // 给文章的 cover_file_id 用
        url,
        file_name: file.filename,
        size: file.size,
        type: file.mimetype,
      },
      '上传成功'
    )
  },

  // 冒烟用的探针接口，确认服务活着
  v3pz: (req, res) => {
    ok(res, null, 'v3pz')
  },
}
export default serve
