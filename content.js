// 1. 내 렌더 서버 주소 (유저님의 실제 무적 서버)
const SERVER_URL = "https://lol-cert.onrender.com";

// 2. 서버에 물어본 티어 결과를 임시로 기억해둘 공간 (렉 방지, 속도 최적화)
const localTierMemory = {};

// 3. 숲(SOOP) 채팅창에 뱃지를 달아주는 핵심 함수
async function checkAndApplyTier(soopId, nicknameElement) {
    // 이미 뱃지를 달았는지 확인 (중복 뱃지 생성 방지)
    if (nicknameElement.dataset.tierChecked) return;
    nicknameElement.dataset.tierChecked = "true";

    // 서버에 티어 물어보기 (기억에 없으면 API 찌르기!)
    if (localTierMemory[soopId] === undefined) {
        try {
            const res = await fetch(`${SERVER_URL}/api/get-tier?soopId=${soopId}`);
            const data = await res.json();
            // 인증된 유저면 티어 글자를 저장, 아니면 null 저장
            localTierMemory[soopId] = data.success ? data.tier : null;
        } catch(e) {
            localTierMemory[soopId] = null;
        }
    }

    // 인증된 유저라면 닉네임 앞에 영롱한 뱃지 달아주기!
    const tier = localTierMemory[soopId];
    if (tier) {
        const badge = document.createElement('span');
        badge.innerText = `[${tier}] `;
        badge.style.color = "#f4c64d"; // 영롱한 골드색
        badge.style.fontWeight = "bold";
        badge.style.fontSize = "13px";
        badge.style.marginRight = "3px";
        
        // 닉네임 요소 맨 앞에 뱃지 끼워넣기
        nicknameElement.prepend(badge);
    }
}

// 4. 채팅창 감시자 (새 채팅이 올라올 때마다 낚아채는 역할)
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            // HTML 요소(새로운 채팅)가 추가되었을 때만 작동
            if (node.nodeType === 1) {
                // SOOP 채팅창 구조상 유저 아이디(user_id)가 있는 태그를 낚아챔
                const chatElement = node.closest('[user_id]') || node.querySelector('[user_id]');
                if (chatElement) {
                    const soopId = chatElement.getAttribute('user_id');
                    
                    // 닉네임이 적힌 요소 찾기 (보통 dt 태그)
                    const nicknameElement = chatElement.querySelector('dt') || chatElement.querySelector('a') || chatElement;
                    
                    if (soopId && nicknameElement) {
                        checkAndApplyTier(soopId, nicknameElement);
                    }
                }
            }
        });
    });
});

// 5. 방송국 채팅창 영역을 찾아서 감시 시작!
function startObserver() {
    // SOOP 채팅창 전체를 감싸는 영역 찾기
    const chatBox = document.getElementById('chat_area');
    if (chatBox) {
        observer.observe(chatBox, { childList: true, subtree: true });
        console.log("🚀 [SOOP 롤 티어 인증기] 자동 추적기 가동 완료!");
    } else {
        // 아직 채팅창 로딩이 안 됐으면 1초 뒤에 다시 찾기
        setTimeout(startObserver, 1000);
    }
}

// 스크립트가 켜지면 즉시 감시 시작
startObserver();