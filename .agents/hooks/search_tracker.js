const fs = require('fs');
const path = require('path');

function getStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => data += chunk);
    process.stdin.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function getStatePath(conversationId) {
  const safeId = (conversationId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = path.join(__dirname, '..', '.state');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }
  return path.join(dir, `search_${safeId}.json`);
}

async function main() {
  const mode = process.argv[2];
  const payload = await getStdin();
  const stateFile = getStatePath(payload.conversationId);

  try {
    if (mode === 'set') {
      fs.writeFileSync(stateFile, JSON.stringify({ pendingFetch: true, timestamp: Date.now() }), 'utf8');
      console.log(JSON.stringify({}));
    } 
    else if (mode === 'clear') {
      if (fs.existsSync(stateFile)) {
        try {
          fs.unlinkSync(stateFile);
        } catch (e) {
          fs.writeFileSync(stateFile, JSON.stringify({ pendingFetch: false }), 'utf8');
        }
      }
      console.log(JSON.stringify({}));
    } 
    else if (mode === 'check_write') {
      let pending = false;
      if (fs.existsSync(stateFile)) {
        try {
          const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
          pending = state.pendingFetch === true;
        } catch (e) {}
      }

      if (pending) {
        console.log(JSON.stringify({
          decision: "deny",
          reason: "[MUTLAK KURAL İHLALİ] 'search_web' sonrası tespit edilen URL'ler 'read_url_content' ile bizzat fetch edilmeden kod yazılamaz veya dosya düzenlenemez. Önce kaynak sayfaların ham içeriğini okumalısınız."
        }));
      } else {
        console.log(JSON.stringify({ decision: "allow" }));
      }
    } 
    else if (mode === 'enforce_stop') {
      let pending = false;
      if (fs.existsSync(stateFile)) {
        try {
          const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
          pending = state.pendingFetch === true;
        } catch (e) {}
      }

      if (pending && payload.terminationReason === 'model_stop') {
        console.log(JSON.stringify({
          decision: "continue",
          reason: "[KRİTİK KURAL KORUMA HATTI] Modelin durması ve kullanıcıya yanıt yazması engellendi! 'search_web' çalıştırdınız ancak henüz hiçbir URL'yi 'read_url_content' ile bizzat fetch etmediniz. Arama motorunun yüzeysel 3-4 satırlık özetiyle yetinmek KESİNLİKLE YASAKTIR. Lütfen tespit edilen en yetkili 1-3 kaynak URL'yi 'read_url_content' ile indirip inceleyiniz."
        }));
      } else {
        console.log(JSON.stringify({ decision: "allow" }));
      }
    } else {
      console.log(JSON.stringify({ decision: "allow" }));
    }
  } catch (err) {
    console.log(JSON.stringify({ decision: "allow" }));
  }
}

main();
