const expressServer = require('express'); 
const app = expressServer();
const PORT = process.env.PORT || 3000;
const RIOT_API_KEY = process.env.RIOT_API_KEY; 

app.use(expressServer.json());

// 📝 실시간 인증 요청서 보관함
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

// 🎲 1. 랜덤 아이콘 지정 + 5분 타이머 작동
app.get('/api/request-cert', (req, res) => {
    const { soopId } = req.query;
    if (!soopId) return res.json({ success: false, message: "SOOP ID가 누락되었습니다." });

    const randomIconId = Math.floor(Math.random() * 29); 
    const expireTime = Date.now() + (5 * 60 * 1000); 

    certRequests[soopId] = {
        requiredIconId: randomIconId,
        expireTime: expireTime
    };

    console.log(`⏳ [인증 요청] ID: ${soopId} -> 요구 아이콘: ${randomIconId}번`);
    return res.json({ requiredIconId: randomIconId });
});

// 🎯 2. 라이엇 실시간 아이콘 비교 + 5분 만료 검증
app.get('/api/verify', async (req, res) => {
    const { gameName, tagLine, soopId } = req.query;
    
    const userRequest = certRequests[soopId];
    if (!userRequest) {
        return res.json({ success: false, message: "[1. 인증 시작하기] 버튼을 먼저 눌러주세요." });
    }

    if (Date.now() > userRequest.expireTime) {
        delete certRequests[soopId];
        return res.json({ success: false, message: "인증 제한시간(5분)이 만료되었습니다. 다시 시작해 주세요." });
    }

    try {
        const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
        const accountRes = await fetch(accountUrl);
        
        if (!accountRes.ok) {
            return res.json({ success: false, message: "존재하지 않는 롤 닉네임 또는 태그입니다." });
        }
        const accountData = await accountRes.json();
        const puuid = accountData.puuid;

        const summonerUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
        const summonerRes = await fetch(summonerUrl);
        const summonerData = await summonerRes.json();
        const currentIconId = summonerData.profileIconId;

        if (currentIconId === userRequest.requiredIconId) {
            const id = summonerData.id;
            const leagueUrl = `https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${RIOT_API_KEY}`;
            const leagueRes = await fetch(leagueUrl);
            const leagueData = await leagueRes.json();
            
            let tier = "UNRANKED";
            const soloRank = leagueData.find(entry => entry.queueType === "RANKED_SOLO_5x5");
            if (soloRank) {
                tier = soloRank.tier;
            }

            delete certRequests[soopId];
            return res.json({ success: true, tier: tier });
        } else {
            return res.json({ success: false, message: `아이콘 번호가 일치하지 않습니다. (요구된 번호: ${userRequest.requiredIconId}번 / 현재 내 아이콘: ${currentIconId}번)` });
        }
    } catch (error) {
        return res.json({ success: false, message: "라이엇 서버와 통신 중 에러가 발생했습니다." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 배포용 인증 서버가 포트 ${PORT} 에서 활기차게 돌아가고 있습니다!`);
});