// castle.js — Данные о Замке (из кеша + 1 запрос на постройки)

async function openCastlePanel(castle) {
    document.getElementById('castle-panel').classList.remove('hidden');
    document.getElementById('castle-title').innerText = castle.name;
    document.getElementById('castle-faction').innerText = Cache.getFactionName(castle.faction);

    // Наместник — из кеша, 0 запросов
    if (castle.governor_id) {
        const gov = Cache.getPlayer(castle.governor_id);
        document.getElementById('castle-owner').innerText = gov
            ? gov.first_name + ' ' + gov.last_name
            : 'Вольный город';
    } else {
        document.getElementById('castle-owner').innerText = 'Вольный город';
    }

    // Лорды в замке — из кеша, 0 запросов
    const playersHere = Cache.getPlayersInCastle(castle.id);
    if (playersHere.length > 0) {
        document.getElementById('castle-players').innerHTML =
            playersHere.map(p => `• ${p.first_name} ${p.last_name}`).join('<br>');
    } else {
        document.getElementById('castle-players').innerText = 'Лордов в замке нет.';
    }

    // Постройки — 1 запрос (динамические данные, не кешируем)
    const { data: buildings } = await client.from('buildings').select('*').eq('castle_id', castle.id);
    let slotsHtml = '';
    for (let i = 1; i <= 8; i++) {
        const b = buildings ? buildings.find(x => x.slot_number === i) : null;
        if (b) {
            slotsHtml += `<div class="building-slot" style="border-style:solid; border-color:#ffd700; color:#ffd700;">${b.building_name}</div>`;
        } else {
            slotsHtml += `<div class="building-slot">Участок ${i}<br>Пусто</div>`;
        }
    }
    document.getElementById('castle-buildings').innerHTML = slotsHtml;
}

function closeCastlePanel() {
    document.getElementById('castle-panel').classList.add('hidden');
}
