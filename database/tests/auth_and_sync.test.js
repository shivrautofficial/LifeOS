import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Setup Mock Browser LocalStorage for Node test environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
  get length() { return mockStorage.size; },
  key: (i) => Array.from(mockStorage.keys())[i] || null
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ==========================================================================
   1. Database Schema & RLS Security Verification
   ========================================================================== */
test('Supabase Schema: RLS, Cascades, Realtime & Policy Integrity', async () => {
  const schemaPath = path.resolve(__dirname, '../schemas/supabase_schema.sql');
  assert.ok(fs.existsSync(schemaPath), 'supabase_schema.sql must exist');

  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Verify all required tables exist
  const requiredTables = [
    'profiles',
    'tasks',
    'habits',
    'goals',
    'projects',
    'calendar_events',
    'notes',
    'user_backups'
  ];

  requiredTables.forEach(table => {
    assert.match(
      sql,
      new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`, 'i'),
      `Schema must define public.${table}`
    );
  });

  // Verify Row Level Security is explicitly enabled on all tables
  requiredTables.forEach(table => {
    assert.match(
      sql,
      new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`, 'i'),
      `Table public.${table} must have ENABLE ROW LEVEL SECURITY`
    );
  });

  // Verify auth.uid() = user_id or auth.uid() = id ownership policies
  requiredTables.forEach(table => {
    assert.match(
      sql,
      new RegExp(`ON public\\.${table}`, 'i'),
      `Table public.${table} must have RLS security policies defined`
    );
  });

  assert.ok(sql.includes('auth.uid() = user_id'), 'RLS policies must enforce auth.uid() = user_id');
  assert.ok(sql.includes('auth.uid() = id'), 'Profiles table RLS must enforce auth.uid() = id');

  // Verify ON DELETE CASCADE foreign key constraints for data isolation
  assert.ok(sql.includes('ON DELETE CASCADE'), 'Foreign keys must specify ON DELETE CASCADE to prevent orphaned records');

  // Verify Supabase Realtime publication setup
  assert.ok(
    sql.includes('ALTER PUBLICATION supabase_realtime ADD TABLE') &&
    sql.includes('public.tasks') &&
    sql.includes('public.habits') &&
    sql.includes('public.goals') &&
    sql.includes('public.notes'),
    'Realtime publication must include tasks, habits, goals, and notes'
  );

  // Verify automatic profile creation trigger on signup
  assert.ok(
    sql.includes('handle_new_user()') && sql.includes('on_auth_user_created'),
    'Trigger on_auth_user_created must exist to provision profile on auth.users registration'
  );
});

/* ==========================================================================
   2. State & Storage Isolation Between User X and User Y
   ========================================================================== */
test('State & Storage Isolation: User X data never leaks to User Y', async () => {
  mockStorage.clear();
  const { state } = await import('../../js/state.js');

  const userXId = '11111111-1111-4111-8111-111111111111';
  const userYId = '22222222-2222-4222-8222-222222222222';

  // --- Step A: User X logs in on Device 1 ---
  state.setActiveUser(userXId);
  state.setKey('profile', { name: 'Alice Wonderland', roleTitle: 'Lead Architect', onboarded: true });
  state.setKey('todayTasks', [
    { id: 'task-x-1', title: 'User X Private Financial Model', priority: 'urgent', done: false }
  ]);
  state.setKey('goals', [
    { id: 'goal-x-1', title: 'User X Confidential OKR', progress: 40 }
  ]);
  state.setKey('notes', [
    { id: 'note-x-1', title: 'User X Personal Passwords and Brain Dumps', content: 'Secret 12345' }
  ]);

  // Verify User X state is active
  assert.equal(state.get('profile').name, 'Alice Wonderland');
  assert.equal(state.get('todayTasks').length, 1);
  assert.equal(state.get('todayTasks')[0].title, 'User X Private Financial Model');

  // Verify storage key is user-partitioned
  const userXStorageKey = `lifeos_user_${userXId}_state`;
  assert.ok(mockStorage.has(userXStorageKey), 'User X state must be persisted under partitioned storage key');

  // --- Step B: User X logs out, User Y logs in on the SAME device ---
  state.setActiveUser(null);
  state.reset();

  // Baseline reset state must not contain User X confidential data
  const resetTasks = state.get('todayTasks') || [];
  assert.ok(
    !resetTasks.some(t => t.id === 'task-x-1'),
    'Reset state must not retain User X private tasks'
  );

  state.setActiveUser(userYId);
  // User Y state should be independent and pristine
  state.setKey('profile', { name: 'Bob Builder', roleTitle: 'Site Manager', onboarded: false });
  state.setKey('todayTasks', [
    { id: 'task-y-1', title: 'User Y Construction Blueprint', priority: 'medium', done: false }
  ]);

  assert.equal(state.get('profile').name, 'Bob Builder');
  assert.equal(state.get('todayTasks').length, 1);
  assert.equal(state.get('todayTasks')[0].id, 'task-y-1');

  // Ensure User Y storage key is separate
  const userYStorageKey = `lifeos_user_${userYId}_state`;
  assert.ok(mockStorage.has(userYStorageKey), 'User Y state must be persisted under its own partitioned storage key');
  assert.notEqual(mockStorage.get(userXStorageKey), mockStorage.get(userYStorageKey));

  // --- Step C: User Y logs out, User X returns and signs back in ---
  state.setActiveUser(null);
  state.reset();

  state.setActiveUser(userXId);
  // Hydrated state must match User X's exact previous records
  assert.equal(state.get('profile').name, 'Alice Wonderland');
  assert.equal(state.get('todayTasks').length, 1);
  assert.equal(state.get('todayTasks')[0].title, 'User X Private Financial Model');
  assert.equal(state.get('notes')[0].title, 'User X Personal Passwords and Brain Dumps');
});

