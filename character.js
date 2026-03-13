// character.js - Логика создания Личного Дела и спавна

async function createCharacter() {
    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();

    if (!firstName || !lastName) {
        return showMsg('char-msg', 'Ошибка: Введите Имя и Фамилию', '#ff4444');
    }

    showMsg('char-msg', 'Подготовка капсулы для высадки...', '#00d4ff');

    // 1. Узнаем, кто сейчас играет (берем ID текущей сессии)
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError || !session) return showMsg('char-msg', 'Критическая ошибка: Сессия потеряна', '#ff4444');
    
    const userId = session.user.id;

    // 2. Узнаем фракцию игрока из базы, чтобы понять, куда его высаживать
    const { data: profile } = await client
        .from('profiles')
        .select('faction')
        .eq('id', userId)
        .single();

    // 3. Ищем планету-столицу для этой фракции
    const { data: capitalPlanet } = await client
        .from('planets')
        .select('id')
        .eq('faction', profile.faction)
        .single();

    const spawnPlanetId = capitalPlanet ? capitalPlanet.id : null;

    // 4. Обновляем профиль игрока: записываем Имя, Фамилию и место спавна
    const { error: updateError } = await client
        .from('profiles')
        .update({
            first_name: firstName,
            last_name: lastName,
            location_id: spawnPlanetId
        })
        .eq('id', userId);

    if (updateError) {
        return showMsg('char-msg', 'Ошибка записи в БД: ' + updateError.message, '#ff4444');
    }

    // 5. УСПЕХ! Открываем глобальную карту
    showScreen('game-screen');
    
        
    loadGameData();
    
    // Чуть позже мы добавим сюда команды для загрузки радара и интерфейса
    // loadMap();
    // loadUI();
}
