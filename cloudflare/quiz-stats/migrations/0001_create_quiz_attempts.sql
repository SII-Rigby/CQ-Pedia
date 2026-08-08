CREATE TABLE IF NOT EXISTS quiz_attempts (
  attempt_id TEXT PRIMARY KEY NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  rating TEXT NOT NULL CHECK (rating IN ('黄棒', '半罐水', '摸得到门', '耍得转', '行市', '老江湖', '老板凳')),
  quiz_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_rating ON quiz_attempts (rating);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created_at ON quiz_attempts (created_at);
