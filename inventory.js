// inventory.js - Управление обозом, весом и скоростью

const BASE_CAPACITY = 50.0;    // Сколько кг лорд унесет без лошадей
const HORSE_CAPACITY = 100.0;  // Сколько кг везет одна вьючная лошадь

async function openInventoryPanel() {
    document.getElementById('inventory-panel').classList.remove('hidden');
    document.getElementById('inventory-list').innerHTML = '<p style="color: #aaa; text-align: center;">Осмотр поклажи...</p>';
    
    const { data: { session } } = await client.auth.getSession();
    const userId = session.user.id;

    // Скачиваем инвентарь игрока, сразу присоединяя данные из справочника предметов
    const { data: myItems } = await client
        .from('inventory')
        .select(`
            quantity,
            items_dict ( id, name, weight, category )
        `)
        .eq('owner_id', userId)
        .gt('quantity', 0); // Показываем только то, что есть в наличии (больше нуля)

    let totalWeight = 0;
    let horseCount = 0;
    let html = '';

    if (!myItems || myItems.length === 0) {
        html = '<p style="color: #aaa; text-align: center;">Ваш обоз пуст.</p>';
    } else {
        myItems.forEach(row => {
            const item = row.items_dict;
            const qty = row.quantity;
            
            if (item.id === 'packhorse') {
                horseCount = qty; // Считаем лошадей отдельно
            } else {
                // Считаем вес всего остального
                const rowWeight = item.weight * qty;
                totalWeight += rowWeight;
                
                html += `
                <div style="display: flex; justify-content: space-between; background: rgba(40, 35, 25, 0.8); padding: 10px; border: 1px solid #554422; border-radius: 4px;">
                    <div>
                        <span style="color: #ffd700; font-weight: bold;">${item.name}</span>
                        <br>
                        <span style="font-size: 0.8rem; color: #aaa;">${item.weight} кг / шт.</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="color: #fff; font-weight: bold;">x${qty}</span>
                        <br>
                        <span style="font-size: 0.8rem; color: #ccc;">${rowWeight.toFixed(1)} кг</span>
                    </div>
                </div>`;
            }
        });
    }

    // --- МАТЕМАТИКА ГРУЗОПОДЪЕМНОСТИ И СКОРОСТИ ---
    const maxCapacity = BASE_CAPACITY + (horseCount * HORSE_CAPACITY);
    
    // Рассчитываем процент скорости (от 100% до минимума в 20%)
    let currentSpeed = 100;
    let speedColor = '#22aa44'; // Зеленый
    
    if (totalWeight > maxCapacity) {
        // За каждый 1% перевеса отнимаем 1% скорости
        const overweightRatio = totalWeight / maxCapacity; 
        currentSpeed = Math.round(100 / overweightRatio);
        
        // Ограничиваем падение скорости (чтобы не уйти в минус или 0)
        if (currentSpeed < 20) currentSpeed = 20; 
        
        speedColor = '#8a1c1c'; // Красный (Штраф)
    } else if (totalWeight > maxCapacity * 0.8) {
        // Если заполнено более 80% - желтеем
        speedColor = '#ffd700'; 
    }

    // Обновляем интерфейс
    document.getElementById('inventory-list').innerHTML = html;
    document.getElementById('inv-weight').innerText = `${totalWeight.toFixed(1)} / ${maxCapacity} кг`;
    document.getElementById('inv-horses').innerText = `${horseCount} шт.`;
    
    const speedEl = document.getElementById('inv-speed');
    speedEl.innerText = `${currentSpeed}%`;
    speedEl.style.color = speedColor;
}

function closeInventoryPanel() {
    document.getElementById('inventory-panel').classList.add('hidden');
}
