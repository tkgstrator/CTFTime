-- CTFTime から取得したイベントのキャッシュ。
-- id は CTFTime の event id（ctftime.org/event/<id>/ と一致）。
CREATE TABLE IF NOT EXISTS events (
  id                 INTEGER PRIMARY KEY,
  ctf_id             INTEGER NOT NULL,
  title              TEXT    NOT NULL,
  url                TEXT    NOT NULL,
  ctftime_url        TEXT    NOT NULL,
  logo               TEXT    NOT NULL,
  format             TEXT    NOT NULL,
  restrictions       TEXT    NOT NULL,
  onsite             INTEGER NOT NULL,
  location           TEXT    NOT NULL,
  weight             REAL    NOT NULL,
  participants       INTEGER NOT NULL,
  start_at           TEXT    NOT NULL,
  finish_at          TEXT    NOT NULL,
  duration_days      INTEGER NOT NULL,
  duration_hours     INTEGER NOT NULL,
  description        TEXT    NOT NULL,
  organizers         TEXT    NOT NULL,
  ai_policy          TEXT    NOT NULL,
  ai_snippets        TEXT    NOT NULL,
  announce_message_id TEXT,
  created_at         TEXT    NOT NULL,
  updated_at         TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_start_at ON events (start_at);
CREATE INDEX IF NOT EXISTS idx_events_finish_at ON events (finish_at);

-- どのイベントにどの通知を送り終えたか。二重通知の抑止に使う。
-- kind: 'new' | 'reminder_24h' | 'reminder_1h' | 'start' | 'end'
CREATE TABLE IF NOT EXISTS notifications (
  event_id INTEGER NOT NULL,
  kind     TEXT    NOT NULL,
  sent_at  TEXT    NOT NULL,
  PRIMARY KEY (event_id, kind),
  FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
);

-- 「参加する」を押したユーザ。リマインダはこのテーブルに行があるイベントにだけ飛ぶ。
CREATE TABLE IF NOT EXISTS participants (
  event_id  INTEGER NOT NULL,
  user_id   TEXT    NOT NULL,
  joined_at TEXT    NOT NULL,
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_participants_user ON participants (user_id);
