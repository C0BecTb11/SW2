// faction.js — Сводка о лордах Королевства (из кеша + 1 запрос на войска)

async function openFactionPanel() {
    document.getElementById('faction-panel').classList.remove('hidden');
    const listDiv = document.getElementById('faction-list');
    listDiv.innerHTML = '<p style="color: #ffd700; text-align: center;">Шпионы собирают вести...</p>';

    const myFaction = Cache.myProfile?.faction;
    if (!myFaction) return;

    // Войска — единственное, чего нет в кеше (1 запрос вместо 4)
    const { data: troops } = await client.from('troops').select('owner_id, quantity');

    const members = Cache.players
        .filter(p => p.faction === myFaction)
        .sort((a, b) => {
            if (a.role === 'leader') return -1;
            if (b.role === 'leader') return 1;
            return 0;
        });

    let html = '';
    members.forEach(member => {
        const castle = member.location_id ? Cache.getCastle(member.location_id) : null;
        const locName = castle ? castle.name : 'В пути';

        const myTroops = troops ? troops.filter(t => t.owner_id === member.id) : [];
        const armyCount = myTroops.reduce((sum, t) => sum + t.quantity, 0);

        const myCastles = Cache.castles.filter(p => p.governor_id === member.id);
        const possessions = myCastles.length > 0 ? myCastles.map(p => p.name).join(', ') : 'Нет владений';

        const roleDisplay = member.role === 'leader'
            ? '<span style="color:#ffd700; font-weight:bold;">[Король]</span>'
            : '<span style="color:#aaa;">[Лорд]</span>';

        html += `
            <div class="faction-card">
                <h4 style="margin: 0 0 10px 0; color: #fff; border-bottom: 1px solid #554422; padding-bottom: 5px;">
                    ${roleDisplay} ${member.first_name} ${member.last_name}
                </h4>
                <p>📍 Стоянка: <span style="color:#fff;">${locName}</span></p>
                <p>💰 Казна: <span style="color:#ffd700;">${member.credits} д.</span></p>
                <p>⚔️ Войско: <span style="color:#fff;">${armyCount} чел.</span></p>
                <p>🏰 Владения: <span style="color:#a88734;">${possessions}</span></p>
            </div>
        `;
    });

    listDiv.innerHTML = html || '<p style="color:#aaa; text-align:center;">Нет лордов в этой фракции.</p>';
}

function closeFactionPanel() {
    document.getElementById('faction-panel').classList.add('hidden');
}
