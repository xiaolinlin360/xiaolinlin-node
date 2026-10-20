// 模拟前端发送请求
// fetch('http://localhost:3001/user/login', {
//   method: 'post',
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   body: JSON.stringify({
//     name: '博主A',
//     password: 'password123',
//   }),
// })
//   .then((res) => res.json())
//   .then((json) => console.log(json))
//   .catch((err) => console.error(err))

// post注册一个用户
// fetch('http://localhost:3001/insertUser', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   body: JSON.stringify({
//     id: 3,
//     name: '王五',
//     mail: 'wangwu@example.com',
//     password: '123456',
//     imgurl:
//       'https://i1.hdslb.com/bfs/banner/cc9fa046f3b5367b45cf7997cdae837e046ac9b1.jpg@976w_550h_!web-home-carousel-cover.avif?mirror_report_swipe=1',
//   }),
// })
//   .then((res) => res.json())
//   .then((json) => console.log(json))
//   .catch((err) => console.error(err))

// 用张三的号去登录

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjExMTExMTExLTExMTEtMTExMS0xMTExLTExMTExMTExMTExMSIsIm5hbWUiOiLljZrkuLtBIiwiaWF0IjoxNzkyMzM5MzAwLCJleHAiOjE3OTI5NDQxMDB9.NAyANMB50A9S4osinCDhBcpPvpVnoNeap1tzQWH3IB0'
fetch('http://localhost:3001/messages/getMessage', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    pageSize: 10,
    pageNum: 1,
  }),
})
  .then((res) => res.json())
  .then((json) => console.dir(json, { depth: null }))
  .catch((err) => console.error(err))

// 用张三的号，去获取评论
// const token =
//   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6IuWNmuWuouS4uyIsImlhdCI6MTc5MTYwMDYwMywiZXhwIjoxNzkyMjA1NDAzfQ.wKcFRdryOfPYKiRxZSiamDqucqtjbyCcYBHX7uTWeT8'
// fetch('http://localhost:3001/v3pz', {
//   method: 'get',
//   headers: {
//     'Content-Type': 'application/json',
//     Authorization: `Bearer ${token}`,
//   },
// })
//   .then((res) => res.json())
//   .then((json) => console.dir(json, { depth: null }))
//   .catch((err) => console.error(err))

// const a = () => {
//   let b = 1
//   return () => {
//     b++
//   }
// }
// const c = a()
// setInterval(() => {
//   console.log(c())
// }, 1000)

// const category = {
//   文章: {
//     已经发布的文章: {
//       id: 1,
//       title: '文章1',
//       content: '这是文章1的内容',
//       created_at: '2023-01-01 10:00:00',
//       updated_at: '2023-01-01 10:00:00',
//       user_id: 1,
//       subset_id: 1,
//       file_id: 1,
//     },
//     未发布的文章: {},
//     xiaolinlin的文章: {},
//   },
//   摄影: {},
// }
