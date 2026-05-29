const expressServer = require('express'); 
const app = expressServer();
const PORT = process.env.PORT || 3000;
const RIOT_API_KEY = process.env.RIOT_API_KEY; 

app.use(expressServer.json());

// 📝 [핵심 추가] 실시간 인증 요청서 보관함 (여기에 숲ID, 발급된 아이콘, 제한시간이 저장됩니다)
// 구조: { "soopId": { requiredIconId: 23, expireTime: 1716999999999 } }
const certRequests = {};

// 🖥️ 유저들이 접속했을 때 보여줄 화면
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

                // 1. 인증 시작하기 (랜덤 아이콘 발급 + 5분 타이머 작동)
                async function requestCert() {
                    const soopId = document.getElementById('soopId').value;
                    if(!soopId) {
                        alert("SOOP ID를 입력하거나 확장프로그램 자동 연동을 확인해 주세요!");
                        return;
                    }

                    try {
                        const res = await fetch(MY_SERVER_URL + '/api/request-cert?soopId=' + encodeURIComponent(soopId));
                        const data = await res.json();
                        
                        document.getElementById('result').innerText = "📢 [인증 시작 - 5분 제한]\\n롤 클라이언트를 켜고 프로필 아이콘을 [" + data.requiredIconId + "번]으로 변경하신 후, 제한시간 내에 아래 [2. 인증 완료하기] 버튼을 눌러주세요!";
                        document.getElementById('result').style.color = "#f1c40f";
                    } catch(e) {
                        document.getElementById('result').innerText = "❌ 통신 에러 발생";
                        document.getElementById('result').style.color = "#e45252";
                    }
                }

                // 2. 인증 완료하기 (실시간 검증 및 타임아웃 확인)
                async function verifyCert() {
                    const gameName = document.getElementById('gameName').value;
                    const tagLine = document.getElementById('tagLine').value;
                    const soopId = document.getElementById('soopId').value;
                    
                    document.getElementById('result').innerText = "🔄 라이엇 서버에서 실시간 아이콘 변경 상태를 확인 중...";
                    document.getElementById('result').style.color = "#f1c40f";

                    try {
                        const res = await fetch(MY_SERVER_URL + '/api/verify?gameName=' + encodeURIComponent(gameName) + '&tagLine=' + encodeURIComponent(tagLine) + '&soopId=' + encodeURIComponent(soopId));
                        const data = await res.json();
                        
                        if(data.success) {
                            document.getElementById('result').innerText = "🎉 [" + soopId + "]님 인증 성공!\\n당신의 티어: " + data.tier + "\\n이제 숲 채팅창에 티어가 연동됩니다!";
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

// 🎲 [개조 1] 유저마다 랜덤 아이콘 번호를 정해주고 "5분 타이머" 낙인 찍기
app.get('/api/request-cert', (req, res) => {
    const { soopId } = req.query;
    if (!soopId) return res.json({ success: false, message: "SOOP ID가 누락되었습니다." });

    // 누구나 기본으로 가지고 있는 무료 기본 아이콘들 중 하나를 랜덤 추출 (0번 ~ 28번 사이)
    const randomIconId = Math.floor(Math.random() * 29); 
    
    // 현재 시간에 5분(5 * 60 * 1000 밀리초)을 더해 만료 시간 장부에 기록
    const expireTime = Date.now() + (5 * 60 * 1000); 

    certRequests[soopId] = {
        requiredIconId: randomIconId,
        expireTime: expireTime
    };

    console.log(`⏳