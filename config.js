// XDE130 V6 配置文件
// 1）普通访问密码：进入系统使用
// 2）管理员密码：查看登录痕迹和查询记录使用
// 3）Supabase：可选。填写后可集中记录所有用户登录/查询；不填写则只保存当前浏览器本地记录。
window.XDE130_CONFIG = {
  LOGIN_PASSWORD: "XDE130@2026",
  ADMIN_PASSWORD: "XDE130-ADMIN",

  // 可选：Supabase 项目地址和 anon key
  // SUPABASE_URL: "https://xxxx.supabase.co",
  // SUPABASE_ANON_KEY: "eyJhbGciOi..."
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: ""
};
