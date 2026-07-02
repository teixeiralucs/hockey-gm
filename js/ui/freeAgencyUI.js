export function renderFreeAgencyPage(container) {
    if (!gameState.freeAgencyMarket) {
        container.innerHTML = `<h2 style="color:white; text-align:center; margin-top:2rem;">Free Agency module not initialized.</h2>`;
        return;
    }
    
    const market = gameState.freeAgencyMarket;
    
    // Always keep the market open
    if (!market.players || market.players.length === 0) {
        if (window.refreshFreeAgencyMarket) {
            window.refreshFreeAgencyMarket();
            // FreeAgency UI should now reflect the newly populated players
        }
    }

    let cardsHtml = '';
    
    market.players.forEach(playerId => {
        const isSold = market.soldSlots && market.soldSlots.includes(playerId);
        
        let p = window.globalDraftPool ? window.globalDraftPool.find(x => x.id === playerId) : null;
        if (!p) return;
        
        let price = 300;
        let tierColor = '#b45309'; // Bronze
        
        if (p.tier === 'gold') {
            price = 600;
            tierColor = '#fbbf24'; // Gold
        } else if (p.tier === 'silver') {
            price = 450;
            tierColor = '#94a3b8'; // Silver
        }

        if (isSold) {
            const cardInnerHtml = window.getTradingCardHTML(p);
            cardsHtml += `
                <div style="display: flex; flex-direction: column; gap: 0.8rem; align-items: center; filter: grayscale(100%) opacity(0.6); zoom: 0.65;">
                    <div style="display: flex; justify-content: center; position: relative;">
                        ${cardInnerHtml}
                        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 20;">
                            <span style="font-family: 'Blockletter', sans-serif; font-size: 3.5rem; color: #ef4444; border: 5px solid #ef4444; padding: 0.5rem 2rem; transform: rotate(-15deg); text-shadow: 0 4px 6px rgba(0,0,0,0.8); background: rgba(0,0,0,0.6); border-radius: 12px; box-shadow: 0 10px 20px rgba(0,0,0,0.5);">SOLD</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const canAfford = (gameState.coins || 0) >= price;
            const affordStyle = canAfford ? '' : 'filter: grayscale(100%); opacity: 0.5; pointer-events: none;';
            const cardInnerHtml = window.getTradingCardHTML(p);
            cardsHtml += `
                <div style="display: flex; flex-direction: column; gap: 0.8rem; align-items: center; zoom: 0.65;">
                    <div style="display: flex; justify-content: center;">
                        ${cardInnerHtml}
                    </div>
                    
                    <button class="btn" ${!canAfford ? 'disabled' : ''} onclick="signFreeAgent(${p.id}, ${price})" style="width: 100%; max-width: 320px; display: flex; justify-content: center; align-items: center; gap: 0.5rem; font-size: 1.2rem; background: linear-gradient(135deg, ${tierColor} 0%, color-mix(in srgb, ${tierColor} 60%, black) 100%); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 0.8rem; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.3); transition: all 0.2s; cursor: pointer; ${affordStyle}">
                        SIGN FOR <i data-lucide="coins" style="color: #fbbf24; width: 22px; height: 22px;"></i> <span style="font-family: 'Blockletter', sans-serif; font-size: 1.5rem; line-height: 1; letter-spacing: 1px;">${price}</span>
                    </button>
                </div>
            `;
        }
    });

    container.innerHTML = `
        <!-- GRID -->
        <div style="width: 100%; max-width: 1600px; margin: 1rem auto 0 auto; display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
            ${cardsHtml}
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

window.signFreeAgent = function(playerId, price) {
    if (!gameState || !currentTeam) return;

    let p = window.globalDraftPool ? window.globalDraftPool.find(x => x.id === playerId) : null;
    if (!p) return;
    
    if ((gameState.coins || 0) < price) {
        if (window.openInsufficientCoinsModal) {
            window.openInsufficientCoinsModal(price);
        } else {
            alert("Not enough coins!");
        }
        return;
    }
    
    // Deduct coins
    gameState.coins -= price;
    if (window.updateCoinsDisplay) window.updateCoinsDisplay();
    
    // Add to players array
    let newPlayer = {
        ...p,
        teamId: currentTeam.id,
        location: 'bench',
        stats: { goals: 0, assists: 0, points: 0, games: 0, shotsAgainst: 0, saves: 0, goalsAgainst: 0 }
    };
    gameState.players.push(newPlayer);
    
    // Mark slot as sold
    if (!gameState.freeAgencyMarket.soldSlots) {
        gameState.freeAgencyMarket.soldSlots = [];
    }
    gameState.freeAgencyMarket.soldSlots.push(playerId);
    
    if (window.logEvent) {
        window.logEvent(`Signed ${p.name} for ${price} 🪙`, '#10b981');
    }
    
    if (window.saveGame) window.saveGame();
    
    // Re-render Shop Tab (which includes Free Agency)
    const mainContent = document.getElementById('main-content');
    if (mainContent && window.renderShopPage) {
        window.renderShopPage(mainContent);
    } else if (mainContent) {
        renderFreeAgencyPage(mainContent);
    }
};
