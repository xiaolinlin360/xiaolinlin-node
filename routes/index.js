import serve from '../controller/serve.js'
import { auth } from '../lib/auth.js'

//req 请求对象，res 响应对象，next 中间件函数
export const hi = (app) => {
  app.get('/', auth, (req, res) => {
    res.send('Hello World!')
  })
}
//验证是否注册
export const isRegistered = (app) => {
  app.post('/isRegistered', (req, res) => {
    serve.isRegistered(req, res)
  })
}
//注册用户
export const insertUser = (app) => {
  app.post('/insertUser', (req, res) => {
    serve.insertUser(req, res)
  })
}

//注册登录
export const login = (app) => {
  app.post('/login', (req, res) => {
    serve.login(req, res)
  })
}
