// //查询数据库是否注册
// import pool from './db.js'
// const query = (text, params) => pool.query(text, params)
// const isRegistered = async (userId) => {
//   const result = await query('SELECT * FROM users WHERE id = $1', [userId])
//   return result.rows.length > 0
// }
// export default {
//   isRegistered,
// }
