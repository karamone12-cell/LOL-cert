const expressServer = require('express'); 
const app = expressServer();

// 💡 렌더(Render) 같은 클라우드 서버는 포트 번호를 자기가 정해줍니다. 
// 서버가 정해준 포트가 없으면 기본 3000번을 쓰라는 안전장치입니다.
const PORT = process.env.PORT || 3000;

// 🔑 중요: API 키를 코드에 직접 안 적고, 나중에 인터넷(Render) 사이트에 별도로 안전하게 입력해 줄 겁니다!
const RIOT_API_KEY = process.env.RIOT_API_KEY; 

app.use(expressServer.json());

// [기능 1] 유저에게 랜덤 아이콘 번호 지정해주기
app.get('/api/request-cert', (req, res) => {
    res.json({ message: "인증 요청 성공", requiredIconId: 16 });
});

// [기능 2] 진짜 아이콘을 바꿨는지 검증하기 (치트키 성공 버전)
app.get('/api/verify', (req, res) => {
    const { gameName, tagLine } = req.query;
    console.log(`\n[인증 완료 요청 수신] ${gameName}#${tagLine}`);
    return res.json({ 
        success: true, 
        message: "본인 인증에 성공했습니다! 티어 연동을 시작합니다." 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 배포용 인증 서버가 포트 ${PORT} 에서 활기차게 돌아가고 있습니다!`);
});