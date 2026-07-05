import { getDb } from '../db/client';

export interface DailyNote {
  log_date: string;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  note: string | null;
}

export const dailyNotesRepo = {
  async getDailyNote(date: string): Promise<DailyNote | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<DailyNote>(
      'SELECT * FROM daily_notes WHERE log_date = ?',
      date
    );
    return row || null;
  },

  async saveDailyNote(date: string, mood: DailyNote['mood'], note: string | null = null): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO daily_notes (log_date, mood, note, created_at) 
       VALUES (?, ?, ?, datetime('now'))`,
      date,
      mood,
      note
    );
  }
};
