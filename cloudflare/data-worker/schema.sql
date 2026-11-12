-- mabi-data D1 (비공개, Worker 바인딩으로만 접근). GitHub(mabi-life/mabi-data)가 원본, cron이 여기로 복사.
CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, sha TEXT NOT NULL, bytes INTEGER NOT NULL, parts INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS parts (path TEXT NOT NULL, i INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY (path, i));
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
