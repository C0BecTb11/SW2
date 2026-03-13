// ui.js - Управление визуалом

// Функция переключения экранов
function showScreen(screenId) {
    // Прячем всё
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('char-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    
    // Показываем только нужный
    document.getElementById(screenId).classList.remove('hidden');
}

// Функция вывода цветного текста (ошибки/успех)
function showMsg(elementId, text, color) {
    const el = document.getElementById(elementId);
    el.innerText = text;
    el.style.color = color;
}

// Функция загрузки всех данных игрока
async function loadGameData() {
    // 1. Узнаем, кто в игре
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    // 2. Качаем профиль из БД
    const { data: profile } = await client.from('profiles').select('*').eq('id', userId).single();
    
    // 3. Качаем название планеты, на которой стоит игрок
    let locationName = "Открытый космос";
    if (profile.location_id) {
        const { data: planet } = await client.from('planets').select('name').eq('id', profile.location_id).single();
        if (planet) locationName = planet.name;
    }

    // 4. Вставляем данные в нижнюю панель
    document.getElementById('ui-name').innerText = profile.first_name + ' ' + profile.last_name;
    document.getElementById('ui-credits').innerText = profile.credits + ' кр.';
    document.getElementById('ui-location').innerText = "Место: " + locationName;
    
    let roleName = "Кадет";
    if (profile.role === 'leader') roleName = "Глава Фракции";
    if (profile.role === 'commander') roleName = "Командор";
    document.getElementById('ui-role').innerText = "Звание: " + roleName;

    // 5. Даем команду нарисовать карту!
    if (typeof loadMap === 'function') {
        loadMap();
    }
}
