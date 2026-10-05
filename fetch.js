//模拟前端发送请求
// fetch('http://localhost:3001/')
//   .then((res) => res.json())
//   .then((json) => console.log(json))
//   .catch((err) => console.error(err))

// post注册一个用户
fetch('http://localhost:3001/insertUser', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    id: 1,
    name: '张三',
    mail: 'zhangsan@example.com',
    password: '123456',
    imgurl:
      'https://i1.hdslb.com/bfs/banner/cc9fa046f3b5367b45cf7997cdae837e046ac9b1.jpg@976w_550h_!web-home-carousel-cover.avif?mirror_report_swipe=1',
  }),
})
  .then((res) => res.json())
  .then((json) => console.log(json))
  .catch((err) => console.error(err))
