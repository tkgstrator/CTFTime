-- 0004 で入れた sync_state を落とす。
--
-- 過去の一括取り込みを Worker の cron でやるために置いたテーブルだが、
-- その取り込みは事実上 1 回きりの作業で、終わったあとも「もう終わったか」を
-- 15 分ごとに確認し続けるだけの存在になっていた。
-- 初回のデータ投入は wrangler d1 export / execute で一度やれば済むので、
-- 取り込み機構ごと Worker から外し、このテーブルも不要になった。

DROP TABLE IF EXISTS sync_state;
