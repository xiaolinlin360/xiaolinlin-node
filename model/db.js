//数据库连接
import pg from 'pg'
import { config } from '../config/default.js' // 如果用了 export default

const { Pool } = pg
const pool = new Pool(config.database) // 直接把 config.database 传进去，完美对应！
const dbTables = {
  // 分类表
  category: `
    CREATE TABLE IF NOT EXISTS category (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,

  // 天气表
  weather: `
    CREATE TABLE IF NOT EXISTS weather (
        id SERIAL PRIMARY KEY,
        weather_name VARCHAR(32) NOT NULL UNIQUE,
        icon VARCHAR(100)
    );
  `,

  // 用户表
  users: `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        mail VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        imgurl VARCHAR(255),
        role SMALLINT NOT NULL DEFAULT 1 CHECK (role IN (0, 1)),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,

  // 子分类表
  subset: `
    CREATE TABLE IF NOT EXISTS subset (
        id SERIAL PRIMARY KEY,
        subset_name VARCHAR(100) NOT NULL,
        category_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_subset_category FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE RESTRICT,
        CONSTRAINT uq_subset_name_category UNIQUE (subset_name, category_id)
    );
  `,

  // 文章表
  article: `
    CREATE TABLE IF NOT EXISTS article (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        subset_id INT,
        category_id INT NOT NULL,
        introduce VARCHAR(1000),
        content TEXT,
        cover VARCHAR(255),
        views INT DEFAULT 0,
        state INT DEFAULT 0, --0=草稿，1=已发布，2=审核中，3=已删除
        author_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_article_subset FOREIGN KEY (subset_id) REFERENCES subset(id) ON DELETE SET NULL,
        CONSTRAINT fk_article_category FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE RESTRICT,
        CONSTRAINT fk_article_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
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
        uploader_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_file_subset FOREIGN KEY (subset_id) REFERENCES subset(id) ON DELETE SET NULL,
        CONSTRAINT fk_file_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `,

  // 标签表
  label: `
    CREATE TABLE IF NOT EXISTS label (
        id SERIAL PRIMARY KEY,
        label_name VARCHAR(100) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_label_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `,

  // 文章-标签关联表
  article_label: `
    CREATE TABLE IF NOT EXISTS article_label (
        article_id INT NOT NULL,
        label_id INT NOT NULL,
        PRIMARY KEY (article_id, label_id),
        CONSTRAINT fk_article_label_article FOREIGN KEY (article_id) REFERENCES article(id) ON DELETE CASCADE,
        CONSTRAINT fk_article_label_label FOREIGN KEY (label_id) REFERENCES label(id) ON DELETE CASCADE
    );
  `,

  // 点赞表
  praise: `
    CREATE TABLE IF NOT EXISTS praise (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        article_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_praise_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_praise_article FOREIGN KEY (article_id) REFERENCES article(id) ON DELETE CASCADE,
        CONSTRAINT uq_praise_user_article UNIQUE (user_id, article_id)
    );
  `,

  // 评论表
  comments: `
    CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        article_id INT NOT NULL,
        user_id INT NOT NULL,
        content VARCHAR(1000) NOT NULL,
        is_complained INT DEFAULT 0 CHECK (is_complained IN (0, 1)),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_comments_article FOREIGN KEY (article_id) REFERENCES article(id) ON DELETE CASCADE,
        CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
        author_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_diary_weather FOREIGN KEY (weather_id) REFERENCES weather(id) ON DELETE SET NULL,
        CONSTRAINT fk_diary_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `,

  // 私信表
  message: `
    CREATE TABLE IF NOT EXISTS message (
        id SERIAL PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        msg_type INT DEFAULT 1 CHECK (msg_type IN (0, 1)),
        content VARCHAR(1000) NOT NULL,
        is_read INT DEFAULT 0 CHECK (is_read IN (0, 1)),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_message_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_message_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `,

  // 记录表
  record: `
    CREATE TABLE IF NOT EXISTS record (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        position VARCHAR(100),
        is_read INT DEFAULT 0 CHECK (is_read IN (0, 1)),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_record_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
