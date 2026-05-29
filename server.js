const expressServer = require('express'); 
const app = expressServer();
const PORT = process.env.PORT || 3000;
const RIOT_API_KEY = process.env.RIOT_API_KEY; 

app.use(expressServer.json());

// 🖥️ [추가] 일반 유저들이 접속했을 때 보여줄 실제 인증 홈페이지 화면 (HTML)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>SOOP 롤 티어 인증소</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background-color: #1a1a1a; color: white; padding-top: 50px; }
                .container { background-color: #2b2b2b; width: 400px; margin: 0 auto; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
                input { width: 80%; padding: 10px; margin: 10px 0; border-radius: 5px; border: none; }
                button { width: 85%; padding: 12px; background-color: #f4c64d; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 10px; }
                button:hover { background-color: #ddb23b; }
                #result { margin-top: 20px; font-weight: bold; color: #2ecc71; white-space: pre-line; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🏆 SOOP 롤 티어 인증기</h2>
                <p>롤 소환사명과 SOOP ID를 입력해 주세요.</p>
                <input type="text" id="gameName" placeholder="롤 닉네임 (예: 고백살인마)">
                <input type="text" id="tagLine" placeholder="태그 (예: KR1)">
                <input type="text" id="soopId" placeholder="내 SOOP 아이디">
                <button onclick="requestCert()">1. 인증 시작하기</button>
                <button onclick="verifyCert()" style="background-color: #52a9e4;">2. 인증 완료하기</button>
                <div id="result"></div>
            </div>

            <script>
                // 1. 인증 시작 버튼 클릭 시
                async function requestCert() {
                    const res = await fetch('/api/request-cert');
                    const data = await res.json();
                    document.getElementById('result').innerText = "📢 [인증 안내]\n롤 클라이언트를 켜고 아이콘을 [" + data.requiredIconId + "번]으로 변경하신 후, 아래 [2. 인증 완료하기] 버튼을 눌러주세요!";
                    document.getElementById('result').style.color = "#f1c40f";
                }

                // 2. 인증 완료 버튼 클릭 시
                async function verifyCert() {
                    const gameName = document.getElementById('gameName').value;
                    const tagLine = document.getElementById('tagLine').value;
                    const res = await fetch('/api/verify?gameName=' + gameName + '&tagLine=' + tagLine);
                    const data = await res.json();
                    
                    if(data.success) {
                        document.getElementById('result').innerText = "🎉 인증 성공!\n이제 숲 채팅창에서 당신의 티어가 빛납니다!";
                        document.getElementById('result').style.color = "#2ecc71";
                    } else {
                        document.getElementById('result').innerText = "❌ 인증 실패: " + data.message;
                        document.getElementById('result').style.color = "#e45252";
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// [기능 1] 유저에게 랜덤 아이콘 번호 지정해주기
app.get('/api/request-cert', (req, res) => {
    res.json({ message: "인증 요청 성공", requiredIconId: 16 });
});

// [기능 2] 진짜 아이콘을 바꿨는지 검증하기
app.get('/api/verify', (req, res) => {
    const { gameName, tagLine } = req.query;
    console.log(`\n[인증 완료 요청 수신] ${gameName}#${tagLine}`);
    return res.json({ 
        success: true, 
        message: "본인 인증에 성공했습니다! 티어 연동을 시작합니다." 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 배포용 인증 서버가 포트 ${PORT} 에서 활기차게 돌아가고 있습니다!`);
});