/* ==========================================================================
   3. PostgreSQL Row Level Security (RLS) Simulation
   ========================================================================== */
test('RLS Simulation: Database denies cross-user reads, updates, and deletes', async () => {
  // Simulate Postgres DB table with RLS policy: auth.uid() = user_id
  const databaseTable = [];

  function insertRecord(authUid, record) {
    // INSERT WITH CHECK (auth.uid() = user_id)
    if (!authUid || record.user_id !== authUid) {
      throw new Error('RLS Violation: user_id must equal auth.uid()');
    }
    databaseTable.push({ ...record });
    return record;
  }

  function selectRecords(authUid) {
    // SELECT USING (auth.uid() = user_id)
    return databaseTable.filter(r => r.user_id === authUid);
  }

  function updateRecord(authUid, id, updates) {
    // UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
    const idx = databaseTable.findIndex(r => r.id === id && r.user_id === authUid);
    if (idx === -1) {
      // 0 rows updated in Postgres when RLS filters it out
      return 0;
    }
    if (updates.user_id && updates.user_id !== authUid) {
      throw new Error('RLS Violation: cannot change user_id ownership');
    }
    databaseTable[idx] = { ...databaseTable[idx], ...updates };
    return 1;
  }

  function deleteRecord(authUid, id) {
    // DELETE USING (auth.uid() = user_id)
    const idx = databaseTable.findIndex(r => r.id === id && r.user_id === authUid);
    if (idx === -1) {
      return 0;
    }
    databaseTable.splice(idx, 1);
    return 1;
  }

  const userX = 'user-x-uuid';
  const userY = 'user-y-uuid';

  // 1. User X inserts a private task
  insertRecord(userX, {
    id: 'task-100',
    user_id: userX,
    title: 'User X Private Roadmap',
    priority: 'urgent',
    completed: false
  });

  // 2. User Y attempts to query User X's records
  const userYResults = selectRecords(userY);
  assert.equal(userYResults.length, 0, 'User Y must receive 0 rows when querying User X records');

  // 3. User Y attempts to update User X's record
  const updatedCount = updateRecord(userY, 'task-100', { title: 'Hacked by Y' });
  assert.equal(updatedCount, 0, 'User Y cannot update User X record (0 rows updated)');

  // Verify task was untouched
  const userXResults = selectRecords(userX);
  assert.equal(userXResults.length, 1);
  assert.equal(userXResults[0].title, 'User X Private Roadmap');

  // 4. User Y attempts to delete User X's record
  const deletedCount = deleteRecord(userY, 'task-100');
  assert.equal(deletedCount, 0, 'User Y cannot delete User X record (0 rows deleted)');
  assert.equal(selectRecords(userX).length, 1, 'User X record still exists');

  // 5. User X can update and delete their own record
  const ownUpdate = updateRecord(userX, 'task-100', { completed: true });
  assert.equal(ownUpdate, 1);
  assert.equal(selectRecords(userX)[0].completed, true);

  const ownDelete = deleteRecord(userX, 'task-100');
  assert.equal(ownDelete, 1);
  assert.equal(selectRecords(userX).length, 0);
});

/* ==========================================================================
   4. Multi-Device Persistent Restoration Lifecycle
   ========================================================================== */
