const expressServer = require('express'); 
const app = expressServer();
const PORT = process.env.PORT || 3000;
const RIOT_API_KEY = process.env.RIOT_API_KEY; 

app.use(expressServer.json());

// 📝 실시간 인증 요청서 보관함 (유저의 처음 아이콘 번호와 만료 시간을 저장)
// 구조: { "soopId": { startIconId: 23, expireTime: 1716999999999 } }
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

                // 1. 인증 시작하기 (현재 아이콘 실시간 스냅샷 저장 + 5분 타이머 시작)
                async function requestCert() {
                    const gameName = document.getElementById('gameName').value;
                    const tagLine = document.getElementById('tagLine').value;
                    const soopId = document.getElementById('soopId').value;
                    
                    if(!gameName || !tagLine || !soopId) {
                        alert("모든 빈칸을 정확하게 입력해 주세요!");
                        return;
                    }

                    document.getElementById('result').innerText = "🔄 라이엇 서버에서 현재 상태를 기록하는 중...";
                    document.getElementById('result').style.color = "#f1c40f";

                    try {
                        const res = await fetch(MY_SERVER_URL + '/api/request-cert?gameName=' + encodeURIComponent(gameName) + '&tagLine=' + encodeURIComponent(tagLine) + '&soopId=' + encodeURIComponent(soopId));
                        const data = await res.json();
                        
                        if(data.success) {
                            document.getElementById('result').innerText = "📢 [인증 준비 완료 - 5분 제한]\\n롤 클라이언트를 켜고 프로필 아이콘을 \\"다른 아무 아이콘\\"으로 변경하신 후,\\n제한시간 내에 아래 [2. 인증 완료하기] 버튼을 눌러주세요!";
                            document.getElementById('result').style.color = "#f1c40f";
                        } else {
                            document.getElementById('result').innerText = "❌ 실패: " + data.message;
                            document.getElementById('result').style.color = "#e45252";
                        }
                    } catch(e) {
                        document.getElementById('result').innerText = "❌ 통신 에러 발생";
                        document.getElementById('result').style.color = "#e45252";
                    }
                }

                // 2. 인증 완료하기 (아이콘이 진짜 변했는지 대조 검증)
                async function verifyCert() {
                    const gameName = document.getElementById('gameName').value;
                    const tagLine = document.getElementById('tagLine').value;
                    const soopId = document.getElementById('soopId').value;
                    
                    document.getElementById('result').innerText = "🔄 라이엇 서버에서 아이콘 변경 여부를 확인 중...";
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

// 🎲 1. 인증 시작: 유저의 현재 롤 아이콘 번호를 스냅샷으로 기록 (5분 제한)
app.get('/api/request-cert', async (req, res) => {
    const { gameName, tagLine, soopId } = req.query;
    if (!gameName || !tagLine || !soopId) return res.json({ success: false, message: "입력 정보가 누락되었습니다." });

    try {
        // 라이엇 API로 유저 고유 PUUID 조회
        const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
        const accountRes = await fetch(accountUrl);
        if (!accountRes.ok) return res.json({ success: false, message: "존재하지 않는 롤 닉네임 또는 태그입니다." });
        const accountData = await accountRes.json();
        const puuid = accountData.puuid;

        // 현재 장착 중인 아이콘 번호 조회
        const summonerUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
        const summonerRes = await fetch(summonerUrl);
        const summonerData = await summonerRes.json();
        const startIconId = summonerData.profileIconId;

        // 5분 타이머 설정
        const expireTime = Date.now() + (5 * 60 * 1000); 

        // 장부에 현재 아이콘 스냅샷 저장
        certRequests[soopId] = {
            startIconId: startIconId,
            expireTime: expireTime
        };

        console.log(`⏳ [인증 스냅샷 등록] ID: ${soopId} -> 현재 아이콘: ${startIconId}번 (5분 타임아웃 시작)`);
        return res.json({ success: true });

    } catch (error) {
        return res.json({ success: false, message: "라이엇 서버 통신 에러" });
    }
});

// 🎯 2. 인증 완료: 라이엇 서버를 다시 찔러서 아이콘이 스냅샷과 '달라졌는지' 검증
app.get('/api/verify', async (req, res) => {
    const { gameName, tagLine, soopId } = req.query;
    
    const userRequest = certRequests[soopId];
    if (!userRequest) {
        return res.json({ success: false, message: "[1. 인증 시작하기] 버튼을 먼저 눌러주세요." });
    }

    // ⏰ 5분 만료 시간 체크
    if (Date.now() > userRequest.expireTime) {
        delete certRequests[soopId];
        return res.json({ success: false, message: "인증 제한시간(5분)이 만료되었습니다. 다시 시작해 주세요." });
    }

    try {
        const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
        const accountRes = await fetch(accountUrl);
        if (!accountRes.ok) return res.json({ success: false, message: "존재하지 않는 롤 닉네임 또는 태그입니다." });
        const accountData = await accountRes.json();
        const puuid = accountData.puuid;

        const summonerUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
        const summonerRes = await fetch(summonerUrl);
        const summonerData = await summonerRes.json();
        const currentIconId = summonerData.profileIconId;

        console.log(`[실시간 대조] 처음 아이콘: ${userRequest.startIconId}번 -> 현재 아이콘: ${currentIconId}번`);

        // 🎯 핵심 검증: 현재 아이콘이 처음 기록한 아이콘과 "다르기만 하면" 통과!
        if (currentIconId !== userRequest.startIconId) {
            
            // 일치 확인되었으니 실시간 티어 조회
            const id = summonerData.id;
            const leagueUrl = `https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${RIOT_API_KEY}`;
            const leagueRes = await fetch(leagueUrl);
            const leagueData = await leagueRes.json();
            
            let tier = "UNRANKED";
            const soloRank = leagueData.find(entry => entry.queueType === "RANKED_SOLO_5x5");
            if (soloRank) {
                tier = soloRank.tier;
            }

            delete certRequests[soopId]; // 인증 성공 시 장부 폐기
            console.log(`🎉 [인증 최종 성공] ${soopId} -> 티어: ${tier}`);
            return res.json({ success: true, tier: tier });
        } else {
            return res.json({ success: false, message: "롤 클라이언트 아이콘이 아직 변경되지 않았습니다. 다른 아이콘으로 변경 후 다시 시도해 주세요." });
        }
    } catch (error) {
        return res.json({ success: false, message: "라이엇 서버와 통신 중 에러가 발생했습니다." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 배포용 인증 서버가 포트 ${PORT} 에서 활기차게 돌아가고 있습니다!`);
});