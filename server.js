const expressServer = require('express'); 
const app = expressServer();
const PORT = process.env.PORT || 3000;

// 🔑 Render 대시보드 Advanced에 넣었던 진짜 라이엇 API 키를 여기서 불러옵니다!
const RIOT_API_KEY = process.env.RIOT_API_KEY; 

app.use(expressServer.json());

// 🖥️ 유저들이 접속했을 때 보여줄 진짜 화면
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
                input { width: 80%; padding: 10px; margin: 10px 0; border-radius: 5px; border: none; font-size: 14px; text-align: center; }
                button { width: 85%; padding: 12px; background-color: #f4c64d; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 10px; color: black; }
                button:hover { background-color: #ddb23b; }
                #result { margin-top: 20px; font-weight: bold; color: #2ecc71; white-space: pre-line; line-height: 1.6; font-size: 14px; }
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
                const MY_SERVER_URL = window.location.origin;

                async function requestCert() {
                    try {
                        const res = await fetch(MY_SERVER_URL + '/api/request-cert');
                        const data = await res.json();
                        document.getElementById('result').innerText = "📢 [인증 안내]\\n롤 클라이언트를 켜고 아이콘을 [" + data.requiredIconId + "번]으로 변경하신 후, 아래 [2. 인증 완료하기] 버튼을 눌러주세요!";
                        document.getElementById('result').style.color = "#f1c40f";
                    } catch(e) {
                        document.getElementById('result').innerText = "❌ 통신 에러 발생";
                        document.getElementById('result').style.color = "#e45252";
                    }
                }

                async function verifyCert() {
                    const gameName = document.getElementById('gameName').value;
                    const tagLine = document.getElementById('tagLine').value;
                    
                    document.getElementById('result').innerText = "🔄 라이엇 서버에서 아이콘을 확인 중입니다...";
                    document.getElementById('result').style.color = "#f1c40f";

                    try {
                        const res = await fetch(MY_SERVER_URL + '/api/verify?gameName=' + encodeURIComponent(gameName) + '&tagLine=' + encodeURIComponent(tagLine));
                        const data = await res.json();
                        
                        if(data.success) {
                            document.getElementById('result').innerText = "🎉 인증 성공!\\n당신의 티어: " + data.tier + "\\n이제 숲 채팅창에서 당신의 티어가 빛납니다!";
                            document.getElementById('result').style.color = "#2ecc71";
                        } else {
                            document.getElementById('result').innerText = "❌ 인증 실패: " + data.message;
                            document.getElementById('result').style.color = "#e45252";
                        }
                    } catch(e) {
                        document.getElementById('result').innerText = "❌ 통신 에러 발생";
                        document.getElementById('result').style.color = "#e45252";
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// [기능 1] 유저에게 16번 아이콘(초기 아이콘 중 하나)으로 바꾸라고 지정
app.get('/api/request-cert', (req, res) => {
    res.json({ message: "인증 요청 성공", requiredIconId: 16 });
});

// [기능 2] 🎯 [진짜 개조] 유저가 친 닉네임을 라이엇 서버에 실시간으로 조회하여 아이콘 검증하기
app.get('/api/verify', async (req, res) => {
    const { gameName,