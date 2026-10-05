export const config = {
  port: 3001,
  database: {
    host: 'localhost',
    user: 'postgres',
    password: 'hegansuaN1.',
    database: 'demo', //数据库名称
    port: 5432, // 加上端口
    max: 20, // 连接池最大连接数（可选，pg默认10）
    idleTimeoutMillis: 30000, // 连接空闲超时时间（可选）
  },
}
