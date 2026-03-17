-- ================================================
-- Миграция БД: Star Wars -> Эпоха Лордов
-- Выполнить в Supabase: SQL Editor
-- ================================================

-- 1. Переименовываем таблицу planets -> castles
ALTER TABLE planets RENAME TO castles;

-- 2. Обновляем faction коды
UPDATE castles SET faction = 'lion'   WHERE faction = 'rep';
UPDATE castles SET faction = 'empire' WHERE faction = 'cis';
UPDATE castles SET faction = 'horde'  WHERE faction = 'syn';

-- 3. Обновляем faction в profiles
UPDATE profiles SET faction = 'lion'   WHERE faction = 'rep';
UPDATE profiles SET faction = 'empire' WHERE faction = 'cis';
UPDATE profiles SET faction = 'horde'  WHERE faction = 'syn';

-- 4. Переименовываем planet_id -> castle_id в таблице buildings (если есть)
ALTER TABLE buildings RENAME COLUMN planet_id TO castle_id;

-- ================================================
-- Проверка после миграции:
-- SELECT * FROM castles;
-- SELECT id, username, faction FROM profiles;
-- ================================================
