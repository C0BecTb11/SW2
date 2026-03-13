// auth.js - Система аккаунтов

async function register() {
    const loginStr = document.getElementById('login').value.trim();
    const passStr = document.getElementById('password').value;
    const factionStr = document.getElementById('faction').value;

    if (!loginStr || !passStr) return showMsg('auth-msg', 'Введите логин и пароль', '#ff4444');

    // Тот самый трюк с фейковой почтой
    const fakeEmail = loginStr.toLowerCase() + '@galaxy.local';
    showMsg('auth-msg', 'Регистрация в сети...', '#00d4ff');

    const { data, error } = await client.auth.signUp({
        email: fakeEmail,
        password: passStr,
    });

    if (error) return showMsg('auth-msg', 'Ошибка: ' + error.message, '#ff4444');

    // Сохраняем логин и фракцию (Имя и Фамилию персонаж введет на следующем шаге!)
    const { error: profileError } = await client
        .from('profiles')
        .insert([{ id: data.user.id, username: loginStr, faction: factionStr }]);

    if (profileError) return showMsg('auth-msg', 'Ошибка БД', '#ff4444');

    // Переключаем игрока на создание Личного Дела (Персонажа)
    showScreen('char-screen');
}

async function login() {
    const loginStr = document.getElementById('login').value.trim();
    const passStr = document.getElementById('password').value;

    if (!loginStr || !passStr) return showMsg('auth-msg', 'Введите логин и пароль', '#ff4444');

    const fakeEmail = loginStr.toLowerCase() + '@galaxy.local';
    showMsg('auth-msg', 'Проверка доступов...', '#00d4ff');

    const { data, error } = await client.auth.signInWithPassword({
        email: fakeEmail,
        password: passStr,
    });

    if (error) return showMsg('auth-msg', 'Неверный логин или пароль', '#ff4444');

        // Проверяем: скачался ли профиль и есть ли там Имя
    const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('first_name')
        .eq('id', data.user.id)
        .single();

    // Если профиль вообще не найден (null) ИЛИ в нем нет Имени
    if (profileError || !profile || !profile.first_name) {
        // Отправляем заполнять Личное Дело
        showScreen('char-screen');
    } else {
        // Если имя есть - сразу пускаем на Глобальную Карту
        showScreen('game-screen');
        
        loadGameData();
    }
}

async function logout() {
    await client.auth.signOut();
    showScreen('auth-screen');
    document.getElementById('auth-msg').innerText = '';
}
