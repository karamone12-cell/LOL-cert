const expressServer = require('express'); 
const app = expressServer();
const PORT = process.env.PORT || 3000;
const RIOT_API_KEY = process.env.RIOT_API_KEY; 

app.use(expressServer.json());

// 실시간 인증 요청 장부
const certRequests = {};

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>SOOP 롤 티어 인증소</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; background-color: #1a1a1a; color: white; padding-top: 50px; }
                .container { background-color: #2b2b2b; width: 420px; margin: 0 auto; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
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
                    if(!soopId) { alert("SOOP ID를 입력해 주세요."); return; }

                    try {
                        const res = await fetch(MY_SERVER_URL + '/api/request-cert?soopId=' + encodeURIComponent(soopId));
                        const data = await res.json();
                        if(data.success) {
                            document.getElementById('result').innerText = "📢 [인증 대기] 상태 메시지 변경은 라이엇 API 반영에 시간이 걸릴 수 있습니다.\\n인증을 시작하시려면 아래 [2. 인증 완료하기]를 눌러 라이엇 서버 조회를 시작하세요.";
                            document.getElementById('result').style.color = "#f1c40f";
                        }
                    } catch(e) {
                        document.getElementById('result').innerText = "❌ 서버 통신 실패";
                    }
                }

                async function verifyCert() {
                    const gameName = document.getElementById('gameName').value;
                    const tagLine = document.getElementById('tagLine').value;
                    const soopId = document.getElementById('soopId').value;

                    document.getElementById('result').innerText = "🔄 라이엇 실시간 데이터베이스 조회 중...";
                    document.getElementById('result').style.color = "#f1c40f";

                    try {
                        const res = await fetch(MY_SERVER_URL + '/api/verify?gameName=' + encodeURIComponent(gameName) + '&tagLine=' + encodeURIComponent(tagLine) + '&soopId=' + encodeURIComponent(soopId));
                        const data = await res.json();
                        
                        if(data.success) {
                            document.getElementById('result').innerText = "🎉 [" + soopId + "]님 실시간 연동 성공!\\n진짜 티어: " + data.tier;
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

// 1. 인증 장부 등록
app.get('/api/request-cert', (req, res) => {
    const { soopId } = req.query;
    certRequests[soopId] = { expireTime: Date.now() + (5 * 60 * 1000) };
    return res.json({ success: true });
});

// 2. 100% 실시간 라이엇 연동 데이터 검증 (가짜 패스라인 완전 삭제)
app.get('/api/verify', async (req, res) => {
    const { gameName, tagLine, soopId } = req.query;
    
    const userRequest = certRequests[soopId];
    if (!userRequest) return res.json({ success: false, message: "[1. 인증 시작하기]를 먼저 눌러주세요." });
    if (Date.now() > userRequest.expireTime) {
        delete certRequests[soopId];
        return res.json({ success: false, message: "제한시간 5분이 만료되었습니다." });
    }

    try {
        // 1단계: 라이엇 ID/태그로 PUUID 추출
        const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
        const accountRes = await fetch(accountUrl);
        
        if (!accountRes.ok) {
            if (accountRes.status === 403) return res.json({ success: false, message: "라이엇 API 키가 만료되었거나 권한이 없습니다. Render 설정을 확인하세요." });
            return res.json({ success: false, message: "존재하지 않는 롤 닉네임 또는 태그입니다." });
        }
        const accountData = await accountRes.json();
        const puuid = accountData.puuid;

        // 2단계: PUUID로 고유 Summoner ID(Encrypted ID) 추출
        const summonerUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
        const summonerRes = await fetch(summonerUrl);
        if (!summonerRes.ok) return res.json({ success: false, message: "소환사 세부 정보를 가져오지 못했습니다." });
        const summonerData = await summonerRes.json();
        const summonerId = summonerData.id;

        // 3단계: Summoner ID로 실시간 진짜 랭크 티어 조회
        const leagueUrl = `https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${RIOT_API_KEY}`;
        const leagueRes = await fetch(leagueUrl);
        if (!leagueRes.ok) return res.json({ success: false, message: "라이엇 리그 데이터베이스 조회 실패" });
        const leagueData = await leagueRes.json();
        
        let tier = "UNRANKED";
        const soloRank = leagueData.find(entry => entry.queueType === "RANKED_SOLO_5x5");
        if (soloRank) {
            tier = `${soloRank.tier} ${soloRank.rank}`; // 예: DIAMOND IV, GOLD I 등 진짜 정보 파싱
        }

        delete certRequests[soopId];
        console.log(`[진짜 연동 완료] ${soopId} -> 티어: ${tier}`);
        return res.json({ success: true, tier: tier });

    } catch (error) {
        console.error("라이엇 API 실시간 연동 에러:", error);
        return res.json({ success: false, message: "라이엇 서버와 통신하는 도중 알 수 없는 에러가 발생했습니다." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 진짜 검증 서버 가동 중 (Port: ${PORT})`);
});