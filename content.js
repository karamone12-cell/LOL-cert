const SERVER_URL = "https://lol-cert.onrender.com";
const localTierMemory = {};

async function checkAndApplyTier(soopId, nicknameElement) {
    if (nicknameElement.dataset.tierChecked) return;
    nicknameElement.dataset.tierChecked = "true";

    if (localTierMemory[soopId] === undefined) {
        try {
            const res = await fetch(`${SERVER_URL}/api/get-tier?soopId=${soopId}`);
            const data = await res.json();
            localTierMemory[soopId] = data.success ? data.tier : null;
        } catch(e) {
            localTierMemory[soopId] = null;
        }
    }

    const tierString = localTierMemory[soopId];
    if (tierString) {
        // 🎨 사진과 똑같은 둥근 뱃지 디자인 생성
        const badge = document.createElement('span');
        badge.innerText = tierString; // 예: "EMERALD III 42LP" 또는 "UNRANKED"
        
        // --- [공통 뱃지 스타일] ---
        badge.style.display = "inline-block";
        badge.style.padding = "2px 6px";
        badge.style.borderRadius = "4px"; // 둥근 모서리
        badge.style.marginRight = "5px";
        badge.style.fontSize = "11px"; // 닉네임보다 살짝 작게
        badge.style.fontWeight = "bold";
        badge.style.color = "#ffffff"; // 글자색은 흰색
        badge.style.verticalAlign = "middle";

        // --- [티어별 배경색 커스텀] ---
        const upperTier = tierString.toUpperCase();
        if (upperTier.includes("IRON")) badge.style.backgroundColor = "#5a5a5a";
        else if (upperTier.includes("BRONZE")) badge.style.backgroundColor = "#8c513a";
        else if (upperTier.includes("SILVER")) badge.style.backgroundColor = "#80989d";
        else if (upperTier.includes("GOLD")) badge.style.backgroundColor = "#cd8837";
        else if (upperTier.includes("PLATINUM")) badge.style.backgroundColor = "#4e9996";
        else if (upperTier.includes("EMERALD")) badge.style.backgroundColor = "#25b47b"; // 사진 속 에메랄드 초록색
        else if (upperTier.includes("DIAMOND")) badge.style.backgroundColor = "#4267b2"; // 사진 속 다이아 파란색
        else if (upperTier.includes("MASTER")) badge.style.backgroundColor = "#9d48e0";
        else if (upperTier.includes("GRANDMASTER")) badge.style.backgroundColor = "#e04848";
        else if (upperTier.includes("CHALLENGER")) badge.style.backgroundColor = "#f4c874";
        else badge.style.backgroundColor = "#555555"; // UNRANKED 등급 (회색)

        // 닉네임 맨 앞에 뱃지 꽂아넣기
        nicknameElement.prepend(badge);
    }
}

// 숲 채팅창 감시자 (이전과 동일)
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
                const chatElement = node.closest('[user_id]') || node.querySelector('[user_id]');
                if (chatElement) {
                    const soopId = chatElement.getAttribute('user_id');
                    const nicknameElement = chatElement.querySelector('dt') || chatElement.querySelector('a') || chatElement;
                    if (soopId && nicknameElement) {
                        checkAndApplyTier(soopId, nicknameElement);
                    }
                }
            }
        });
    });
});

function startObserver() {
    const chatBox = document.getElementById('chat_area');
    if (chatBox) {
        observer.observe(chatBox, { childList: true, subtree: true });
        console.log("🚀 [SOOP 롤 티어 인증기] 고급 UI 모드 가동 완료!");
    } else {
        setTimeout(startObserver, 1000);
    }
}
startObserver();