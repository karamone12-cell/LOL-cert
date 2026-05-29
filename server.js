const expressServer = require('express');
const app = expressServer();
const PORT = process.env.PORT || 3000;
const RIOT_API_KEY = process.env.RIOT_API_KEY;

// 🔥 확장프로그램 통신 허용 (CORS)
const cors = require('cors');
app.use(cors());
app.use(expressServer.json());

// 사용자 인증 상태를 저장하는 장부 (메모리 DB)
const certRequests = {}; 
const verifiedUsers = {}; 

// 🖥️ 홈페이지 UI
app.get('/', (req, res) => {
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
        .warning-link { color: #f97316; text-decoration: none; font-weight: bold; }
        .section-label { font-size: 14px; color: #b0b0b0; margin-bottom: 10px; display: block; }
        .btn-blue { width: 100%; padding: 15px; background-color: #3b82f6; color: white; border: none; border-radius: 5px; font-size: 18px; font-weight: bold; cursor: pointer; transition: background-color 0.3s; }
        .btn-blue:hover { background-color: #2563eb; }
        .btn-cancel { width: 100%; padding: 15px; background-color: #4b5563; color: white; border: none; border-radius: 5px; font-size: 18px; cursor: pointer; transition: background-color 0.3s; }
        .btn-cancel:hover { background-color: #374151; }
        .login-btn-group { display: flex; gap: 10px; margin-bottom: 20px;}
        .user-name { font-size: 16px; color: white;}
        .btn-relogin { background-color: #4b5563; color: white; border: none; border-radius: 5px; padding: 5px 10px; cursor: pointer; }
        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; margin-bottom: 5px; color: #b0b0b0; font-size: 14px;}
        .input-group input { width: 100%; padding: 15px; background-color: #1a1a1a; border: 1px solid #4b5563; border-radius: 5px; color: white; font-size: 16px; }
        .icon-challenge-box { margin-bottom: 30px;}
        .icon-challenge-text { font-size: 14px; color: #b0b0b0; margin-bottom: 15px;}
        .icon-area { display: flex; gap: 20px; align-items: center; background-color: #1a1a1a; padding: 20px; border-radius: 5px; border: 1px solid #4b5563;}
        .icon-img { width: 100px; height: 100px; border-radius: 5px; border: 1px solid #4b5563; }
        .icon-details { flex-grow: 1; }
        .icon-id { font-size: 20px; color: white; font-weight: bold;}
        .time-left { font-size: 16px; color: #b0b0b0;}
        .btn-group { display: flex; gap: 10px; }
        #result { margin-top: 20px; font-weight: bold; color: #2ecc71; text-align: center; }
        #verifyButton { background-color: #3b82f6;}
        #verifyButton:hover { background-color: #2563eb;}
        #verifyButton:disabled { background-color: #6b7280; cursor: not-allowed; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">롤 티어 인증</h1>
        <p class="subtitle">치지직 계정 ↔ 라이엇 계정을 1:1로 연결합니다. (시즌 단위)</p>
        <div class="warning-box">
            <h4>⚠️ 이건 실험적 프로젝트입니다</h4>
            <p>티어 인증을 받는 것이 훈수할 자격을 만드는 것이 아닙니다.</p>
            <p>→ <a href="#" class="warning-link">실험 백서 자세히 읽기</a></p>
        </div>
        <div id="loginSection">
            <span class="section-label">치지직 로그인이 필요합니다.</span>
            <button class="btn-blue" id="loginButton">치지직으로 로그인</button>
        </div>
        <div id="certificationSection" style="display: none;">
            <div class="login-btn-group">
                <span class="user-name">로그인됨: <span id="soopIdDisplay">테스트유저</span></span>
                <button class="btn-relogin" id="reloginButton">다시 로그인</button>
            </div>
            <div class="input-group">
                <label>Riot ID</label>
                <input type="text" id="riotId" placeholder="GameName#TagLine">
            </div>
            <div id="checkAndIssueButtonArea">
                <button class="btn-blue" id="issueChallenge">계정 확인 & 챌린지 발급</button>
            </div>
            <div id="iconArea" class="icon-challenge-box" style="display: none;">
                <p class="icon-challenge-text">아래 아이콘으로 프로필 아이콘을 변경한 뒤 [확인]을 눌러주세요.</p>
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
        let soopId = 'testuser';

        document.getElementById('loginButton').addEventListener('click', () => {
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('certificationSection').style.display = 'block';
            document.getElementById('soopIdDisplay').innerText = soopId;
        });

        document.getElementById('reloginButton').addEventListener('click', () => {
            document.getElementById('certificationSection').style.display = 'none';
            document.getElementById('loginSection').style.display = 'block';
        });

        async function issueChallenge() {
            const riotId = document.getElementById('riotId').value;
            const splitRiotId = riotId.split('#');
            if (splitRiotId.length !== 2) {
                alert('Riot ID 형식이 잘못되었습니다. (예: GameName#TagLine)');
                return;
            }
            const gameName = splitRiotId[0];
            const tagLine = splitRiotId[1];

            document.getElementById('result').innerText = "Riot 서버에서 현재 상태를 조회 중입니다...";
            document.getElementById('result').style.color = "#f1c40f";

            try {
                // 안전한 문자열 덧셈 방식으로 API 호출 (문법 에러 방지)
                const res = await fetch(MY_SERVER_URL + '/api/request-cert?gameName=' + encodeURIComponent(gameName) + '&tagLine=' + encodeURIComponent(tagLine) + '&soopId=' + encodeURIComponent(soopId));
                const data = await res.json();
                
                if(data.success) {
                    document.getElementById('checkAndIssueButtonArea').style.display = 'none';
                    document.getElementById('iconArea').style.display = 'block';
                    
                    const iconId = data.targetIconId;
                    document.getElementById('iconIdDisplay').innerText = iconId;
                    document.getElementById('iconImage').src = 'https://ddragon.leagueoflegends.com/cdn/14.10.1/img/profileicon/' + iconId + '.png';

                    let timeLeft = 120;
                    document.getElementById('timeLeftDisplay').innerText = timeLeft;
                    document.getElementById('verifyButton').disabled = true;

                    if (countdownInterval) clearInterval(countdownInterval);
                    countdownInterval = setInterval(() => {
                        timeLeft--;
                        document.getElementById('timeLeftDisplay').innerText = timeLeft;
                        if (timeLeft <= 0) {
                            clearInterval(countdownInterval);
                            document.getElementById('verifyButton').disabled = false;
                            document.getElementById('verifyButton').innerText = "확인";
                        }
                    }, 1000);
                    
                    document.getElementById('result').innerText = "";
                } else {
                    document.getElementById('result').innerText = "실패: " + data.message;
                    document.getElementById('result').style.color = "#e45252";
                }
            } catch(e) {
                document.getElementById('result').innerText = "서버 통신 실패";
                document.getElementById('result').style.color = "#e45252";
            }
        }
        document.getElementById('issueChallenge').addEventListener('click', issueChallenge);

        async function verifyCert() {
            const riotId = document.getElementById('riotId').value;
            const splitRiotId = riotId.split('#');
            const gameName = splitRiotId[0];
            const tagLine = splitRiotId[1];

            document.getElementById('result').innerText = "Riot 서버 최종 대조 중입니다...";
            document.getElementById('result').style.color = "#f1c40f";

            try {
                const res = await fetch(MY_SERVER_URL + '/api/verify?gameName=' + encodeURIComponent(gameName) + '&tagLine=' + encodeURIComponent(tagLine) + '&soopId=' + encodeURIComponent(soopId));
                const data = await res.json();
                
                if(data.success) {
                    document.getElementById('result').innerText = "인증 성공! 치지직에 " + data.tier + " 티어가 적용됩니다.";
                    document.getElementById('result').style.color = "#2ecc71";
                    document.getElementById('iconArea').style.display = 'none';
                    document.getElementById('checkAndIssueButtonArea').style.display = 'block';
                    document.getElementById('issueChallenge').innerText = "인증 완료됨 (다시 인증)";
                } else {
                    document.getElementById('result').innerText = "인증 실패: " + data.message;
                    document.getElementById('result').style.color = "#e45252";
                }
            } catch(e) {
                document.getElementById('result').innerText = "통신 에러 발생";
                document.getElementById('result').style.color = "#e45252";
            }
        }
        document.getElementById('verifyButton').addEventListener('click', verifyCert);

        document.getElementById('cancelButton').addEventListener('click', () => {
            document.getElementById('iconArea').style.display = 'none';
            document.getElementById('checkAndIssueButtonArea').style.display = 'block';
            if (countdownInterval) clearInterval(countdownInterval);
            document.getElementById('result').innerText = "";
        });
    </script>
</body>
</html>
    `);
});

// [API 1 - 인증 요청]
app.get('/api/request-cert', async (req, res) => {
    const { gameName, tagLine, soopId } = req.query;
    try {
        const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${RIOT_API_KEY}`;
        const accountRes = await fetch(accountUrl);
        
        if (!accountRes.ok) return res.json({ success: false, message: "존재하지 않는 롤 닉네임 또는 태그입니다." });
        const accountData = await accountRes.json();
        
        const summonerUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}?api_key=${RIOT_API_KEY}`;
        const summonerRes = await fetch(summonerUrl);
        const summonerData = await summonerRes.json();
        const profileIconId = summonerData.profileIconId;

        const targetIconId = Math.floor(Math.random() * 50) + 1; 

        certRequests[soopId] = {
            startIconId: profileIconId,
            targetIconId: targetIconId,
            expireTime: Date.now() + (2 * 60 * 1000)
        };

        console.log(`[타이머 장부 등록] ${soopId} -> 최초 아이콘: ${profileIconId}번, 목표: ${targetIconId}번`);
        return res.json({ success: true, targetIconId: targetIconId });
    } catch (error) {
        console.error("request-cert error:", error);
        return res.json({ success: false, message: "Riot 서버 통신 오류" });
    }
});

//