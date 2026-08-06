window.openRosterErrorModal = function() {
    const modalHTML = `
        <div id="roster-error-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #f59e0b; max-width: 450px;">
                <div style="display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; background-color: rgba(245, 158, 11, 0.1); border-radius: 50%; margin: 0 auto 1.5rem auto;">
                    <i data-lucide="alert-triangle" style="color: #f59e0b; width: 32px; height: 32px;"></i>
                </div>
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem; text-align: center;">Minimum Roster Limit</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem; text-align: center;">You cannot remove this player! You must keep at least <strong style="color: #fff;">20 active players</strong> in your franchise, or have at least <strong style="color: #fbbf24;">200 coins</strong> to buy a replacement.</p>
                <div class="modal-actions" style="justify-content: center;">
                    <button class="btn btn-primary" id="btn-ok-roster" style="background-color: #f59e0b; border-color: #f59e0b; color: #fff; width: 100%;">Understood</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
    
    document.getElementById('btn-ok-roster').addEventListener('click', () => {
        document.getElementById('roster-error-modal').remove();
    });
}

window.openInsufficientCoinsModal = function(cost) {
    const modalHTML = `
        <div id="coins-error-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #ef4444; max-width: 450px;">
                <div style="display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; background-color: rgba(239, 68, 68, 0.1); border-radius: 50%; margin: 0 auto 1.5rem auto;">
                    <i data-lucide="x-circle" style="color: #ef4444; width: 32px; height: 32px;"></i>
                </div>
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem; text-align: center;">Insufficient Funds</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem; text-align: center;">You don't have enough coins! You need <strong style="color: #fbbf24;">${cost} coins</strong> to purchase this pack.</p>
                <div class="modal-actions" style="justify-content: center;">
                    <button class="btn btn-danger" id="btn-ok-coins" style="background-color: #ef4444; border-color: #ef4444; color: #fff; width: 100%;">Understood</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
    
    document.getElementById('btn-ok-coins').addEventListener('click', () => {
        document.getElementById('coins-error-modal').remove();
    });
}

window.openEmptyPoolModal = function() {
    const modalHTML = `
        <div id="empty-pool-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #8b5cf6; max-width: 450px;">
                <div style="display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; background-color: rgba(139, 92, 246, 0.1); border-radius: 50%; margin: 0 auto 1.5rem auto;">
                    <i data-lucide="award" style="color: #8b5cf6; width: 32px; height: 32px;"></i>
                </div>
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem; text-align: center;">Pool Exhausted!</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem; text-align: center;">Unbelievable! You have successfully scouted and collected <strong style="color: #fff;">every single player</strong> available in the OHL.</p>
                <div class="modal-actions" style="justify-content: center;">
                    <button class="btn btn-primary" id="btn-ok-pool" style="background-color: #8b5cf6; border-color: #8b5cf6; color: #fff; width: 100%;">Wow!</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
    
    document.getElementById('btn-ok-pool').addEventListener('click', () => {
        document.getElementById('empty-pool-modal').remove();
    });
}

window.openIncompleteMatchModal = function() {
    const modalHTML = `
        <div id="incomplete-match-modal" class="modal-overlay">
            <div class="modal-content" style="border-color: #ef4444; max-width: 450px;">
                <div style="display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; background-color: rgba(239, 68, 68, 0.1); border-radius: 50%; margin: 0 auto 1.5rem auto;">
                    <i data-lucide="shield-alert" style="color: #ef4444; width: 32px; height: 32px;"></i>
                </div>
                <h2 style="color: var(--text-color); font-family: 'Blockletter', sans-serif; font-size: 2.5rem; letter-spacing: 1px; margin-bottom: 1rem; text-align: center;">Incomplete Roster</h2>
                <p style="color: var(--text-muted); margin-bottom: 2.5rem; line-height: 1.5; font-size: 1.1rem; text-align: center;">You cannot start a match! Your roster is missing players. Ensure all <strong style="color: #fff;">20 regular positions</strong> are filled before the puck drops.</p>
                <div class="modal-actions" style="justify-content: center;">
                    <button class="btn btn-primary" id="btn-ok-incomplete" style="background-color: #ef4444; border-color: #ef4444; color: #fff; width: 100%;">Fix Roster</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    if (window.lucide) window.lucide.createIcons();
    
    document.getElementById('btn-ok-incomplete').addEventListener('click', () => {
        document.getElementById('incomplete-match-modal').remove();
        switchView('roster');
    });
}

// --- NOTIFICATION & AGE MANAGEMENT ---

