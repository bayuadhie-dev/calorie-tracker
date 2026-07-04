import { getDb } from '../db/client';

export interface DailyChecklistItem {
  id: number;
  template_id: number;
  label: string; // Joined from template
  log_date: string;
  is_done: number;
  done_at: string | null;
}

export interface ChecklistSummary {
  completed: number;
  total: number;
}

export const activityRepo = {
  async getDailyChecklist(date: string): Promise<DailyChecklistItem[]> {
    const db = await getDb();
    
    // 1. Check if daily checklist items already exist for this date
    let items = await db.getAllAsync<DailyChecklistItem>(
      `SELECT acd.*, act.label
       FROM activity_checklist_daily acd
       JOIN activity_checklist_templates act ON acd.template_id = act.id
       WHERE acd.log_date = ?`,
      date
    );

    if (items.length > 0) {
      return items;
    }

    // 2. If no items exist, retrieve user goal to filter templates
    const profile = await db.getFirstAsync<{ goal: string }>('SELECT goal FROM user_profile WHERE id = 1');
    const userGoal = profile?.goal || 'maintenance';

    // 3. Get matching templates
    const templates = await db.getAllAsync<{ id: number; label: string; applicable_goal: string | null }>(
      `SELECT * FROM activity_checklist_templates
       WHERE applicable_goal IS NULL OR applicable_goal = ?`,
      userGoal
    );

    // 4. Generate daily checklist items in a transaction
    if (templates.length > 0) {
      await db.withTransactionAsync(async () => {
        for (const temp of templates) {
          await db.runAsync(
            'INSERT INTO activity_checklist_daily (template_id, log_date, is_done) VALUES (?, ?, 0)',
            temp.id,
            date
          );
        }
      });
      
      // 5. Query the newly created items
      items = await db.getAllAsync<DailyChecklistItem>(
        `SELECT acd.*, act.label
         FROM activity_checklist_daily acd
         JOIN activity_checklist_templates act ON acd.template_id = act.id
         WHERE acd.log_date = ?`,
        date
      );
    }

    return items;
  },

  async toggleChecklist(id: number, isDone: boolean): Promise<void> {
    const db = await getDb();
    const doneVal = isDone ? 1 : 0;
    const doneAt = isDone ? "datetime('now')" : "NULL";

    await db.runAsync(
      `UPDATE activity_checklist_daily 
       SET is_done = ?, done_at = ${isDone ? "datetime('now')" : "NULL"} 
       WHERE id = ?`,
      doneVal,
      id
    );
  },

  async getChecklistSummary(date: string): Promise<ChecklistSummary> {
    const db = await getDb();
    const result = await db.getFirstAsync<{ completed: number; total: number }>(
      `SELECT 
        SUM(CASE WHEN is_done = 1 THEN 1 ELSE 0 END) as completed,
        COUNT(*) as total
       FROM activity_checklist_daily
       WHERE log_date = ?`,
      date
    );
    return {
      completed: result?.completed || 0,
      total: result?.total || 0
    };
  }
};