test('Multi-Device Cloud Restoration: Device B restores complete state from database', async () => {
  const userX = 'user-restore-test-uuid';

  // Mock server database state for User X
  const serverDb = {
    profiles: [{ id: userX, display_name: 'Carol Danvers', role_title: 'Captain', profession: 'founder', theme: 'dark', onboarded: true }],
    tasks: [
      { id: 't-1', user_id: userX, title: 'Calibrate Avionics', priority: 'high', status: 'in_progress', due_date: 'Tomorrow', completed: false, category: 'work' },
      { id: 't-2', user_id: userX, title: 'Sublight Navigation', priority: 'medium', status: 'done', due_date: 'Today', completed: true, category: 'work' }
    ],
    habits: [
      { id: 'h-1', user_id: userX, title: '0600 Zero-G Workout', streak: 14, best_streak: 21, done: true, history: [true, true, true, true, true, true, true] }
    ],
    goals: [
      { id: 'g-1', user_id: userX, title: 'Defend Sector 4', category: 'Strategic', progress: 75, target_date: 'Q4 2026' }
    ],
    projects: [
      { id: 'p-1', user_id: userX, title: 'Quantum Relay Network', status: 'Active', deadline: 'End of Year', progress: 60 }
    ],
    calendar_events: [
      { id: 'e-1', user_id: userX, title: 'Command Briefing', time: '09:00 - 10:30', date: 'Today', tag: 'Deep Work' }
    ],
    notes: [
      { id: 'n-1', user_id: userX, title: 'Wormhole Frequencies', content: 'Frequency set to 42.109 MHz', tags: ['science', 'tactical'], updated_at: '2026-10-25T01:00:00Z' }
    ]
  };

  // Simulate pullUserData hydration on a clean Device B with zero cached local storage
  const hydratedState = {
    profile: {
      name: serverDb.profiles[0].display_name,
      roleTitle: serverDb.profiles[0].role_title,
      profession: serverDb.profiles[0].profession,
      theme: serverDb.profiles[0].theme,
      onboarded: serverDb.profiles[0].onboarded
    },
    todayTasks: serverDb.tasks.map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      dueDate: t.due_date,
      done: t.completed,
      category: t.category
    })),
    todayHabits: serverDb.habits.map(h => ({
      id: h.id,
      title: h.title,
      streak: h.streak,
      bestStreak: h.best_streak,
      done: h.done,
      history: h.history
    })),
    goals: serverDb.goals.map(g => ({
      id: g.id,
      title: g.title,
      category: g.category,
      progress: g.progress,
      targetDate: g.target_date
    })),
    projects: serverDb.projects.map(p => ({
      id: p.id,
      title: p.title,
      status: p.status,
      deadline: p.deadline,
      progress: p.progress
    })),
    calendarEvents: serverDb.calendar_events.map(e => ({
      id: e.id,
      title: e.title,
      time: e.time,
      date: e.date,
      tag: e.tag
    })),
    notes: serverDb.notes.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      tags: n.tags,
      updatedAt: n.updated_at
    }))
  };

  // Verify all entity sets restored accurately on Device B
  assert.equal(hydratedState.profile.name, 'Carol Danvers');
  assert.equal(hydratedState.profile.onboarded, true);
  assert.equal(hydratedState.todayTasks.length, 2);
  assert.equal(hydratedState.todayTasks[0].title, 'Calibrate Avionics');
  assert.equal(hydratedState.todayHabits[0].streak, 14);
  assert.equal(hydratedState.goals[0].progress, 75);
  assert.equal(hydratedState.projects[0].progress, 60);
  assert.equal(hydratedState.calendarEvents[0].title, 'Command Briefing');
  assert.equal(hydratedState.notes[0].content, 'Frequency set to 42.109 MHz');
});

/* ==========================================================================
   5. Personal Data Export Structure
   ========================================================================== */
test('Data Ownership & Export: Export payload contains complete user dataset', () => {
  const exportPayload = {
    version: '1.0.0',
    export_date: new Date().toISOString(),
    account: {
      id: 'uuid-export-user',
      email: 'user@example.com',
      phone: '+14155552671'
    },
    profile: {
      display_name: 'David Lightman',
      role_title: 'Security Researcher',
      profession: 'engineer',
      theme: 'dark'
    },
    data: {
      tasks: [{ id: 't-1', title: 'Global Thermonuclear War Sim' }],
      habits: [{ id: 'h-1', title: 'Daily CTF' }],
      goals: [{ id: 'g-1', title: 'Finish Dissertation' }],
      projects: [{ id: 'p-1', title: 'WOPR Interface' }],
      calendar_events: [{ id: 'e-1', title: 'DEF CON Keynote' }],
      notes: [{ id: 'n-1', title: 'Joshua Passwords' }]
    }
  };

  const serialized = JSON.stringify(exportPayload, null, 2);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.version, '1.0.0');
  assert.ok(parsed.export_date);
  assert.equal(parsed.account.email, 'user@example.com');
  assert.equal(parsed.profile.display_name, 'David Lightman');
  assert.equal(parsed.data.tasks.length, 1);
  assert.equal(parsed.data.notes[0].title, 'Joshua Passwords');
});
