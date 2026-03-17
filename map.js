// map.js - Система карты и путешествий

// ---- МАСКА ПРОХОДИМОСТИ ----
const walkmap = {
    canvas: null, ctx: null,
    width: 0, height: 0, ready: false,

    load() {
        const img = new Image();
        img.src = 'walkmap.png';
        img.onload = () => {
            this.canvas = document.createElement('canvas');
            this.width  = img.width;
            this.height = img.height;
            this.canvas.width  = this.width;
            this.canvas.height = this.height;
            this.ctx = this.canvas.getContext('2d');
            this.ctx.drawImage(img, 0, 0);
            this.ready = true;
            console.log(`Walkmap: ${this.width}x${this.height}`);
        };
    },

    // true = суша, false = вода
    isLand(worldX, worldY) {
        if (!this.ready) return true;
        const mx = Math.round(worldX * this.width  / MAP_WIDTH);
        const my = Math.round(worldY * this.height / MAP_HEIGHT);
        if (mx < 0 || my < 0 || mx >= this.width || my >= this.height) return false;
        const pixel = this.ctx.getImageData(mx, my, 1, 1).data;
        return pixel[0] > 128;
    },

    // Проверяет весь маршрут по промежуточным точкам
    isPathLand(x1, y1, x2, y2, steps = 12) {
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            if (!this.isLand(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
        }
        return true;
    }
};

let offsetX = 0; let offsetY = 0;

// ---- ПЛАШКА ПОХОДА ----
let marchTimerInterval = null;

function updateMarchHUD() {
    const me = Cache.myProfile;
    const hud = document.getElementById('march-hud');

    const isMoving = me && me.move_end_time && me.move_end_time > Date.now() && !me.location_id;

    if (!isMoving) {
        hud.classList.add('hidden');
        if (marchTimerInterval) { clearInterval(marchTimerInterval); marchTimerInterval = null; }
        return;
    }

    hud.classList.remove('hidden');

    // Определяем название точки назначения
    const destCastle = Cache.castles.find(p =>
        Math.sqrt(Math.pow(p.x - me.target_x, 2) + Math.pow(p.y - me.target_y, 2)) < 5
    );
    document.getElementById('march-destination').innerText =
        destCastle ? destCastle.name : 'Открытая местность';

    // Запускаем тикающий таймер
    if (!marchTimerInterval) {
        marchTimerInterval = setInterval(() => {
            const m = Cache.myProfile;

            // Прибыли в замок — скрываем плашку
            if (!m || m.location_id || !m.move_end_time) {
                hud.classList.add('hidden');
                clearInterval(marchTimerInterval); marchTimerInterval = null;
                return;
            }

            const remaining = m.move_end_time - Date.now();
            if (remaining <= 0) {
                document.getElementById('march-timer').innerText = '00:00:00';
                document.getElementById('march-progress-bar').style.width = '100%';
                clearInterval(marchTimerInterval); marchTimerInterval = null;
                hud.classList.add('hidden');
                return;
            }

            const totalTime = m.move_end_time - m.move_start_time;
            const elapsed = Date.now() - m.move_start_time;
            const pct = Math.min((elapsed / totalTime) * 100, 100).toFixed(1);
            document.getElementById('march-progress-bar').style.width = pct + '%';

            const h = Math.floor(remaining / 3600000);
            const min = Math.floor((remaining % 3600000) / 60000);
            const sec = Math.floor((remaining % 60000) / 1000);
            document.getElementById('march-timer').innerText =
                `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
        }, 1000);
    }
}

async function stopMarch() {
    const me = Cache.myProfile;
    if (!me || !me.move_end_time || me.move_end_time <= Date.now()) return;

    // Вычисляем текущую позицию лорда в момент остановки
    const totalTime = me.move_end_time - me.move_start_time;
    const progress = Math.min((Date.now() - me.move_start_time) / totalTime, 1);
    const stopX = Math.round(me.start_x + (me.target_x - me.start_x) * progress);
    const stopY = Math.round(me.start_y + (me.target_y - me.start_y) * progress);

    // Останавливаем: обнуляем move_end_time, фиксируем позицию
    const updates = {
        move_end_time: 0,
        move_start_time: 0,
        start_x: stopX, start_y: stopY,
        target_x: stopX, target_y: stopY,
        location_id: null
    };

    await client.from('profiles').update(updates).eq('id', Cache.myUserId);
    Cache.updatePlayer(updates);

    document.getElementById('ui-location').innerText = 'Привал (Лес/Поле)';
    document.getElementById('march-hud').classList.add('hidden');
    if (marchTimerInterval) { clearInterval(marchTimerInterval); marchTimerInterval = null; }
}
let scale = 1;
let minScale = 0.2; let maxScale = 3.0;

let isDraggingMap = false; let mapDragged = false;
let startX = 0; let startY = 0;
let initialDistance = 0; let initialScale = 1;

const bgImage = new Image(); bgImage.src = 'worldmap.jpg';
const castleIcon = new Image(); castleIcon.src = 'images/castle.png';
const lordIcon = new Image(); lordIcon.src = 'images/lord.png';

let MAP_WIDTH = 2000; let MAP_HEIGHT = 2000;

bgImage.onload = () => {
    MAP_WIDTH = bgImage.width; MAP_HEIGHT = bgImage.height;
    scale = Math.max(window.innerWidth / MAP_WIDTH, window.innerHeight / MAP_HEIGHT);
    offsetX = (window.innerWidth - MAP_WIDTH * scale) / 2;
    offsetY = (window.innerHeight - MAP_HEIGHT * scale) / 2;
};

castleIcon.onload = () => { drawMap(); };
lordIcon.onload = () => { drawMap(); };

function loadMap() {
    walkmap.load();
    const canvas = document.getElementById('world-map');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Пересчитываем scale если карта уже загружена к этому моменту
    if (bgImage.complete && bgImage.naturalWidth !== 0) {
        MAP_WIDTH = bgImage.width;
        MAP_HEIGHT = bgImage.height;
        scale = Math.max(window.innerWidth / MAP_WIDTH, window.innerHeight / MAP_HEIGHT);
    }

    const me = Cache.myProfile;

    // Если вышли из игры пока шли — фиксируем прибытие при следующем входе
    if (me && !me.location_id && me.move_end_time && me.move_end_time <= Date.now()) {
        const arrivedCity = Cache.castles.find(p =>
            Math.sqrt(Math.pow(p.x - me.target_x, 2) + Math.pow(p.y - me.target_y, 2)) < 5
        );
        if (arrivedCity) {
            const updates = { location_id: arrivedCity.id, move_end_time: 0, move_start_time: 0 };
            client.from('profiles').update(updates).eq('id', Cache.myUserId);
            Cache.updatePlayer(updates);
        }
    }

    if (me && me.location_id) {
        const myCity = Cache.getCastle(me.location_id);
        if (myCity) {
            offsetX = (window.innerWidth / 2) - (myCity.x * scale);
            offsetY = (window.innerHeight / 2) - (myCity.y * scale);
        }
    } else if (me && me.target_x && me.target_y) {
        // Центрируем на текущей позиции если в поле
        offsetX = (window.innerWidth / 2) - (me.target_x * scale);
        offsetY = (window.innerHeight / 2) - (me.target_y * scale);
    }

    gameLoop();
    updateMarchHUD();
}

function gameLoop() {
    drawMap();
    requestAnimationFrame(gameLoop);
}

function drawMap() {
    const canvas = document.getElementById('world-map');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. ФОН
    if (bgImage.complete && bgImage.naturalWidth !== 0) {
        ctx.drawImage(bgImage, offsetX, offsetY, MAP_WIDTH * scale, MAP_HEIGHT * scale);
    }

    // 2. ЗАМКИ — из кеша
    Cache.castles.forEach(castle => {
        const screenX = castle.x * scale + offsetX;
        const screenY = castle.y * scale + offsetY;
        const iconSize = Math.max(12, 45 * scale);
        const fontSize = Math.max(10, 16 * scale);

        if (castle.faction === 'lion') ctx.fillStyle = 'rgba(204, 34, 34, 0.7)';
        else if (castle.faction === 'empire') ctx.fillStyle = 'rgba(34, 119, 204, 0.7)';
        else if (castle.faction === 'horde') ctx.fillStyle = 'rgba(34, 170, 68, 0.7)';
        else ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';

        ctx.beginPath(); ctx.arc(screenX, screenY, iconSize * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.closePath();

        if (castleIcon.complete) ctx.drawImage(castleIcon, screenX - iconSize/2, screenY - iconSize/2, iconSize, iconSize);

        if (scale > 0.5) {
            ctx.font = `bold ${fontSize}px Georgia`; ctx.textAlign = 'center'; ctx.lineWidth = 3;
            ctx.strokeStyle = '#000'; ctx.strokeText(castle.name, screenX, screenY - iconSize/2 - 6);
            ctx.fillStyle = '#ffd700'; ctx.fillText(castle.name, screenX, screenY - iconSize/2 - 6);
        }
    });

    // 3. ЛОРДЫ — из кеша
    const now = Date.now();
    const myUserId = Cache.myUserId;

    Cache.players.forEach(player => {
        if (!player.first_name) return; // Ещё не создал персонажа
        let drawX = 0; let drawY = 0;
        let inCastle = false;

        if (player.move_end_time && player.move_end_time > now) {
            // В пути — интерполируем позицию
            const totalTime = player.move_end_time - player.move_start_time;
            const progress = Math.min((now - player.move_start_time) / totalTime, 1);
            drawX = player.start_x + (player.target_x - player.start_x) * progress;
            drawY = player.start_y + (player.target_y - player.start_y) * progress;

        } else if (player.location_id) {
            // В замке
            const city = Cache.getCastle(player.location_id);
            if (city) { drawX = city.x; drawY = city.y; inCastle = true; }

        } else if (player.target_x && player.target_y) {
            // В поле (привал или только что остановился)
            drawX = player.target_x;
            drawY = player.target_y;

            // Проверяем прибытие только для себя
            if (player.id === myUserId && player.move_end_time && player.move_end_time <= now) {
                const arrivedCity = Cache.castles.find(p =>
                    Math.sqrt(Math.pow(p.x - drawX, 2) + Math.pow(p.y - drawY, 2)) < 5
                );
                if (arrivedCity && !player.is_saving_arrival) {
                    player.is_saving_arrival = true;
                    client.from('profiles').update({ location_id: arrivedCity.id }).eq('id', myUserId).then(() => {
                        player.is_saving_arrival = false;
                        Cache.updatePlayer({ location_id: arrivedCity.id });
                        document.getElementById('ui-location').innerText = arrivedCity.name;
                    });
                } else if (!arrivedCity) {
                    document.getElementById('ui-location').innerText = 'Привал (Лес/Поле)';
                }
            }
        }

        if (drawX === 0 && drawY === 0) return;

        const screenX = drawX * scale + offsetX;
        const screenY = drawY * scale + offsetY;

        // Не рисуем если за пределами экрана
        const canvas = document.getElementById('world-map');
        if (screenX < -50 || screenX > canvas.width + 50 ||
            screenY < -50 || screenY > canvas.height + 50) return;

        const lordSize = Math.max(16, 32 * scale);

        // Определяем цвет фракции
        let factionColor = '#ffffff';
        if (player.faction === 'lion')   factionColor = '#cc2222';
        if (player.faction === 'empire') factionColor = '#2277cc';
        if (player.faction === 'horde')  factionColor = '#22aa44';

        // Если в замке — рисуем маленький кружок со смещением (не поверх иконки замка)
        if (inCastle) {
            const offset = Math.max(8, 20 * scale);
            const cx = screenX + offset;
            const cy = screenY - offset;
            const r = Math.max(4, 8 * scale);

            ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
            ctx.fillStyle = '#000'; ctx.fill(); ctx.closePath();

            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = factionColor; ctx.fill(); ctx.closePath();

            if (scale > 0.6) {
                ctx.font = `bold ${Math.max(9, 11 * scale)}px Georgia`;
                ctx.textAlign = 'center'; ctx.lineWidth = 2;
                ctx.strokeStyle = '#000';
                ctx.strokeText(player.first_name, cx, cy - r - 3);
                ctx.fillStyle = '#fff';
                ctx.fillText(player.first_name, cx, cy - r - 3);
            }
            return;
        }

        // В пути или на привале — рисуем иконку лорда
        if (lordIcon.complete && lordIcon.naturalWidth !== 0) {
            // Цветная обводка по фракции
            ctx.save();
            ctx.shadowColor = factionColor;
            ctx.shadowBlur = 8;
            ctx.drawImage(lordIcon, screenX - lordSize/2, screenY - lordSize/2, lordSize, lordSize);
            ctx.restore();
        } else {
            ctx.beginPath(); ctx.arc(screenX, screenY, 6, 0, Math.PI * 2);
            ctx.fillStyle = factionColor; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = '#000'; ctx.stroke(); ctx.closePath();
        }

        if (scale > 0.5) {
            ctx.font = `bold ${Math.max(10, 12 * scale)}px Georgia`;
            ctx.textAlign = 'center'; ctx.lineWidth = 2;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(player.first_name, screenX, screenY - lordSize/2 - 4);
            ctx.fillStyle = factionColor;
            ctx.fillText(player.first_name, screenX, screenY - lordSize/2 - 4);
        }
    });
}

// --- УПРАВЛЕНИЕ КАРТОЙ ---
const canvas = document.getElementById('world-map');
function getDistance(touches) {
    return Math.sqrt(
        Math.pow(touches[0].clientX - touches[1].clientX, 2) +
        Math.pow(touches[0].clientY - touches[1].clientY, 2)
    );
}

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        isDraggingMap = true; mapDragged = false;
        startX = e.touches[0].clientX - offsetX;
        startY = e.touches[0].clientY - offsetY;
    } else if (e.touches.length === 2) {
        isDraggingMap = false;
        initialDistance = getDistance(e.touches);
        initialScale = scale;
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDraggingMap) {
        mapDragged = true;
        offsetX = e.touches[0].clientX - startX;
        offsetY = e.touches[0].clientY - startY;
    } else if (e.touches.length === 2) {
        mapDragged = true;
        let newScale = initialScale * (getDistance(e.touches) / initialDistance);
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        const cX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        offsetX -= (cX - offsetX) * (newScale / scale - 1);
        offsetY -= (cY - offsetY) * (newScale / scale - 1);
        scale = newScale;
    }
}, { passive: false });

canvas.addEventListener('touchend', () => { isDraggingMap = false; });

canvas.addEventListener('mousedown', (e) => {
    isDraggingMap = true; mapDragged = false;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDraggingMap) return;
    mapDragged = true;
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
});

canvas.addEventListener('mouseup', () => { isDraggingMap = false; });

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    let newScale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor));
    offsetX -= (e.clientX - offsetX) * (newScale / scale - 1);
    offsetY -= (e.clientY - offsetY) * (newScale / scale - 1);
    scale = newScale;
}, { passive: false });

canvas.addEventListener('click', async function(event) {
    if (mapDragged) return;

    const rect = this.getBoundingClientRect();
    const worldX = ((event.clientX - rect.left) - offsetX) / scale;
    const worldY = ((event.clientY - rect.top) - offsetY) / scale;

    const me = Cache.myProfile;
    if (!me) return;

    // Проверяем клик по замку
    let clickedCastle = null;
    for (let p of Cache.castles) {
        if (Math.sqrt(Math.pow(worldX - p.x, 2) + Math.pow(worldY - p.y, 2)) <= 25 / scale) {
            clickedCastle = p; break;
        }
    }

    if (clickedCastle) {
        let myX = me.target_x || 0;
        let myY = me.target_y || 0;
        if (me.location_id) {
            const city = Cache.getCastle(me.location_id);
            if (city) { myX = city.x; myY = city.y; }
        }

        const dist = Math.sqrt(Math.pow(myX - clickedCastle.x, 2) + Math.pow(myY - clickedCastle.y, 2));
        const isMoving = me.move_end_time > Date.now();

        if (!isMoving && dist < 10) {
            if (typeof openCastlePanel === 'function') openCastlePanel(clickedCastle);
        } else {
            Modal.ask(
                '🏰', 'Выступить в поход',
                `Отправить отряд к замку ${clickedCastle.name}?`,
                'В поход!',
                () => startMovement(clickedCastle.x, clickedCastle.y, clickedCastle.id)
            );
        }
        return;
    }

    Modal.ask(
        '🗺', 'Выступить в поход',
        'Отправить отряд в эту точку?',
        'Выступить!',
        () => startMovement(worldX, worldY, null)
    );
});

// ПЕРЕМЕЩЕНИЕ — 1 запрос на старт движения
async function startMovement(targetX, targetY, targetLocationId) {
    const me = Cache.myProfile;
    if (!me) return;

    let start_x = me.target_x || 0;
    let start_y = me.target_y || 0;

    if (me.location_id) {
        const city = Cache.getCastle(me.location_id);
        if (city) { start_x = city.x; start_y = city.y; }
    } else if (me.move_end_time > Date.now()) {
        Modal.notify('⚠️', 'Отряд в пути', 'Лорд, вы уже в походе! Дождитесь привала перед новым приказом.');
        return;
    }

    const distance = Math.sqrt(Math.pow(targetX - start_x, 2) + Math.pow(targetY - start_y, 2));
    const speed = 40;
    const travelTimeMs = (distance / speed) * 1000;
    const now = Date.now();
    const endTime = now + travelTimeMs;

    // Проверяем маршрут на проходимость
    if (!walkmap.isPathLand(start_x, start_y, targetX, targetY)) {
        Modal.notify('🌊', 'Путь закрыт', 'Море преграждает дорогу. Ваш отряд не умеет ходить по воде.');
        return;
    }

    const updates = {
        location_id: null,
        start_x, start_y,
        target_x: targetX, target_y: targetY,
        move_start_time: now, move_end_time: endTime
    };

    // 1 запрос к БД
    await client.from('profiles').update(updates).eq('id', Cache.myUserId);

    // Обновляем кеш локально, не перезапрашивая
    Cache.updatePlayer(updates);
    document.getElementById('ui-location').innerText = 'В пути...';
    updateMarchHUD();
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});
