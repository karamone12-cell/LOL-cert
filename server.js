const expressServer = require('express'); 
const app = expressServer();
const PORT = process.env.PORT || 3000;
const RIOT_API_KEY = process.env.RIOT_API_KEY; 

app.use(expressServer.json());

// 실시간 인증 요청 장부 (5분 만료)
const certRequests = {};

// 🖥️ 유저 화면 (2분 타이머가 장착된 럭셔리 UI)
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
                button { width: 85%; padding: 12px; background-color: #f4c64d; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 10px; color: black; transition: all 0.3s; }
                button:hover { background-color: #ddb23b; }
                button:disabled { background-color: #555 !important; color: #aaa !important; cursor: not-allowed; }
                #result { margin-top: 20px; font-weight: bold; color: #2ecc71; white-space: pre-line; line-height: 1.6; font-size: 14px; }
                .timer-txt { color: #e74c3c; font-size: 18px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🏆 SOOP 롤 티어 인증기</h2>
                <p>롤 소환사명과 SOOP ID를 입력해 주세요.</p>
                <input type="text" id="gameName" placeholder="롤 닉네임 (예: 고백살인마)">
                <input type="text" id="tagLine" placeholder="태그 (예: KR1)">
                <input type="text" id="soopId" placeholder="내 SOOP 아이디">
                <button id="btnStart" onclick="requestCert()">1. 인증 시작하기</button>
                <button id="btnVerify" onclick="verifyCert()" style="background-color: #52a9e4;" disabled>2. 인증 완료하기</button>
                <div id="result"></div>
            </div>

            <script>
                const MY_SERVER_URL = window.location.origin;
                let countdownInterval;

                // 1. 인증 시작하기 (현재 아이콘 번호 스냅샷 저장 + 2분 타이머 가동)
                async function requestCert() {
                    const gameName = document.getElementById('gameName').value;
                    const tagLine = document.getElementById('tagLine').value;
                    const soopId = document.getElementById('soopId').value;
                    
                    if(!gameName || !tagLine || !soopId) { alert("모든 칸을 입력해 주세요."); return; }

                    document.getElementById('result').innerText = "🔄 라이엇 서버에서 현재 상태를 기록 중...";
                    document.getElementById('result').style.color = "#f1c40f";
                    document.getElementById('btnStart').disabled = true;

                    try {
                        const res = await fetch(MY_SERVER_URL + '/api/request-cert?gameName=' + encodeURIComponent(gameName) + '&tagLine=' + encodeURIComponent(tagLine) + '&soopId=' + encodeURIComponent(soopId));
                        const data = await res.json();
                        
                        if(data.success) {
                            // ⏱️ 2분(120초) 카운트다운 타이머 엔진 시작
                            let timeLeft = 120; 
                            document.getElementById('btnVerify').disabled = true; // 완료 버튼 잠금

                            clearInterval(countdownInterval);
                            countdownInterval = setInterval(() => {
                                let minutes = Math.floor(timeLeft / 60);
                                let seconds = timeLeft % 60;
                                seconds = seconds < 10 ? '0' + seconds : seconds;

                                document.getElementById('result').innerHTML = "📢 <b>[인증 대기 - 롤 창에서 아이콘을 변경해 주세요]</b><br>라이엇 서버와 정보를 동기화하는 중입니다.<br>안전한 연동을 위해 잠시만 대기해 주세요.<br><span class='timer-txt'>⏱️ 남은 시간: " + minutes + "분 " + seconds + "초</span>";
                                document.getElementById('result').style.color = "#ffffff";

                                timeLeft--;

                                if (timeLeft < 0) {
                                    clearInterval(countdownInterval);
                                    document.getElementById('btnVerify').disabled = false; // 2분 지나면 잠금 해제!
                                    document.getElementById('btnStart').disabled = false;
                                    document.getElementById('result').innerHTML = "✅ 동기화 완료! 이제 아래 <b>[2. 인증 완료하기]</b> 버튼을 눌러주세요!";
                                    document.getElementById('result').style.color = "#2ecc71";
                                }
                            }, 1000);

                        } else {
                            document.getElementById('result').innerText = "❌ 실패: " + data.message;
                            document.getElementById('result').style.color = "#e45252";
                            document.getElementById('btnStart').disabled = false;
                        }
                    } catch(e) {
                        document.getElementById('result').innerText = "❌ 서버 통신 실패";
                        document.getElementById('btnStart').disabled = false;
                    }
                }

                // 2. 인증 완료하기 (아이콘 변경 여부 엄격 대조)
                async function verifyCert() {
                    const gameName = document.getElementById('gameName').value;
                    const tagLine = document.getElementById('tagLine').value;
                    const soopId = document.getElementById('soopId').value;

                    document.getElementById('result').innerText = "🔄 라이엇 실시간 데이터베이스 최종 대조 중...";
                    document.getElementById('result').style.color = "#f1c40f";

                    try {
                        const res = await fetch(MY_SERVER_URL + '/api/verify?gameName=' + encodeURIComponent(gameName) + '&tagLine=' + encodeURIComponent(tagLine) + '&soopId=' + encodeURIComponent(soopId));
                        const data = await res.json();
                        
                        if(data.success) {
                            document.getElementById('result').innerText = "🎉 [" + soopId + "]님 실시간 인증 성공!\\n당신의 티어: " + data.tier;
                            document.getElementById('result').style.color = "#2ecc71";
                        } else {
                            document.getElementById('result').innerText = "❌ 인증 실패: " + data.message;
                            document.getElementById('result').style.color = "#e45252";
                        }
                    } catch(e) {
                        document.getElementById('result').innerText = "❌ 통신 에러 발생";
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// [API 1] 현재 아이콘 번호 최초 기록
app.get('/api/request-cert', async (req, res) => {
    const { gameName, tagLine, soopId } = req.query;

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

        // 장부에 타임아웃 5분 저장 (2분 대기시간을 충분히 커버)
        certRequests[soopId] = {
            startIconId: currentIconId,
            expireTime: Date.now() + (5 * 60 * 1000)
        };

        console.log(`[타이머 장부 등록] ${soopId} -> 최초 아이콘: ${currentIconId}번`);
        return res.json({ success: true });

    } catch (error) {
        return res.json({ success: false, message: "라이엇 서버 통신 오류" });
    }
});

// [API 2] 2분 대기 후 정직한 실시간 아이콘 변경 대조 검증
app.get('/api/verify', async (req, res) => {
    const { gameName, tagLine, soopId } = req.query;
    
    const userRequest = certRequests[soopId];
    if (!userRequest) return res.json({ success: false, message: "[1. 인증 시작하기]를 먼저 눌러주세요." });
    if (Date.now() > userRequest.expireTime) {
        delete certRequests[soopId];
        return res.json({ success: false, message: "제한시간이 만료되었습니다. 다시 시작해 주세요." });
    }

    try {
        const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
        const accountRes = await fetch(accountUrl);
        const accountData = await accountRes.json();
        const puuid = accountData.puuid;

        const summonerUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
        const summonerRes = await fetch(summonerUrl);
        const summonerData = await summonerRes.json();
        const currentIconId = summonerData.profileIconId;

        console.log(`[최종 대조 실행] 최초: ${userRequest.startIconId} -> 현재: ${currentIconId}`);

        // 🎯 정직하고 칼 같은 대조 (다르기만 하면 무조건 통과)
        if (currentIconId !== userRequest.startIconId) {
            
            const encryptedSummonerId = summonerData.id;
            const leagueUrl = `https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/${encryptedSummonerId}?api_key=${RIOT_API_KEY}`;
            const leagueRes = await fetch(leagueUrl);
            const leagueData = await leagueRes.json();
            
            let tier = "UNRANKED";
            const soloRank = leagueData.find(entry => entry.queueType === "RANKED_SOLO_5x5");
            if (soloRank) {
                tier = `${soloRank.tier} ${soloRank.rank}`; // 예: GOLD I, PLATINUM III 등
            }

            delete certRequests[soopId];
            return res.json({ success: true, tier: tier });
        } else {
            return res.json({ success: false, message: "라이엇 서버에 아직 변경된 아이콘 정보가 반영되지 않았습니다. 롤 창에서 확실히 변경하셨는지 확인 후 잠시 후 다시 시도해 주세요. (현재 조회 번호: " + currentIconId + "번)" });
        }

    } catch (error) {
        return res.json({ success: false, message: "라이엇 실시간 데이터 조회 실패" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 2분 타이머 정석 검증 서버 가동 중 (Port: ${PORT})`);
});