//模拟前端发送请求
// fetch('http://localhost:3001/')
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

//用张三的号去登录
fetch('http://localhost:3001/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: '博客主',
    password: '123456',
  }),
})
  .then((res) => res.json())
  .then((json) => console.log(json))
  .catch((err) => console.error(err))

//用张三的号，去获取评论
// const token =
//   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6IuW8oOS4iSIsImlhdCI6MTc5MTIwMzg0OSwiZXhwIjoxNzkxODA4NjQ5fQ.jO7akibCTV4v-ADhZc9AUBdWVtHTqU8DkdGfOvxFeDY'
// fetch('http://localhost:3001/getComment', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//     Authorization: `Bearer ${token}`,
//   },
//   body: JSON.stringify({
//     pageSize: 10,
//     pageNum: 1,
//   }),
// })
//   .then((res) => res.json())
//   .then((json) => console.log(json))
//   .catch((err) => console.error(err))

const a = () => {
  let b = 1
  return () => {
    b++
  }
}
const c = a()
setInterval(() => {
  console.log(c())
}, 1000)
