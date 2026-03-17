// ui.js — Управление экранами и отображение данных Лорда

function showScreen(screenId) {
    ['auth-screen','register-screen','char-screen','game-screen'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');
}

function showMsg(elementId, text, color) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerText = text;
    el.style.color = color;
}

// Рендер нижней панели из кеша — 0 запросов к БД
function renderBottomUI() {
    const profile = Cache.myProfile;
    if (!profile) return;

    const fullName = profile.first_name + ' ' + profile.last_name;
    document.getElementById('ui-tab-name').innerText = fullName;
    document.getElementById('ui-tab-credits').innerText = profile.credits + ' д.';

    let locationName = 'В пути';
    if (profile.location_id) {
        const castle = Cache.getCastle(profile.location_id);
        if (castle) locationName = castle.name;
    }
    document.getElementById('ui-location').innerText = locationName;

    let roleName = 'Сквайр';
    if (profile.role === 'leader') roleName = 'Король';
    if (profile.role === 'commander') roleName = 'Маршал';
    document.getElementById('ui-role').innerText = roleName;
}

let uiCollapsed = false;
function toggleUI() {
    uiCollapsed = !uiCollapsed;
    document.getElementById('bottom-ui').classList.toggle('collapsed', uiCollapsed);
}

// Запускается один раз при входе
async function loadGameData() {
    const ok = await Cache.init();
    if (!ok) return;
    renderBottomUI();
    if (typeof loadMap === 'function') loadMap();
}

// ================================================
// МОДАЛЬНЫЕ ОКНА — замена alert/confirm
// ================================================

const Modal = {
    // Показать уведомление (замена alert)
    // icon: эмодзи, title: заголовок, text: текст
    notify(icon, title, text) {
        document.getElementById('modal-icon').innerText = icon;
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerText = text;

        const actions = document.getElementById('modal-actions');
        actions.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'modal-btn ok';
        btn.innerText = 'Понял';
        btn.onclick = () => this.close();
        actions.appendChild(btn);

        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    // Показать диалог подтверждения (замена confirm)
    // onConfirm — коллбэк при нажатии "Да"
    ask(icon, title, text, confirmLabel, onConfirm) {
        document.getElementById('modal-icon').innerText = icon;
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerText = text;

        const actions = document.getElementById('modal-actions');
        actions.innerHTML = '';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn cancel';
        cancelBtn.innerText = 'Отмена';
        cancelBtn.onclick = () => this.close();

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'modal-btn confirm';
        confirmBtn.innerText = confirmLabel;
        confirmBtn.onclick = () => { this.close(); onConfirm(); };

        actions.appendChild(cancelBtn);
        actions.appendChild(confirmBtn);

        document.getElementById('modal-overlay').classList.remove('hidden');
    },

    close() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }
};

// Закрытие по клику на фон
document.getElementById('modal-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) Modal.close();
});
