const axios = require('axios');

// 🔑 라이엇 사이트에서 복사한 키를 여기에 정확히 넣어주세요
const RIOT_API_KEY = 'RGAPI-ce3c7c08-f887-4075-bc98-ed43b86483d1'; 

// 🎯 테스트할 계정 정보
const gameName = 'Hide on bush'; 
const tagLine = 'KR1'; 

async function startVerificationTest() {
    try {
        console.log(`\n[1단계] 라이엇 서버에 '${gameName}#${tagLine}' 계정 조회를 요청합니다...`);

        // 1. Account-v1 API 호출 (Riot ID -> PUUID 변환)
        const accountUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${tagLine}?api_key=${RIOT_API_KEY}`;
        const accountResponse = await axios.get(accountUrl);
        const puuid = accountResponse.data.puuid;
        console.log(`✅ 계정 확인 성공! 고유 ID(PUUID): ${puuid}`);

        console.log(`\n[2단계] 해당 유저의 현재 소환사 프로필 아이콘을 조회합니다...`);
        // 2. Summoner-v4 API 호출 (PUUID -> 소환사 정보)
        const summonerUrl = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`;
        const summonerResponse = await axios.get(summonerUrl);
        const { id: summonerId, profileIconId } = summonerResponse.data;
        
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🎉 [조회 완료] 유저 실시간 정보`);
        console.log(`▶ 현재 설정된 아이콘 ID: ${profileIconId}번`);
        console.log(`▶ 암호화된 내부 ID: ${summonerId}`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`\n💡 이 ${profileIconId}번 아이콘 ID를 서버가 지정한 숫자와 대조하면 '본인 인증' 시스템이 완성됩니다!`);

    } catch (error) {
        console.error('\n❌ 통신 중 에러가 발생했습니다:');
        if (error.response) {
            console.error(`▶ 상태 코드: ${error.response.status}`);
            console.error(`▶ 서버 메시지:`, error.response.data);
            console.log(`\n💡 [조치 방법]: 라이엇 개발자 페이지에서 체크박스를 누르고 'REGENERATE API KEY'를 다시 클릭한 뒤, 새 키를 복사해서 위 4번째 줄에 정확히 저장해 보세요!`);
        } else {
            console.error(`▶ 에러 내용: ${error.message}`);
        }
    }
}

startVerificationTest();