// auth.js — Система присяги (аккаунтов)

function showRegisterScreen() {
    showScreen('register-screen');
    // Очищаем поля
    document.getElementById('reg-login').value = '';
    document.getElementById('reg-password').value = '';
    document.getElementById('reg-msg').innerText = '';
}

async function register() {
    const loginStr = document.getElementById('reg-login').value.trim();
    const passStr = document.getElementById('reg-password').value;
    const factionEl = document.querySelector('input[name="faction"]:checked');
    const factionStr = factionEl ? factionEl.value : 'lion';

    if (!loginStr || !passStr) return showMsg('reg-msg', 'Введите Имя и Пароль', '#8a1c1c');
    if (passStr.length < 6) return showMsg('reg-msg', 'Пароль — не менее 6 символов', '#8a1c1c');

    showMsg('reg-msg', 'Отправка гонцов...', '#ffd700');

    const fakeEmail = loginStr.toLowerCase() + '@calradia.local';
    const { data, error } = await client.auth.signUp({ email: fakeEmail, password: passStr });
    if (error) return showMsg('reg-msg', 'Ошибка: ' + error.message, '#8a1c1c');

    const { error: profileError } = await client.from('profiles').insert([{
        id: data.user.id, username: loginStr, faction: factionStr
    }]);
    if (profileError) return showMsg('reg-msg', 'Ошибка летописи', '#8a1c1c');

    showScreen('char-screen');
}

async function login() {
    const loginStr = document.getElementById('login').value.trim();
    const passStr = document.getElementById('password').value;

    if (!loginStr || !passStr) return showMsg('auth-msg', 'Введите Имя и Пароль', '#8a1c1c');

    showMsg('auth-msg', 'Проверка печатей...', '#ffd700');

    // Сначала проверяем — есть ли такой лорд в летописи
    const { data: existing } = await client
        .from('profiles')
        .select('id')
        .eq('username', loginStr)
        .single();

    if (!existing) {
        return showMsg('auth-msg', 'Лорд с таким именем не найден. Принесите присягу!', '#8a1c1c');
    }

    const fakeEmail = loginStr.toLowerCase() + '@calradia.local';
    const { data, error } = await client.auth.signInWithPassword({ email: fakeEmail, password: passStr });
    if (error) return showMsg('auth-msg', 'Неверный пароль', '#8a1c1c');

    const { data: profile } = await client.from('profiles')
        .select('first_name').eq('id', data.user.id).single();

    showMsg('auth-msg', '', '');
    if (!profile?.first_name) {
        showScreen('char-screen');
    } else {
        showScreen('game-screen');
        loadGameData();
    }
}

async function logout() {
    await client.auth.signOut();
    Cache.planets = []; Cache.players = [];
    Cache.myProfile = null; Cache.myUserId = null;
    // Очищаем поля входа
    document.getElementById('login').value = '';
    document.getElementById('password').value = '';
    document.getElementById('auth-msg').innerText = '';
    showScreen('auth-screen');
}
