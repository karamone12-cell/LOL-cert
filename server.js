const expressServer = require('express'); 
const app = expressServer();
const PORT = process.env.PORT || 3000;
const RIOT_API_KEY = process.env.RIOT_API_KEY; 

app.use(expressServer.json());

// 📝 실시간 인증 요청서 보관함 (유저에게 발급된 랜덤 인증 코드와 만료 시간 저장)
// 구조: { "soopId": { authCode: "SOOP-1234", expireTime: 1716999999999 } }
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
                .container { background-color: #2b2b2b; width: 420px; margin: 0 auto; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
                input { width: 80%; padding: 10px; margin: 10px 0; border-radius: 5px; border: none; font-size: 14px; text-align: center; }
                button { width: 85%; padding: 12px; background-color: #f4c64d; border: none; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 16px; margin-top: 10px; color: black; }
                button:hover { background-color: #ddb23b; }
                #result { margin-top: 20px; font-weight: bold; color: #2ecc71; white-space: pre-line; line-height: 1.6; font-size: 14px; }
                .code-box { background-color: #1a1a1a; padding: 8px; border-radius: 5px; color: #f1c40f; font-size: 18px; letter-spacing: 1px; display: inline-block; margin: 5px 0; border: 1px dashed #f4c64d; font-family: monospace; }
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

                // 1. 인증 시작하기 (랜덤 인증 코드 발급 + 5분 타이머 시작)
                async function requestCert() {
                    const gameName = document.getElementById('gameName').value;
                    const tagLine = document.getElementById('tagLine').value;
                    const soopId = document.getElementById('soopId').value;
                    
                    if(!gameName || !tagLine || !soopId) {
                        alert("모든 빈칸을 정확하게 입력해 주세요!");
                        return;
                    }

                    document.getElementById('result').innerText = "🔄 라이엇 서버에 인증 코드를 요청하는 중...";
                    document.getElementById('result').style.color = "#f1c40f";

                    try {
                        const res = await fetch(MY_SERVER_URL + '/api/request-cert?soopId=' + encodeURIComponent(soopId));
                        const data = await res.json();
                        
                        if(data.success) {
                            document.getElementById('result').innerHTML = "📢 [인증 준비 완료 - 5분 제한]<br>롤 클라이언트를 켜고 <b>[룬 페이지]</b> 중 하나의 이름을 아래 코드로 변경 후 저장해 주세요!<br><span class='code-box'>" + data.authCode + "</span><br>변경하셨다면 즉시 아래 [2. 인증 완료하기] 버튼을 눌러주세요!";
                            document.getElementById('result').style.color = "#ffffff";
                        } else {
                            document.getElementById('result').innerText = "❌ 실패: " + data.message;
                            document.getElementById('result').style.color = "#e45252";
                        }
                    } catch(e) {
                        document.getElementById('result').innerText = "❌ 통신 에러 발생";
                        document.getElementById('result').style.color = "#e45252";
                    }
                }

                // 2. 인증 완료하기 (룬 이름이 진짜 일치하는지 실시간 검증)
                async function verifyCert() {
                    const gameName = document.getElementById('gameName').value;
                    const tagLine = document.getElementById('tagLine').value;
                    const soopId = document.getElementById('soopId').value;
                    
                    document.getElementById('result').innerText = "🔄 라이엇 서버에서 룬 페이지 이름을 실시간 확인 중...";
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

// 🎲 1. 인증 시작: 유저에게 부여할 랜덤 4자리 코드 발급 (5분 제한)
app.get('/api/request-cert', (req, res) => {
    const { soopId } = req.query;
    if (!soopId) return res.json({ success: false, message: "SOOP ID가 누락되었습니다." });

    // 유저마다 고유한 랜덤 4자리 숫자 생성 (예: SOOP-4829)
    const randomCode = `SOOP-${Math.floor(1000 + Math.random() * 9000)}`;
    const expireTime = Date.now() + (5 * 60 * 1000); // 5분 만료

    certRequests[soopId] = {
        authCode: randomCode,
        expireTime: expireTime
    };

    console.log(`⏳ [룬 인증 코드 발급] ID: ${soopId} -> 인증 코드: ${randomCode}`);
    return res.json({ success: true, authCode: randomCode });
});

// 🎯 2. 인증 완료: 라이엇 서버의 룬 페이지 데이터를 실시간으로 파싱하여 검증 (지연 0초)
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
        // 1. 라이엇 계정 PUUID 조회
        const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
        const accountRes = await fetch(accountUrl);
        if (!accountRes.ok) return res.json({ success: false, message: "존재하지 않는 롤 닉네임 또는 태그입니다." });
        const accountData = await accountRes.json();
        const puuid = accountData.puuid;

        // 2. 🎯 [룬 페이지 데이터 실시간 조회 API]
        const runeUrl = `https://kr.api.riotgames.com/lol/summoner/v4/runes/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
        const runeRes = await fetch(runeUrl);
        
        if (!runeRes.ok) {
            return res.json({ success: false, message: "라이엇 서버에서 룬 정보를 불러오지 못했습니다." });
        }
        
        const runeData = await runeRes.json();
        
        // 유저의 모든 룬 페이지 이름들을 배열로 추출합니다.
        const runeNames = runeData.pages.map(page => page.name.trim());
        console.log(`[실시간 룬 검사] ${soopId}님의 룬 목록:`, runeNames);

        // 3. 발급했던 인증 코드가 룬 이름 배열에 포함되어 있는지 확인!
        if (runeNames.includes(userRequest.authCode)) {
            
            // 4. 인증 통과 시 해당 유저의 진짜 소환사 ID 추출 및 티어 조회
            const summonerUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
            const summonerRes = await fetch(summonerUrl);
            const summonerData = await summonerRes.json();
            const id = summonerData.id;

            const leagueUrl = `https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/${id}?api_key=${RIOT_API_KEY}`;
            const leagueRes = await fetch(leagueUrl);
            const leagueData = await leagueRes.json();
            
            let tier = "UNRANKED";
            const soloRank = leagueData.find(entry => entry.queueType === "RANKED_SOLO_5x5");
            if (soloRank) {
                tier = soloRank.tier;
            }

            delete certRequests[soopId]; // 인증 장부 폐기
            console.log(`🎉 [룬 인증 최종 성공] ${soopId} -> 티어: ${tier}`);
            return res.json({ success: true, tier: tier });
        } else {
            return res.json({ success: false, message: `요구된 인증 코드[${userRequest.authCode}]와 일치하는 룬 페이지 이름을 찾지 못했습니다. 룬 이름을 바꾸고 저장하셨는지 확인해 주세요.` });
        }
    } catch (error) {
        console.error("에러 로그:", error);
        return res.json({ success: false, message: "라이엇 서버와 통신 중 에러가 발생했습니다." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 배포용 인증 서버가 포트 ${PORT} 에서 활기차게 돌아가고 있습니다!`);
});