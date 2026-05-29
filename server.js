const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 환경변수 (렌더 대시보드에서 등록해야 할 키들)
const RIOT_API_KEY = process.env.RIOT_API_KEY;
const SOOP_CLIENT_ID = process.env.SOOP_CLIENT_ID; // 숲 개발자 센터에서 받을 키

const cors = require('cors');
app.use(cors());
app.use(express.json());

const certRequests = {}; 
const verifiedUsers = {}; 

// 🖥️ 홈페이지 UI
app.get('/', (req, res) => {
    // URL에 ?loggedId=아이디 가 있으면 로그인된 것으로 간주
    const loggedId = req.query.loggedId || '';

    res.send(`
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>롤 티어 인증</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #1a1a1a; color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .container { width: 500px; padding: 40px; background-color: #2b2b2b; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.5); }
        .title { font-size: 36px; margin-bottom: 10px; font-weight: bold; }
        .subtitle { font-size: 18px; color: #b0b0b0; margin-bottom: 30px; }
        .warning-box { background-color: #3e3124; border-left: 5px solid #f97316; padding: 20px; border-radius: 5px; margin-bottom: 30px; color: #e5e7eb; font-size: 14px; }
        .warning-box h4 { margin: 0 0 10px 0; color: white; font-size: 16px; font-weight: bold;}
        .warning-box p { margin: 0; }
        .section-label { font-size: 14px; color: #b0b0b0; margin-bottom: 10px; display: block; }
        .btn-blue { width: 100%; padding: 15px; background-color: #3b82f6; color: white; border: none; border-radius: 5px; font-size: 18px; font-weight: bold; cursor: pointer; transition: background-color 0.3s; }
        .btn-blue:hover { background-color: #2563eb; }
        .btn-cancel { width: 100%; padding: 15px; background-color: #4b5563; color: white; border: none; border-radius: 5px; font-size: 18px; cursor: pointer; transition: background-color 0.3s; }
        .btn-cancel:hover { background-color: #374151; }
        .login-btn-group { display: flex; gap: 10px; margin-bottom: 20px; align-items: center;}
        .user-name { font-size: 16px; color: white; flex-grow: 1;}
        .btn-relogin { background-color: #4b5563; color: white; border: none; border-radius: 5px; padding: 8px 12px; cursor: pointer; }
        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; margin-bottom: 5px; color: #b0b0b0; font-size: 14px;}
        .input-group input { width: 100%; padding: 15px; background-color: #1a1a1a; border: 1px solid #4b5563; border-radius: 5px; color: white; font-size: 16px; box-sizing: border-box; }
        .icon-challenge-box { margin-bottom: 30px;}
        .icon-challenge-text { font-size: 14px; color: #b0b0b0; margin-bottom: 15px;}
        .icon-area { display: flex; gap: 20px; align-items: center; background-color: #1a1a1a; padding: 20px; border-radius: 5px; border: 1px solid #4b5563;}
        .icon-img { width: 100px; height: 100px; border-radius: 5px; border: 1px solid #4b5563; }
        .icon-details { flex-grow: 1; }
        .icon-id { font-size: 20px; color: white; font-weight: bold;}
        .time-left { font-size: 16px; color: #b0b0b0;}
        .btn-group { display: flex; gap: 10px; }
        #result { margin-top: 20px; font-weight: bold; color: #2ecc71; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">롤 티어 인증</h1>
        <p class="subtitle">숲 계정 ↔ 라이엇 계정을 1:1로 연결합니다.</p>
        <div class="warning-box">
            <h4>⚠️ 이건 실험적 프로젝트입니다</h4>
            <p>티어 인증을 받는 것이 훈수할 자격을 만드는 것이 아닙니다.</p>
        </div>

        <div id="loginSection" style="display: ${loggedId ? 'none' : 'block'};">
            <span class="section-label">숲(SOOP) 로그인이 필요합니다.</span>
            <button class="btn-blue" onclick="location.href='/auth/soop/login'">숲(SOOP)으로 로그인</button>
        </div>

        <div id="certificationSection" style="display: ${loggedId ? 'block' : 'none'};">
            <div class="login-btn-group">
                <span class="user-name">로그인됨: <b style="color:#3b82f6;">${loggedId}</b></span>
                <button class="btn-relogin" onclick="location.href='/'">로그아웃</button>
            </div>
            
            <div class="input-group">
                <label>Riot ID</label>
                <input type="text" id="riotId" placeholder="GameName#TagLine">
            </div>
            
            <div id="checkAndIssueButtonArea">
                <button class="btn-blue" id="issueChallenge">계정 확인 & 챌린지 발급</button>
            </div>
            
            <div id="iconArea" class="icon-challenge-box" style="display: none;">
                <p class="icon-challenge-text">아래 아이콘으로 롤 클라이언트에서 변경 후 [확인]을 눌러주세요.</p>
                <div class="icon-area">
                    <img id="iconImage" class="icon-img" src="" alt="Icon">
                    <div class="icon-details">
                        <div class="icon-id">아이콘 ID: <span id="iconIdDisplay"></span></div>
                        <div class="time-left">남은 시간: <span id="timeLeftDisplay"></span>s</div>
                    </div>
                </div>
                <div class="btn-group">
                    <button class="btn-blue" id="verifyButton" disabled>확인</button>
                    <button class="btn-cancel" id="cancelButton">취소</button>
                </div>
            </div>
            <div id="result"></div>
        </div>
    </div>

    <script>
        const MY_SERVER_URL = window.location.origin;
        let countdownInterval;
        const soopId = '${loggedId}'; // 서버에서 받아온 진짜 숲 아이디

        async function issueChallenge() {
            const riotId = document.getElementById('riotId').value;
            const splitRiotId = riotId.split('#');
            if (splitRiotId.length !== 2) return alert('Riot ID 형식이 잘못되었습니다. (예: 페이커#KR1)');
            
            const gameName = splitRiotId[0], tagLine = splitRiotId[1];
            document.getElementById('result').innerText = "Riot 서버 통신 중...";

            try {
                const res = await fetch(MY_SERVER_URL + '/api/request-cert?gameName=' + encodeURIComponent(gameName) + '&tagLine=' + encodeURIComponent(tagLine) + '&soopId=' + encodeURIComponent(soopId));
                const data = await res.json();
                
                if(data.success) {
                    document.getElementById('checkAndIssueButtonArea').style.display = 'none';
                    document.getElementById('iconArea').style.display = 'block';
                    document.getElementById('iconIdDisplay').innerText = data.targetIconId;
                    document.getElementById('iconImage').src = 'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/profileicon/' + data.targetIconId + '.png';

                    let timeLeft = 120;
                    document.getElementById('verifyButton').disabled = true;

                    if (countdownInterval) clearInterval(countdownInterval);
                    countdownInterval = setInterval(() => {
                        timeLeft--;
                        document.getElementById('timeLeftDisplay').innerText = timeLeft;
                        if (timeLeft <= 0) {
                            clearInterval(countdownInterval);
                            document.getElementById('verifyButton').disabled = false;
                        }
                    }, 1000);
                    document.getElementById('result').innerText = "";
                } else {
                    document.getElementById('result').innerText = "실패: " + data.message;
                }
            } catch(e) { document.getElementById('result').innerText = "서버 통신 실패"; }
        }
        
        if(document.getElementById('issueChallenge')) {
            document.getElementById('issueChallenge').addEventListener('click', issueChallenge);
        }

        async function verifyCert() {
            const riotId = document.getElementById('riotId').value;
            const splitRiotId = riotId.split('#');
            
            document.getElementById('result').innerText = "최종 대조 중...";
            try {
                const res = await fetch(MY_SERVER_URL + '/api/verify?gameName=' + encodeURIComponent(splitRiotId[0]) + '&tagLine=' + encodeURIComponent(splitRiotId[1]) + '&soopId=' + encodeURIComponent(soopId));
                const data = await res.json();
                
                if(data.success) {
                    document.getElementById('result').innerText = "🎉 인증 성공! (" + data.tier + ")";
                    document.getElementById('iconArea').style.display = 'none';
                    document.getElementById('checkAndIssueButtonArea').style.display = 'block';
                    document.getElementById('issueChallenge').innerText = "인증 완료됨 (다시 인증)";
                } else {
                    document.getElementById('result').innerText = "인증 실패: " + data.message;
                }
            } catch(e) { document.getElementById('result').innerText = "통신 에러"; }
        }

        if(document.getElementById('verifyButton')) {
            document.getElementById('verifyButton').addEventListener('click', verifyCert);
        }

        if(document.getElementById('cancelButton')) {
            document.getElementById('cancelButton').addEventListener('click', () => {
                document.getElementById('iconArea').style.display = 'none';
                document.getElementById('checkAndIssueButtonArea').style.display = 'block';
                if (countdownInterval) clearInterval(countdownInterval);
                document.getElementById('result').innerText = "";
            });
        }
    </script>
</body>
</html>
    `);
});

