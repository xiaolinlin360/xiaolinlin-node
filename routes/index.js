import serve from '../controller/serve.js'
import { auth } from '../lib/auth.js'
// 上传配置在 config/data.js 里统一维护（存储目录、文件名清洗、大小限制）
import { upload } from '../config/data.js'

//req 请求对象，res 响应对象，next 中间件函数
export const hi = (app) => {
  app.get('/', auth, (req, res) => {
    res.send('Hello World!')
  })
}
//验证是否注册
export const isRegistered = (app) => {
  app.post('/user/isRegistered', (req, res) => {
    serve.isRegistered(req, res)
  })
}
//注册用户
export const insertUser = (app) => {
  app.post('/user/insertUser', (req, res) => {
    serve.insertUser(req, res)
  })
}

//注册登录
export const login = (app) => {
  app.post('/user/login', (req, res) => {
    serve.login(req, res)
  })
}

//获取评论
export const getComment = (app) => {
  app.post('/comments/getComment', auth, (req, res) => {
    serve.getComment(req, res)
  })
}

//获取评论总数，总页码让前端自己算
export const getTotalComment = (app) => {
  app.post('/comments/getTotalComment', auth, (req, res) => {
    serve.getTotalComment(req, res)
  })
}

//删除评论
export const deleteComment = (app) => {
  app.post('/comments/deleteComment', auth, (req, res) => {
    serve.deleteComment(req, res)
  })
}

//获取私信message
export const getMessage = (app) => {
  app.post('/messages/getMessage', auth, (req, res) => {
    serve.getMessage(req, res)
  })
}

//获取私信总数
export const getTotalMessage = (app) => {
  app.post('/messages/getTotalMessage', auth, (req, res) => {
    serve.getTotalMessage(req, res)
  })
}

//将某一条私信标记为已读
export const readMessage = (app) => {
  app.post('/messages/read', auth, (req, res) => {
    serve.readMessage(req, res)
  })
}

//获取文章
export const getArticle = (app) => {
  app.post('/article/getArticle', auth, (req, res) => {
    serve.getArticle(req, res)
  })
}

//获取文章总数
export const getTotalArticle = (app) => {
  app.post('/article/getTotalArticle', auth, (req, res) => {
    serve.getTotalArticle(req, res)
  })
}

//获取文章详情（编辑回显）
export const getArticleDetail = (app) => {
  app.post('/article/getArticleDetail', auth, (req, res) => {
    serve.getArticleDetail(req, res)
  })
}

//新建文章
export const insertArticle = (app) => {
  app.post('/article/insertArticle', auth, (req, res) => {
    serve.insertArticle(req, res)
  })
}

//编辑文章
export const updateArticle = (app) => {
  app.post('/article/updateArticle', auth, (req, res) => {
    serve.updateArticle(req, res)
  })
}

//修改文章的发布状态
export const updateArticleStatus = (app) => {
  app.post('/article/updateArticleStatus', auth, (req, res) => {
    serve.updateArticleStatus(req, res)
  })
}

//删除文章
export const deleteArticle = (app) => {
  app.post('/article/deleteArticle', auth, (req, res) => {
    serve.deleteArticle(req, res)
  })
}

//获取分组分类
export const getCategory = (app) => {
  app.post('/subsets/getCategory', auth, (req, res) => {
    serve.getCategory(req, res)
  })
}
//获取分组
export const getSubset = (app) => {
  app.post('/subsets/getSubset', auth, (req, res) => {
    serve.getSubset(req, res)
  })
}

//新建分组
export const insertSubset = (app) => {
  app.post('/subsets/insertSubset', auth, (req, res) => {
    serve.insertSubset(req, res)
  })
}

//修改分组名字
export const updateSubset = (app) => {
  app.post('/subsets/updateSubset', auth, (req, res) => {
    serve.updateSubset(req, res)
  })
}

//删除分组
export const deleteSubset = (app) => {
  app.post('/subsets/deleteSubset', auth, (req, res) => {
    serve.deleteSubset(req, res)
  })
}

//获取标签
export const getLabels = (app) => {
  app.post('/labels/getLabels', auth, (req, res) => {
    serve.getLabels(req, res)
  })
}

//新建标签
export const insertLabels = (app) => {
  app.post('/labels/insertLabels', auth, (req, res) => {
    serve.insertLabels(req, res)
  })
}

//修改标签
export const updateLabels = (app) => {
  app.post('/labels/updateLabels', auth, (req, res) => {
    serve.updateLabels(req, res)
  })
}

//删除标签
export const deleteLabels = (app) => {
  app.post('/labels/deleteLabels', auth, (req, res) => {
    serve.deleteLabels(req, res)
  })
}

//获取文件（分页查询）
export const getFile = (app) => {
  app.post('/files/getFile', auth, (req, res) => {
    serve.getFile(req, res)
  })
}

//获取文件总数
export const getTotalFile = (app) => {
  app.post('/files/getTotalFile', auth, (req, res) => {
    serve.getTotalFile(req, res)
  })
}

//上传文件
export const uploadFile = (app) => {
  app.post(
    '/files/uploadFile',
    auth,
    // 单独包一层，把 multer 的异常转成 JSON（否则会走默认错误页，前端拿到 HTML）
    (req, res, next) => {
      upload.single('file')(req, res, (err) => {
        if (err) {
          const message =
            err.code === 'LIMIT_FILE_SIZE' ? '文件超过 50MB 限制' : `文件上传失败：${err.message}`
          return res.status(400).json({ code: 400, message, data: null })
        }
        next()
      })
    },
    (req, res) => {
      serve.uploadFile(req, res)
    }
  )
}

//移动文件到不同的分类（修改subset id）
// export const moveFile = (app) => {
//   app.post('/files/moveFile', auth, (req, res) => {
//     serve.moveFile(req, res)
//   })
// }

//画廊
export const getGallery = (app) => {
  app.post('/gallerys/getGallery', auth, (req, res) => {
    serve.getGallery(req, res)
  })
}
//获取画廊总数
export const getTotalGallery = (app) => {
  app.post('/gallerys/getTotalGallery', auth, (req, res) => {
    serve.getTotalGallery(req, res)
  })
}
//删除画廊
export const deleteGallery = (app) => {
  app.post('/gallerys/deleteGallery', auth, (req, res) => {
    serve.deleteGallery(req, res)
  })
}

//笔记
//获取笔记（分页查询）
export const getNotes = (app) => {
  app.post('/notes/getNotes', auth, (req, res) => {
    serve.getNotes(req, res)
  })
}
//获取笔记总数
export const getTotalNotes = (app) => {
  app.post('/notes/getTotalNotes', auth, (req, res) => {
    serve.getTotalNotes(req, res)
  })
}
//新建笔记
export const insertNotes = (app) => {
  app.post('/notes/insertNotes', auth, (req, res) => {
    serve.insertNotes(req, res)
  })
}
//修改笔记
export const updateNotes = (app) => {
  app.post('/notes/updateNotes', auth, (req, res) => {
    serve.updateNotes(req, res)
  })
}
//删除笔记
export const deleteNotes = (app) => {
  app.post('/notes/deleteNotes', auth, (req, res) => {
    serve.deleteNotes(req, res)
  })
}

//测试v3pz
export const v3pz = (app) => {
  app.get('/v3pz', auth, (req, res) => {
    serve.v3pz(req, res)
  })
}
