const url = "https://ekprysxfgkafpwjbocab.supabase.co/rest/v1/products?select=id,name,description,price,image_url,user_id,status&id=eq.c39b0ddc-78b9-4aa3-a868-4bcdb5126bda";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcHJ5c3hmZ2thZnB3amJvY2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTA3MTQsImV4cCI6MjA5MTkyNjcxNH0.vGMD8DxQ9b6A9jU9ScUhnSiR6JQThuyEvedSxMz2eQE";

fetch(url, {
  headers: {
    "apikey": key,
    "Authorization": `Bearer ${key}`
  }
}).then(res => res.json()).then(console.log).catch(console.error);