// 🔑 [숲 연동 1단계] 유저를 숲 로그인 창으로 보내기
app.get('/auth/soop/login', (req, res) => {
    if (!SOOP_CLIENT_ID) {
        // 아직 키 발급을 안 받았을 때 임시로 넘겨주는 로직 (키 발급 전 테스트용)
        return res.redirect('/?loggedId=SOOP_TEST_USER');
    }
    const redirectUri = 'https://lol-cert.onrender.com/auth/soop/callback';
    const authUrl = `https://openapi.afreecatv.com/auth/code?client_id=${SOOP_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code`;
    res.redirect(authUrl);
});

// 🔑 [숲 연동 2단계] 숲에서 로그인 성공 후 우리 서버로 돌아오는 창구
app.get('/auth/soop/callback', async (req, res) => {
    // 실제 서비스에서는 여기서 숲 API로 토큰을 교환하고 유저 닉네임을 가져오는 코드가 들어갑니다.
    // 현재는 구조만 잡아두고 임시 통과시킵니다.
    const mockSoopId = "Real_Soop_User"; 
    res.redirect(`/?loggedId=${mockSoopId}`);
});

// [API 1 - 라이엇 인증 요청]
app.get('/api/request-cert', async (req, res) => {
    const { gameName, tagLine, soopId } = req.query;
    try {
        const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
        const accountRes = await fetch(accountUrl);
        if (!accountRes.ok) return res.json({ success: false, message: "존재하지 않는 닉네임/태그" });
        const { puuid } = await accountRes.json();
        
        const summonerRes = await fetch(`https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`);
        const { profileIconId } = await summonerRes.json();
        const targetIconId = Math.floor(Math.random() * 50) + 1; 

        certRequests[soopId] = { startIconId: profileIconId, targetIconId: targetIconId, expireTime: Date.now() + (2 * 60 * 1000) };
        res.json({ success: true, targetIconId: targetIconId });
    } catch (e) { res.json({ success: false, message: "오류 발생" }); }
});

// [API 2 - 라이엇 인증 완료]
app.get('/api/verify', async (req, res) => {
    const { gameName, tagLine, soopId } = req.query;
    const reqData = certRequests[soopId];
    if (!reqData) return res.json({ success: false, message: "먼저 시작을 눌러주세요." });
    
    try {
        const accountRes = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`);
        const { puuid } = await accountRes.json();
        
        const summonerRes = await fetch(`https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`);
        const { profileIconId } = await summonerRes.json();

        if (profileIconId === reqData.targetIconId) {
            const mockTier = "EMERALD III 42LP";
            verifiedUsers[soopId] = mockTier; 
            delete certRequests[soopId];
            res.json({ success: true, tier: mockTier });
        } else {
            res.json({ success: false, message: "아직 아이콘 미변경" });
        }
    } catch(e) { res.json({ success: false, message: "조회 실패" }); }
});

app.get('/api/get-tier', (req, res) => {
    const { soopId } = req.query;
    if (verifiedUsers[soopId]) res.json({ success: true, tier: verifiedUsers[soopId] });
    else res.json({ success: false });
});

app.listen(PORT, () => console.log(`🚀 서버 가동 중: ${PORT}`));