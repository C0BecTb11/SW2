// army.js - ВРЕМЕННАЯ ЗАГЛУШКА (Ждет кардинальных изменений)

function openArmyPanel() {
    document.getElementById('army-panel').classList.remove('hidden');
    
    // Пока просто рисуем пустые слоты, чтобы ничего не ломалось
    let slotsHtml = '';
    for (let i = 1; i <= 8; i++) {
        slotsHtml += `<div class="building-slot">Полк ${i}<br>Пусто</div>`;
    }
    document.getElementById('army-slots').innerHTML = slotsHtml;
}

function closeArmyPanel() {
    document.getElementById('army-panel').classList.add('hidden');
}
