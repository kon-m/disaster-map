// supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// 自分のプロジェクトのURLとANONキーを入れる
const supabaseUrl = 'https://abkgtpwgismouppkzspf.supabase.co'
const supabaseAnonKey = 'sb_publishable_muZzmqrIEGmA5NzdccAj4w_TmFrjAd3'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
