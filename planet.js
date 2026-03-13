// planet.js - Система управления конкретной планетой

async function openPlanetPanel(planet) {
    // 1. Показываем Планшет
    document.getElementById('planet-panel').classList.remove('hidden');
    
    // 2. Вписываем Название и Фракцию
    document.getElementById('planet-title').innerText = planet.name;
    
    let factionName = "Нейтральная";
    if (planet.faction === 'rep') factionName = "Республика (Синие)";
    if (planet.faction === 'cis') factionName = "КНС (Желтые)";
    if (planet.faction === 'syn') factionName = "Синдикат (Зеленые)";
    document.getElementById('planet-faction').innerText = factionName;

    document.getElementById('planet-owner').innerText = "Запрос данных...";
    document.getElementById('planet-players').innerText = "Сканирование...";

    // 3. Узнаем, кто Губернатор
    if (planet.governor_id) {
        const { data: gov } = await client.from('profiles').select('first_name, last_name').eq('id', planet.governor_id).single();
        if (gov) document.getElementById('planet-owner').innerText = gov.first_name + ' ' + gov.last_name;
    } else {
        document.getElementById('planet-owner').innerText = "Планета свободна";
    }

    // 4. Ищем всех игроков, которые сейчас находятся на этой планете
    const { data: players } = await client.from('profiles').select('first_name, last_name').eq('location_id', planet.id);
    
    if (players && players.length > 0) {
        // Выводим список имен
        document.getElementById('planet-players').innerHTML = players.map(p => `• ${p.first_name} ${p.last_name}`).join('<br>');
    } else {
        document.getElementById('planet-players').innerText = "Никого нет.";
    }

    // 5. Загружаем постройки и рисуем 8 слотов
    const { data: buildings } = await client.from('buildings').select('*').eq('planet_id', planet.id);
    
    let slotsHtml = '';
    for (let i = 1; i <= 8; i++) {
        // Проверяем, есть ли постройка в этом слоте
        let b = buildings ? buildings.find(x => x.slot_number === i) : null;
        
        if (b) {
            // Слот занят
            slotsHtml += `<div class="building-slot" style="border-style: solid; border-color: #00d4ff; color: #00d4ff;">${b.building_name}</div>`;
        } else {
            // Слот пуст
            slotsHtml += `<div class="building-slot">Слот ${i}<br>Пусто</div>`;
        }
    }
    document.getElementById('planet-buildings').innerHTML = slotsHtml;
}

function closePlanetPanel() {
    document.getElementById('planet-panel').classList.add('hidden');
}
