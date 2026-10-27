//数据库连接
import pg from 'pg'
import { config } from '../config/default.js' // 如果用了 export default

const { Pool } = pg
const pool = new Pool(config.database) // 直接把 config.database 传进去，完美对应！
const dbTables = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        imgurl TEXT, -- 头像路径
        is_deleted bool NOT NULL DEFAULT FALSE, -- 是否删除(默认未删除false)
        created_at TIMESTAMP DEFAULT NOW()
    );
  `,

  category: `
    CREATE TABLE IF NOT EXISTS category (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
  `,

  subsets: `
    CREATE TABLE IF NOT EXISTS subsets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        category_id UUID NOT NULL, -- 分类id
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_subsets_category_id_to_category_id FOREIGN KEY (category_id) REFERENCES category (id)
    );
  `,

  files: `
    CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id UUID NOT NULL, -- 上传用户id
        file_name TEXT NOT NULL,
        type TEXT NOT NULL, -- 文件类型
        size TEXT NOT NULL, -- 文件大小
        url TEXT NOT NULL, -- 文件路径
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_files_user_id_to_users_id FOREIGN KEY (user_id) REFERENCES users (id)
    );
  `,
  articles: `
    CREATE TABLE IF NOT EXISTS articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id UUID NOT NULL,
        subset_id UUID NOT NULL, -- 子集id
        title VARCHAR(40) NOT NULL,
        introduce VARCHAR(400) NOT NULL, -- 介绍
        file_id UUID, -- 文件id
        cover_file_id UUID, -- 封面文件id
        state bool NOT NULL DEFAULT FALSE, -- 状态(是否发布,默认不发布false)
        content TEXT NOT NULL, -- 内容
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_articles_user_id_to_users_id FOREIGN KEY (user_id) REFERENCES users (id),
        CONSTRAINT fk_articles_subset_id_to_subsets_id FOREIGN KEY (subset_id) REFERENCES subsets (id),
        CONSTRAINT fk_articles_file_id_to_files_id FOREIGN KEY (file_id) REFERENCES files (id),
        CONSTRAINT fk_articles_cover_file_id_to_files_id FOREIGN KEY (cover_file_id) REFERENCES files (id)
    );
  `,

  labels: `
    CREATE TABLE IF NOT EXISTS labels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        label_name VARCHAR(30) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
  `,

  article_label: `
    CREATE TABLE IF NOT EXISTS article_label (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        article_id UUID NOT NULL,
        label_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_article_label_article_id_to_articles_id FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
        CONSTRAINT fk_article_label_label_id_to_labels_id FOREIGN KEY (label_id) REFERENCES labels (id)
    );
  `,

  praise: `
    CREATE TABLE IF NOT EXISTS praise (
        PRIMARY KEY (user_id, article_id), -- 主键(用户id,文章id)
        user_id UUID NOT NULL,
        article_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_praise_user_id_to_users_id FOREIGN KEY (user_id) REFERENCES users (id),
        CONSTRAINT fk_praise_article_id_to_articles_id FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE 
    );
  `,

  comments: `
    CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        user_id UUID NOT NULL,
        article_id UUID NOT NULL,
        parent_id UUID,
        reply_to_user_id UUID, -- 回复的用户id
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_comments_user_id_to_users_id FOREIGN KEY (user_id) REFERENCES users (id),
        CONSTRAINT fk_comments_article_id_to_articles_id FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE, 
        CONSTRAINT fk_comments_reply_to_user_id_to_users_id FOREIGN KEY (reply_to_user_id) REFERENCES users (id),
        CONSTRAINT fk_comments_parent_id_to_comments_id FOREIGN KEY (parent_id) REFERENCES comments (id) on delete cascade
    );
  `,

  messages: `
    CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
        send_user_id UUID NOT NULL, -- 发送用户id
        receiver_user_id UUID NOT NULL, -- 接收用户id
        content TEXT NOT NULL, -- 内容
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT fk_messages_send_user_id_to_users_id FOREIGN KEY (send_user_id) REFERENCES users (id),
        CONSTRAINT fk_messages_receiver_user_id_to_users_id FOREIGN KEY (receiver_user_id) REFERENCES users (id)
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
