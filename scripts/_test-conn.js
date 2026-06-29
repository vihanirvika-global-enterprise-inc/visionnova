const postgres = require('postgres')

const sql = postgres({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.yezyvmtphlmhjwnvmxbi',
  password: 'Hemanth@321672',
  ssl: 'require',
  prepare: false,
  max: 1,
})

sql`SELECT current_user AS u, version() AS v`
  .then(r => { console.log('connected OK — user:', r[0].u); console.log('pg version:', r[0].v.split(' ').slice(0,2).join(' ')); return sql.end() })
  .catch(e => { console.error('error:', e.message); return sql.end() })
