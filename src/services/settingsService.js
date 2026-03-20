const { query } = require('../db');

async function getSettings() {
  const result = await query('SELECT key, value FROM app_settings ORDER BY key');
  const data = {};
  for (const row of result.rows) data[row.key] = row.value;
  return data;
}

async function setSetting(key, value) {
  await query(
    `INSERT INTO app_settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
}

module.exports = {
  getSettings,
  setSetting,
};
