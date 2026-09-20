-- 参加表明した人を Web UI で名前とアイコンつきで出せるようにする。
-- Discord のユーザ ID だけでは <@id> のメンション記法でしか表示できず、
-- Discord の外（Web）では誰なのか分からないため。
--
-- 既存行は空文字のまま残る。空のときは呼び出し側がユーザ ID で代替表示し、
-- 次にその人がボタンを押した時点で埋まる。

ALTER TABLE participants ADD COLUMN display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE participants ADD COLUMN avatar_hash TEXT NOT NULL DEFAULT '';
