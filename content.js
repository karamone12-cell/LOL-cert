console.log("🚀 [SOOP 롤 티어 인증기] 글자 출력 버전 가동!");

const userTierCache = {
    "kkka0326": "CHALLENGER", // 👑 유저님의 진짜 SOOP ID
    "qkakf6635": "CHALLENGER",
    "faker": "CHALLENGER"
};

// 🎨 티어별 글자 색상 세팅
const TIER_COLORS = {
    "CHALLENGER": "#f4c64d",   // 황금빛 챌린저
    "GRANDMASTER": "#e45252",  // 강렬한 그마
    "MASTER": "#cc52e4",       // 보라빛 마스터
    "DIAMOND": "#52a9e4",      // 다이아블루
    "EMERALD": "#2ecc71",      // 에메랄드 그린
    "PLATINUM": "#27ae60",     // 플래티넘
    "GOLD": "#f1c40f",         // 골드
    "SILVER": "#bdc3c7",       // 실버
    "BRONZE": "#95a5a6",       // 브론즈
    "IRON": "#7f8c8d"          // 아이언
};

// 0.5초마다 채팅창 스캔하는 무한 루프 엔진
setInterval(() => {
    const chatItems = document.querySelectorAll('.chatting-list-item');

    chatItems.forEach((node) => {
        // 이미 마크(이미지 또는 글자)가 박혀있다면 중복 방지를 위해 건너뜁니다.
        if (node.querySelector('.lol-tier-text')) return;

        const userButton = node.querySelector('button[user_id]') || (node.hasAttribute('user_id') ? node : null);
        
        if (userButton) {
            const soopId = userButton.getAttribute('user_id');
            
            if (userTierCache[soopId]) {
                const tier = userTierCache[soopId];
                const textColor = TIER_COLORS[tier] || "#ffffff";

                // 🎯 [핵심 개조] 이미지가 아니라 글자(span) 태그를 만듭니다!
                const tierSpan = document.createElement('span');
                tierSpan.className = 'lol-tier-text';
                
                // 화면에 노출될 글자 모양 (예: [CHALLENGER] 또는 [챌린저])
                // 유저님 취향에 맞게 [CHALLENGER] 대신 [챌]이나 [챌린저]로 글자를 고치셔도 됩니다!
                tierSpan.innerText = `[${tier}] `; 
                
                // 글자 스타일 예쁘게 꾸미기
                tierSpan.style.color = textColor;
                tierSpan.style.fontWeight = 'bold';
                tierSpan.style.fontSize = '12px';
                tierSpan.style.marginRight = '4px';
                tierSpan.style.verticalAlign = 'middle';

                // 닉네임 영역 조준 후 바로 앞에 글자 주입!
                const nameElement = node.querySelector('.author') || userButton.querySelector('.author') || userButton;
                
                if (nameElement === userButton) {
                    userButton.parentNode.insertBefore(tierSpan, userButton);
                } else if (nameElement) {
                    nameElement.insertBefore(tierSpan, nameElement.firstChild);
                }
                
                console.log(`🎯 [글자 주입 성공] ${soopId} 유저에게 [${tier}] 글자 부착 완료!`);
            }
        }
    });
}, 500);