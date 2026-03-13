// map.js - Массивная карта галактики (с поддержкой свайпов/перетаскивания)

let currentPlanets = [];
let offsetX = 0; // Смещение камеры по горизонтали
let offsetY = 0; // Смещение камеры по вертикали

// Переменные для свайпов
let isDraggingMap = false;
let mapDragged = false; // Проверка: был ли это свайп или просто клик?
let startX = 0;
let startY = 0;

async function loadMap() {
    const canvas = document.getElementById('galaxy-map');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 1. Качаем все 28 планет
    const { data: planets } = await client.from('planets').select('*');
    if (!planets) return;
    currentPlanets = planets;

    // 2. Узнаем, где сейчас находится игрок, чтобы навести туда камеру
    const { data: { session } } = await client.auth.getSession();
    if (session) {
        const { data: profile } = await client.from('profiles').select('location_id').eq('id', session.user.id).single();
        if (profile && profile.location_id) {
            let myPlanet = planets.find(p => p.id === profile.location_id);
            if (myPlanet) {
                // Центрируем камеру ровно на планете игрока
                offsetX = (canvas.width / 2) - myPlanet.x;
                offsetY = (canvas.height / 2) - myPlanet.y;
            }
        }
    }

    drawMap(); // Отрисовываем
}

// Функция непосредственного рисования (вызывается каждый кадр при свайпе)
function drawMap() {
    const canvas = document.getElementById('galaxy-map');
    const ctx = canvas.getContext('2d');
    
    // Очищаем экран
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentPlanets.forEach(planet => {
        // Применяем смещение камеры к координатам планеты
        planet.drawX = planet.x + offsetX;
        planet.drawY = planet.y + offsetY;

        // Выбираем цвет
        if (planet.faction === 'rep') ctx.fillStyle = '#00d4ff';
        else if (planet.faction === 'cis') ctx.fillStyle = '#ffcc00';
        else if (planet.faction === 'syn') ctx.fillStyle = '#14FF00';
        else ctx.fillStyle = '#aaaaaa'; // Серый для нейтралов

        // Рисуем кружок
        ctx.beginPath();
        ctx.arc(planet.drawX, planet.drawY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();

        // Пишем название
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(planet.name, planet.drawX, planet.drawY + 28);
    });
}

// --- УПРАВЛЕНИЕ КАРТОЙ (СВАЙПЫ И КЛИКИ) ---
const canvas = document.getElementById('galaxy-map');

// Касание экрана
canvas.addEventListener('touchstart', (e) => {
    isDraggingMap = true;
    mapDragged = false;
    startX = e.touches[0].clientX - offsetX;
    startY = e.touches[0].clientY - offsetY;
});

// Движение пальца (перетаскивание)
canvas.addEventListener('touchmove', (e) => {
    if (!isDraggingMap) return;
    mapDragged = true; // Отмечаем, что игрок тянет карту, а не кликает
    offsetX = e.touches[0].clientX - startX;
    offsetY = e.touches[0].clientY - startY;
    drawMap(); // Моментально перерисовываем
});

// Палец убран
canvas.addEventListener('touchend', () => {
    isDraggingMap = false;
});

// Клик по планете
canvas.addEventListener('click', function(event) {
    // Если игрок только что перетаскивал карту, не считаем это кликом!
    if (mapDragged) return; 

    const rect = this.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Ищем, по какой планете попали
    for (let p of currentPlanets) {
        // Вычисляем расстояние от клика до центра планеты
        const dist = Math.sqrt(Math.pow(clickX - p.drawX, 2) + Math.pow(clickY - p.drawY, 2));
        
        if (dist <= 25) { // 25 - радиус удобного попадания пальцем
            if (typeof openPlanetPanel === 'function') openPlanetPanel(p);
            break;
        }
    }
});

// Адаптация при повороте телефона
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawMap();
});
