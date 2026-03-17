// cache.js - Глобальный кеш данных игры
// Позиции игроков обновляются через Supabase Realtime — 0 поллинга

const Cache = {
    castles: [],
    players: [],
    myProfile: null,
    myUserId: null,

    _realtimeChannel: null,

    // Одноразовая загрузка при старте игры
    async init() {
        const { data: { session } } = await client.auth.getSession();
        if (!session) return false;
        this.myUserId = session.user.id;

        const [castlesRes, playersRes] = await Promise.all([
            client.from('castles').select('*'),
            client.from('profiles').select('*')
        ]);

        if (castlesRes.data) this.castles = castlesRes.data;
        if (playersRes.data) this.players = playersRes.data;
        this.myProfile = this.players.find(p => p.id === this.myUserId) || null;

        this._subscribeRealtime();
        return true;
    },

    // Подписка на изменения таблицы profiles
    async _subscribeRealtime() {
        if (this._realtimeChannel) {
            client.removeChannel(this._realtimeChannel);
        }

        // Получаем токен авторизации
        const { data: { session } } = await client.auth.getSession();
        const token = session?.access_token;

        this._realtimeChannel = client
            .channel('profiles-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles'
                },
                (payload) => this._handleRealtimeUpdate(payload)
            )
            .subscribe(async (status, err) => {
                console.log('Realtime статус:', status, err || '');
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Realtime подключён');
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.log('⚠️ Realtime недоступен, включаем поллинг...');
                    this._startPollingFallback();
                }
            });

        // Устанавливаем токен для realtime соединения
        if (token) {
            await client.realtime.setAuth(token);
            console.log('🔑 Realtime токен установлен');
        }
    },

    // Запасной поллинг если Realtime не работает
    _startPollingFallback() {
        if (this._pollInterval) return;
        this._pollInterval = setInterval(async () => {
            const now = Date.now();
            const anyoneMoving = this.players.some(p =>
                p.move_end_time && p.move_end_time > now && !p.location_id
            );
            if (!anyoneMoving) return;
            const { data } = await client
                .from('profiles')
                .select('id,location_id,move_start_time,move_end_time,start_x,start_y,target_x,target_y,credits,role');
            if (!data) return;
            data.forEach(fresh => {
                const idx = this.players.findIndex(p => p.id === fresh.id);
                if (idx !== -1) {
                    this.players[idx] = { ...this.players[idx], ...fresh };
                    if (fresh.id === this.myUserId) this.myProfile = this.players[idx];
                }
            });
        }, 15000);
    },

    // Обработка входящего обновления от Supabase
    _handleRealtimeUpdate(payload) {
        console.log('🔔 Realtime событие:', payload.eventType, payload.new?.id);
        const fresh = payload.new;
        if (!fresh || !fresh.id) return;

        const idx = this.players.findIndex(p => p.id === fresh.id);

        if (payload.eventType === 'DELETE') {
            if (idx !== -1) this.players.splice(idx, 1);
            return;
        }

        if (idx !== -1) {
            // Обновляем существующего игрока
            this.players[idx] = { ...this.players[idx], ...fresh };
            if (fresh.id === this.myUserId) {
                this.myProfile = this.players[idx];
            }
        } else {
            // Новый игрок появился — добавляем
            this.players.push(fresh);
        }
    },

    // Отписка при выходе из игры
    stopSync() {
        if (this._realtimeChannel) {
            client.removeChannel(this._realtimeChannel);
            this._realtimeChannel = null;
        }
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }
    },

    // Обновить своего игрока локально после действия
    updatePlayer(updatedFields) {
        const idx = this.players.findIndex(p => p.id === this.myUserId);
        if (idx !== -1) {
            this.players[idx] = { ...this.players[idx], ...updatedFields };
            this.myProfile = this.players[idx];
        }
    },

    getCastle(id)            { return this.castles.find(p => p.id == id) || null; },
    getPlayer(id)            { return this.players.find(p => p.id === id) || null; },
    getPlayersInCastle(cid)  { return this.players.filter(p => p.location_id == cid); },

    getFactionName(code) {
        if (code === 'lion')   return 'Королевство Льва';
        if (code === 'empire') return 'Северная Империя';
        if (code === 'horde')  return 'Степной Каганат';
        return 'Ничейные земли';
    }
};
