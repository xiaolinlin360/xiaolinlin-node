//数据库连接
import pg from 'pg'
import { config } from '../config/default.js' // 如果用了 export default

const { Pool } = pg
const pool = new Pool(config.database) // 直接把 config.database 传进去，完美对应！

const dbTables = {
  // 用户表
  users: `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            mail VARCHAR(100) NOT NULL,
            password VARCHAR(255) NOT NULL,
            imgurl VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,

  // 分类表
  subset: `
        CREATE TABLE IF NOT EXISTS subset (
            id SERIAL PRIMARY KEY,
            subset_name VARCHAR(100) NOT NULL,
            classify INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,

  // 文件表
  file: `
        CREATE TABLE IF NOT EXISTS file (
            id SERIAL PRIMARY KEY,
            url VARCHAR(255) NOT NULL,
            file_name VARCHAR(100) NOT NULL,
            format VARCHAR(32) NOT NULL,
            subset_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,

  // 文章表
  article: `
        CREATE TABLE IF NOT EXISTS article (
            id SERIAL PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            subset_id INT,
            classify INT NOT NULL,
            label VARCHAR(200),
            introduce VARCHAR(1000),
            content TEXT,
            cover VARCHAR(255),
            views INT DEFAULT 0,
            state INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,

  // 点赞表
  praise: `
        CREATE TABLE IF NOT EXISTS praise (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            user_type INT NOT NULL,
            article_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,

  // 评论表（表名 comment 是 PostgreSQL 关键字，必须加双引号）
  comment: `
        CREATE TABLE IF NOT EXISTS "comment" (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            user_type INT NOT NULL,
            user_name VARCHAR(100),
            article_id INT NOT NULL,
            content VARCHAR(1000) NOT NULL,
            complaint INT DEFAULT 0,
            isread INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,

  // 标签表
  label: `
        CREATE TABLE IF NOT EXISTS label (
            id SERIAL PRIMARY KEY,
            label_name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,

  // 日记表
  diary: `
        CREATE TABLE IF NOT EXISTS diary (
            id SERIAL PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            content TEXT NOT NULL,
            picture VARCHAR(500),
            weather_id INT,
            mood INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,

  // 天气表
  weather: `
        CREATE TABLE IF NOT EXISTS weather (
            id SERIAL PRIMARY KEY,
            weather_name VARCHAR(32) NOT NULL,
            icon VARCHAR(100)
        );
    `,

  // 消息表
  message: `
        CREATE TABLE IF NOT EXISTS message (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            user_type INT NOT NULL,
            user_name VARCHAR(100),
            content VARCHAR(1000) NOT NULL,
            isread INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,

  // 记录表
  record: `
        CREATE TABLE IF NOT EXISTS record (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            user_type INT NOT NULL,
            position VARCHAR(100),
            isread INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,
}
// 创建所有表
// 注意：PostgreSQL 没有 "create database if not exists" 这种写法，
// 所以数据库 xxblog 请你提前手动建好（用 pgAdmin 右键新建，或命令行 createdb xxblog）
// 这里只负责建表
export const create = async () => {
  for (const table of Object.values(dbTables)) {
    await pool.query(table) // 用连接池执行建表语句
  }
  console.log('所有表创建完成')
}
export default pool
