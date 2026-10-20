import { config } from './config/default.js'
import express from 'express'
import cors from 'cors'
import * as routes from './routes/index.js'
import { create } from './model/db.js'
create()
const app = express()
const port = config.port
// 配置 CORS(跨域资源共享) 中间件
app.use(
  cors({
    origin: true, // 替换成你的前端地址，或者写 true 允许所有
    credentials: true, // 允许携带 Cookie
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'x-custom-header',
    ],
  })
)

// 静态文件目录
app.use(express.static(import.meta.dirname + '/data'))

//解析前端数据
app.use(express.json())

// 路由
Object.values(routes).forEach((register) => {
  if (typeof register === 'function') {
    register(app)
  }
})
app.listen(port, () => {
  console.log(`服务器启动成功，监听端口：${port}`)
})
