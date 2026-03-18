// cache.js - Глобальный кеш данных игры

const Cache = {
    castles: [],
    players: [],
    myProfile: null,
    myUserId: null,
    _realtimeChannel: null,
    _pollInterval: null,

    // Нормализуем числовые поля — Supabase int8 приходит как строка
    _normalize(p) {
        return {
            ...p,
            move_start_time: Number(p.move_start_time) || 0,
            move_end_time:   Number(p.move_end_time)   || 0,
            start_x:  Number(p.start_x)  || 0,
            start_y:  Number(p.start_y)  || 0,
            target_x: Number(p.target_x) || 0,
            target_y: Number(p.target_y) || 0,
            credits:  Number(p.credits)  || 0,
        };
    },

    async init() {
        const { data: { session } } = await client.auth.getSession();
        if (!session) return false;
        this.myUserId = session.user.id;

        const [castlesRes, playersRes] = await Promise.all([
            client.from('castles').select('*'),
            client.from('profiles').select('*')
        ]);

        if (castlesRes.data) this.castles = castlesRes.data;
        if (playersRes.data) this.players = playersRes.data.map(p => this._normalize(p));
        this.myProfile = this.players.find(p => p.id === this.myUserId) || null;

        this._subscribeRealtime();
        return true;
    },

    async _subscribeRealtime() {
        if (this._realtimeChannel) client.removeChannel(this._realtimeChannel);

        const { data: { session } } = await client.auth.getSession();
        const token = session?.access_token;

        this._realtimeChannel = client
            .channel('profiles-changes')
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles' },
                (payload) => this._handleRealtimeUpdate(payload)
            )
            .subscribe(async (status, err) => {
                console.log('Realtime:', status);
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    this._startPollingFallback();
                }
            });

        if (token) await client.realtime.setAuth(token);
    },

    _handleRealtimeUpdate(payload) {
        if (!payload.new?.id) return;

        const fresh = this._normalize(payload.new);

        if (payload.eventType === 'DELETE') {
            const idx = this.players.findIndex(p => p.id === fresh.id);
            if (idx !== -1) this.players.splice(idx, 1);
            return;
        }

        const idx = this.players.findIndex(p => p.id === fresh.id);
        if (idx !== -1) {
            // Сохраняем поля которые Realtime не присылает (first_name, last_name и т.д.)
            this.players[idx] = { ...this.players[idx], ...fresh };
            if (fresh.id === this.myUserId) this.myProfile = this.players[idx];
        } else {
            this.players.push(fresh);
        }
    },

    // Поллинг как запасной вариант
    _startPollingFallback() {
        if (this._pollInterval) return;
        console.log('⚠️ Запускаем поллинг каждые 10 сек');
        this._pollInterval = setInterval(async () => {
            const { data } = await client
                .from('profiles')
                .select('id,location_id,move_start_time,move_end_time,start_x,start_y,target_x,target_y,credits,role,first_name,last_name,faction');
            if (!data) return;
            data.forEach(raw => {
                const fresh = this._normalize(raw);
                const idx = this.players.findIndex(p => p.id === fresh.id);
                if (idx !== -1) {
                    this.players[idx] = { ...this.players[idx], ...fresh };
                    if (fresh.id === this.myUserId) this.myProfile = this.players[idx];
                }
            });
        }, 10000);
    },

    stopSync() {
        if (this._realtimeChannel) { client.removeChannel(this._realtimeChannel); this._realtimeChannel = null; }
        if (this._pollInterval) { clearInterval(this._pollInterval); this._pollInterval = null; }
    },

    updatePlayer(updatedFields) {
        const idx = this.players.findIndex(p => p.id === this.myUserId);
        if (idx !== -1) {
            this.players[idx] = this._normalize({ ...this.players[idx], ...updatedFields });
            this.myProfile = this.players[idx];
        }
    },

    getCastle(id)           { return this.castles.find(p => p.id == id) || null; },
    getPlayer(id)           { return this.players.find(p => p.id === id) || null; },
    getPlayersInCastle(cid) { return this.players.filter(p => p.location_id == cid); },

    getFactionName(code) {
        if (code === 'lion')   return 'Королевство Льва';
        if (code === 'empire') return 'Северная Империя';
        if (code === 'horde')  return 'Степной Каганат';
        return 'Ничейные земли';
    }
};
