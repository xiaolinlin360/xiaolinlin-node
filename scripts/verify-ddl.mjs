/**
 * DDL 一致性守卫（schema drift guard）
 *
 * 作用：证明 model/db.js 里的建表语句「真的能重放」出线上库的结构。
 * 做法：在一个临时数据库里跑一遍 create()，再与目标库逐列、逐外键比对，最后删掉临时库。
 *
 * 用法：
 *   cd "D:\java的D盘\node"
 *   node scripts/verify-ddl.mjs            # 默认比对 demo 库
 *   TARGET_DB=demo node scripts/verify-ddl.mjs
 *
 * 什么时候跑：每次手工 ALTER TABLE 之后。有差异就说明 db.js 漏同步了——
 * 别人（或换机器）用 db.js 重建库时就会静默丢功能。
 */
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import pg from 'pg'
import { config } from '../config/default.js'

const TARGET_DB = process.env.TARGET_DB || config.database.database
const TEMP_DB = `${TARGET_DB}_ddlcheck`
const DB_JS = fileURLToPath(new URL('../model/db.js', import.meta.url))
const TMP_MODEL = fileURLToPath(new URL(`../model/_verify_db_tmp_${process.pid}.mjs`, import.meta.url))
const { Pool } = pg

const admin = new Pool({ ...config.database, database: 'postgres' })

const snapshot = async (database) => {
  const p = new Pool({ ...config.database, database })
  try {
    const cols = await p.query(`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position`)
    const fks = await p.query(`
      SELECT c.conname, pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public' AND c.contype = 'f'
      ORDER BY c.conname`)
    return { cols: cols.rows, fks: fks.rows }
  } finally {
    await p.end()
  }
}

const main = async () => {
  // 1. 生成一份指向临时库的 db.js 副本（只替换 config 导入这一行）
  const src = await readFile(DB_JS, 'utf8')
  const patched = src.replace(
    /import\s*\{\s*config\s*\}\s*from\s*'\.\.\/config\/default\.js'.*/,
    `const config = ${JSON.stringify({ database: { ...config.database, database: TEMP_DB } })}`
  )
  if (patched === src) throw new Error('替换 config 导入失败，请检查 model/db.js 顶部')
  await writeFile(TMP_MODEL, patched, 'utf8')

  // 2. 建临时库并跑 create()
  await admin.query(`DROP DATABASE IF EXISTS ${TEMP_DB}`)
  await admin.query(`CREATE DATABASE ${TEMP_DB}`)
  console.log(`✓ 临时库已建 ${TEMP_DB}`)

  const mod = await import(`${pathToFileURL(TMP_MODEL).href}?t=${Date.now()}`)
  await mod.create()

  // 3. 逐列、逐外键比对
  const fresh = await snapshot(TEMP_DB)
  const live = await snapshot(TARGET_DB)

  const key = (r) => `${r.table_name}.${r.column_name}`
  const freshCols = new Map(fresh.cols.map((r) => [key(r), r.data_type]))
  const liveCols = new Map(live.cols.map((r) => [key(r), r.data_type]))
  const onlyFresh = [...freshCols.keys()].filter((k) => !liveCols.has(k))
  const onlyLive = [...liveCols.keys()].filter((k) => !freshCols.has(k))
  const typeDiff = [...freshCols.keys()]
    .filter((k) => liveCols.has(k) && freshCols.get(k) !== liveCols.get(k))
    .map((k) => `${k}: db.js=${freshCols.get(k)} / 线上=${liveCols.get(k)}`)

  const norm = (s) => s.replace(/\s+/g, ' ').replace(/"/g, '').trim()
  const freshFk = new Map(fresh.fks.map((r) => [r.conname, norm(r.def)]))
  const liveFk = new Map(live.fks.map((r) => [r.conname, norm(r.def)]))
  const fkDiff = []
  for (const name of new Set([...freshFk.keys(), ...liveFk.keys()])) {
    const a = freshFk.get(name)
    const b = liveFk.get(name)
    if (!a) fkDiff.push(`只在线上: ${name} → ${b}`)
    else if (!b) fkDiff.push(`只在 db.js: ${name} → ${a}`)
    else if (a !== b) fkDiff.push(`定义不同: ${name}\n     db.js: ${a}\n     线上 : ${b}`)
  }

  console.log(`\n列: db.js ${freshCols.size} / ${TARGET_DB} ${liveCols.size}`)
  console.log('只在新库有:', onlyFresh.length ? onlyFresh : '无')
  console.log('只在线上有:', onlyLive.length ? onlyLive : '无')
  console.log('类型不同  :', typeDiff.length ? typeDiff : '无')
  console.log(`\n外键: db.js ${freshFk.size} / ${TARGET_DB} ${liveFk.size}`)
  console.log('差异      :', fkDiff.length ? fkDiff : '无')

  const clean = !onlyFresh.length && !onlyLive.length && !typeDiff.length && !fkDiff.length
  console.log(clean ? '\n✅ 一致：db.js 可以完整重放线上结构' : '\n❌ 不一致：db.js 需要同步（见上方差异）')
  if (!clean) process.exitCode = 1

  await mod.default.end()
}

try {
  await main()
} catch (e) {
  console.error('校验失败:', e.message)
  process.exitCode = 1
} finally {
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${TEMP_DB}`)
  } catch (e) {
    console.error('清理临时库失败:', e.message)
  }
  await admin.end()
  await unlink(TMP_MODEL).catch(() => {})
}
