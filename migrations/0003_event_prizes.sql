-- 賞品・賞金の記載を保存する。CTFTime は prizes を返していたが、
-- これまでは AI 利用方針の判定材料に通すだけで捨てていた。
--
-- 中身は完全な自由記述で、「Total Prize Pool: 2 BTC」もあれば「TBD」も
-- 「Trophies are given to the top 3 teams (if US-based)」もある。金額として
-- 構造化はできないし、条件が本文にしか書かれていないことも多いので、
-- 要約せず原文のまま持つ。AI 利用方針と同じ扱い。
--
-- 既存行は空文字のまま残り、次の同期で埋まる。

ALTER TABLE events ADD COLUMN prizes TEXT NOT NULL DEFAULT '';
