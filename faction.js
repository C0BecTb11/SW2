// faction.js - Система сбора разведданных фракции

async function openFactionPanel() {
    // 1. Показываем интерфейс
    document.getElementById('faction-panel').classList.remove('hidden');
    const listDiv = document.getElementById('faction-list');
    listDiv.innerHTML = '<p style="color: #00d4ff; text-align: center;">Установка защищенного соединения...</p>';

    // 2. Узнаем, в какой фракции состоит игрок
    const { data: { session } } = await client.auth.getSession();
    const { data: myProfile } = await client.from('profiles').select('faction').eq('id', session.user.id).single();
    const myFaction = myProfile.faction;

    // 3. Загружаем ВСЕ данные из базы (Игроки, Планеты, Флоты)
    const { data: members, error } = await client.from('profiles').select('*').eq('faction', myFaction);
    const { data: planets } = await client.from('planets').select('*');
    const { data: fleets } = await client.from('fleets').select('*');

    if (error) {
        listDiv.innerHTML = '<p style="color: #ff4444;">Ошибка связи с разведкой.</p>';
        return;
    }

    // 4. Сортируем список: Лидер всегда будет сверху
    members.sort((a, b) => {
        if (a.role === 'leader') return -1;
        if (b.role === 'leader') return 1;
        return 0;
    });

    let html = '';

    // 5. Собираем карточку-досье для КАЖДОГО участника
    members.forEach(member => {
        // Узнаем название планеты, где он стоит
        let locName = "Открытый космос";
        let currentPlanet = planets.find(p => p.id === member.location_id);
        if (currentPlanet) locName = currentPlanet.name;

        // Считаем его войско (суммируем количество всех его кораблей в таблице fleets)
        let myShips = fleets ? fleets.filter(f => f.owner_id === member.id) : [];
        let armyCount = myShips.reduce((sum, ship) => sum + ship.quantity, 0);

        // Ищем его владения (планеты, где он назначен губернатором)
        let myPlanets = planets.filter(p => p.governor_id === member.id);
        let possessions = myPlanets.length > 0 ? myPlanets.map(p => p.name).join(', ') : 'Нет владений';

        // Визуальное выделение Лидера
        let roleDisplay = member.role === 'leader' 
            ? '<span style="color:#ffcc00; font-weight:bold;">[Лидер]</span>' 
            : '<span style="color:#aaa;">[Участник]</span>';

        // Формируем блок HTML для этого человека
        html += `
            <div class="faction-card">
                <h4 style="margin: 0 0 10px 0; color: #fff; border-bottom: 1px solid #333; padding-bottom: 5px;">
                    ${roleDisplay} ${member.first_name} ${member.last_name}
                </h4>
                <p>📍 Место: <span style="color:#fff;">${locName}</span></p>
                <p>💰 Финансы: <span style="color:#14FF00;">${member.credits} кр.</span></p>
                <p>🚀 Войско: <span style="color:#fff;">${armyCount} ед.</span></p>
                <p>🌍 Владения: <span style="color:#00d4ff;">${possessions}</span></p>
            </div>
        `;
    });

    // 6. Выводим готовый список на экран
    listDiv.innerHTML = html;
}

function closeFactionPanel() {
    document.getElementById('faction-panel').classList.add('hidden');
}
