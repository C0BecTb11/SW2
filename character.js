// character.js — Создание Лорда и спавн в Столице

async function createCharacter() {
    const firstName = document.getElementById('first-name').value.trim();
    const lastName = document.getElementById('last-name').value.trim();

    if (!firstName || !lastName) return showMsg('char-msg', 'Впишите Имя и Род', '#8a1c1c');
    showMsg('char-msg', 'Седлаем коня...', '#ffd700');

    const { data: { session } } = await client.auth.getSession();
    const userId = session.user.id;

    // Фракция из профиля — 1 запрос
    const { data: profile } = await client.from('profiles').select('faction').eq('id', userId).single();

    // Столица — 1 запрос
    const { data: capitalCastle } = await client
        .from('castles').select('id')
        .eq('faction', profile.faction)
        .eq('is_capital', true)
        .limit(1).single();

    const spawnCastleId = capitalCastle ? capitalCastle.id : null;

    // Сохраняем — 1 запрос
    const { error } = await client.from('profiles').update({
        first_name: firstName,
        last_name: lastName,
        location_id: spawnCastleId
    }).eq('id', userId);

    if (error) return showMsg('char-msg', 'Ошибка летописи: ' + error.message, '#8a1c1c');

    showScreen('game-screen');
    loadGameData();
}
