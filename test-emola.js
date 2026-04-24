const url = "https://ekprysxfgkafpwjbocab.supabase.co/functions/v1/process-payment";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrcHJ5c3hmZ2thZnB3amJvY2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTA3MTQsImV4cCI6MjA5MTkyNjcxNH0.vGMD8DxQ9b6A9jU9ScUhnSiR6JQThuyEvedSxMz2eQE";

async function test() {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      order_id: "11111111-1111-1111-1111-111111111111",
      payment_method: "emola",
      amount: 1,
      phone: "861234567",
      product_name: "Teste"
    })
  });
  
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}

test();
