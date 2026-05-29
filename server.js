const expressServer = require('express'); 
const app = expressServer();
const PORT = process.env.PORT || 3000;
const RIOT_API_KEY = process.env.RIOT_API_KEY; 

const cors = require('cors');
app.use(cors());
app.use(expressServer.json());

const certRequests = {}; 
const verifiedUsers = {}; 

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
                button { width: 85%; padding: 12px; background-color: #f4c64d; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 10px; transition: all 0.3s; }
                button:disabled { background-color: #555 !important; color: #aaa !important; cursor: not-allowed; }
                #result { margin-top: 20px; font-weight: bold; color: #2ecc71; white-space: pre-line; line-height: 1.6; }
                .guide-txt { color: #f1c40f; font-size: 15px; font-weight: normal; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🏆 SOOP 롤 티어 하이패스 인증기</h2>
                <input type="text" id="gameName" placeholder="롤 닉네임">
                <input type="text" id="tagLine" placeholder="태그 (예: KR1)">
                <input type="text" id="soopId" placeholder="SOOP 아이디">
                <button id="btnStart" onclick="requestCert()">1. 인증 시작하기</button>
                <button id="btnVerify" onclick="verifyCert()" style="background-color: #52a9e4;" disabled>2. 아이콘 변경 후 즉시 완료</button>
                <div id="result"></div>
            </div>
            <script>
                const MY_SERVER_URL = window.location.origin;

                async function requestCert() {
                    const gameName = document.getElementById('gameName').value;
                    const tagLine = document.getElementById('tagLine').value;
                    const soopId = document.getElementById('soopId').value;
                    
                    if(!gameName || !tagLine || !soopId) {
                        return alert("모든 칸을 입력해주세요!");
                    }

                    document.getElementById('result').innerText = "🔄 라이엇 서버와 연결 중..."; 
                    document.getElementById('btnStart').disabled = true;

                    try {
                        const res = await fetch(MY_SERVER_URL + '/api/request-cert?gameName=' + encodeURIComponent(gameName) + '&tagLine=' + encodeURIComponent(tagLine) + '&soopId=' + encodeURIComponent(soopId));
                        const data = await res.json();
                        
                        if(data.success) {
                            // 🚀 타이머 완전 삭제! 즉시 완료 버튼 활성화
                            document.getElementById('btnVerify').disabled = false; 
                            document.getElementById('btnStart').disabled = false;
                            document.getElementById('result').innerHTML = "📢 <b>[롤 클라이언트에서 아이콘을 변경해 주세요!]</b><br><div class='guide-txt'>변경하셨다면 대기 없이 바로 아래 <b>[2. 완료]</b> 버튼을 누르세요!<br>(※ 실패 시 5초 뒤에 다시 누르시면 됩니다.)</div>";
                        } else { 
                            document.getElementById('result').innerText = "❌ " + data.message; 
                            document.getElementById('btnStart').disabled = false; 
                        }
                    } catch(e) { 
                        document.getElementById('result').innerText = "❌ 통신 에러";
                        document.getElementById('btnStart').disabled = false; 
                    }
                }

                async function verifyCert() {
                    const gameName = document.getElementById('gameName').value;
                    const tagLine = document.getElementById('tagLine').value;
                    const soopId = document.getElementById('soopId').value;

                    document.getElementById('result').innerText = "🔄 변경 확인 및 티어 수집 중...";
                    document.getElementById('result').style.color = "#f1c40f";
                    
                    try {
                        const res = await fetch(MY_SERVER_URL + '/api/verify?gameName=' + encodeURIComponent(gameName) + '&tagLine=' + encodeURIComponent(tagLine) + '&soopId=' + encodeURIComponent(soopId));
                        const data = await res.json();
                        
                        if(data.success) {
                            document.getElementById('result').innerText = "🎉 인증 성공! (" + data.tier + ")\\n이제 방송국 새로고침 시 뱃지가 자동 적용됩니다!";
                            document.getElementById('result').style.color = "#2ecc71";
                        } else { 
                            document.getElementById('result').innerText = "❌ " + data.message + "\\n(조금만 기다렸다가 다시 버튼을 눌러주세요!)"; 
                            document.getElementById('result').style.color = "#e45252";
                        }
                    } catch(e) { 
                        document.getElementById('result').innerText = "❌ 통신 에러"; 
                    }
                }
            </script>
        </body>
        </html>
    `);
});

app.get('/api/request-cert', async (req, res) => {
    try {
        const { gameName, tagLine, soopId } = req.query;
        const accountRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`);
        if (!accountRes.ok) return res.json({ success: false, message: "닉네임/태그 확인 요망" });
        const { puuid } = await accountRes.json();
        
        const summonerRes = await fetch(`https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`);
        const { profileIconId } = await summonerRes.json();
        
        certRequests[soopId] = { startIconId: profileIconId, expireTime: Date.now() + (5 * 60 * 1000) };
        res.json({ success: true });
    } catch (e) { res.json({ success: false, message: "오류 발생" }); }
});

app.get('/api/verify', async (req, res) => {
    const { gameName, tagLine, soopId } = req.query;
    const reqData = certRequests[soopId];
    
    if (!reqData) return res.json({ success: false, message: "먼저 시작을 눌러주세요." });
    
    try {
        const accountRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`);
        const { puuid } = await accountRes.json();
        
        const summonerRes = await fetch(`https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`);
        const { profileIconId, id } = await summonerRes.json();

        if (profileIconId !== reqData.startIconId) {
            let finalTier = "UNRANKED (언랭크)"; 
            try {
                const leagueRes = await fetch(`https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${RIOT_API_KEY}`);
                if (leagueRes.ok) {
                    const leagueData = await leagueRes.json();
                    const solo = leagueData.find(e => e.queueType === "RANKED_SOLO_5x5");
                    if (solo) finalTier = `${solo.tier} ${solo.rank} ${solo.leaguePoints}LP`;
                } else if (leagueRes.status === 403) finalTier = "API 키 만료됨";
                else if (leagueRes.status === 429) finalTier = "라이엇 서버 과부하 (잠시 후 시도)";
                else finalTier = `조회 오류 (${leagueRes.status})`;
            } catch(e) { finalTier = "서버 통신 실패"; }

            verifiedUsers[soopId] = finalTier; 
            delete certRequests[soopId];
            res.json({ success: true, tier: finalTier });
        } else {
            res.json({ success: false, message: "아직 라이엇 서버에 아이콘 변경이 반영되지 않았습니다." });
        }
    } catch(e) { res.json({ success: false, message: "오류" }); }
});

app.get('/api/get-tier', (req, res) => {
    const { soopId } = req.query;
    if (verifiedUsers[soopId]) res.json({ success: true, tier: verifiedUsers[soopId] });
    else res.json({ success: false });
});

app.listen(PORT, () => { console.log(`서버 가동 중: ${PORT}`); });