import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, '..', 'database', 'lifeos_db.json');

const INITIAL_DATA = {
  profile: {
    name: 'User',
    roleTitle: 'Software Engineer',
    profession: 'engineer',
    theme: 'dark',
    onboarded: true
  },
  metrics: {
    activeTasksCount: 8,
    habitConsistencyRate: '94%',
    goalsProgress: '4 / 6',
    focusTimeToday: '2.5h'
  },
  timer: {
    mode: 'focus',
    timeLeft: 25 * 60,
    isRunning: false,
    sessionsCompleted: 4
  },
  todayTasks: [
    { id: 't-1', title: 'Complete LifeOS foundation and file architecture', priority: 'high', done: true, status: 'done', category: 'work', dueDate: 'Today' },
    { id: 't-2', title: 'Establish shared design system tokens and variables', priority: 'high', done: true, status: 'done', category: 'work', dueDate: 'Today' },
    { id: 't-3', title: 'Verify client-side routing across all 9 pages', priority: 'medium', done: false, status: 'in_progress', category: 'work', dueDate: 'Today' },
    { id: 't-4', title: 'Refine multi-profession telemetry widgets', priority: 'medium', done: false, status: 'todo', category: 'tech', dueDate: 'Tomorrow' },
    { id: 't-5', title: 'Test local JSON data export and restore', priority: 'urgent', done: false, status: 'todo', category: 'security', dueDate: 'Today' }
  ],
  todayHabits: [
    { id: 'h-1', title: 'Deep Work Session (2h)', streak: 14, bestStreak: 28, done: true, history: [true, true, true, true, true, true, true] },
    { id: 'h-2', title: 'Technical Reading / Architecture Papers', streak: 9, bestStreak: 16, done: true, history: [true, true, false, true, true, true, true] },
    { id: 'h-3', title: 'Physical Movement & Mobility', streak: 6, bestStreak: 12, done: false, history: [true, false, true, true, true, true, false] },
    { id: 'h-4', title: 'Daily Problem Solving / LeetCode', streak: 21, bestStreak: 30, done: true, history: [true, true, true, true, true, true, true] }
  ],
  goals: [
    { id: 'g-1', title: 'Ship LifeOS Hackathon MVP', category: 'Career', progress: 90, targetDate: 'Oct 2026' },
    { id: 'g-2', title: 'Read 24 Technical & Mindset Books', category: 'Learning', progress: 75, targetDate: 'Dec 2026' },
    { id: 'g-3', title: 'Achieve 100 Consecutive Days of Exercise', category: 'Health', progress: 60, targetDate: 'Nov 2026' },
    { id: 'g-4', title: 'Build 6 Months Emergency Runway', category: 'Finance', progress: 85, targetDate: 'Q4 2026' }
  ],
  projects: [
    { id: 'p-1', title: 'LifeOS Unified Dashboard', status: 'Active', progress: 85, deadline: 'Tomorrow' },
    { id: 'p-2', title: 'Distributed Systems Microservices Study', status: 'In Review', progress: 65, deadline: 'Nov 12' },
    { id: 'p-3', title: 'Personal Brand & Tech Writing', status: 'Ongoing', progress: 40, deadline: 'Dec 31' }
  ],
  notes: [
    { id: 'n-1', title: 'LifeOS Architectural Philosophy', content: 'One Life. One Dashboard. Completely privacy-first with local-first persistence, zero telemetry, and instantaneous client-side navigation.', tags: ['architecture', 'privacy'], pinned: true, updatedAt: 'Just now' },
    { id: 'n-2', title: 'Design System Identity', content: 'Midnight Navy (#111827) + Electric Indigo (#6366F1) + Soft Lavender (#EEF2FF). Minimal, fast, and accessible.', tags: ['design', 'tokens'], pinned: true, updatedAt: 'Yesterday' }
  ],
  calendarEvents: [
    { id: 'e-1', title: 'Focus Sprint: LifeOS Integration', time: '09:00 AM - 11:30 AM', date: 'Today', tag: 'Deep Work' },
    { id: 'e-2', title: 'System Architecture Review', time: '02:00 PM - 03:00 PM', date: 'Today', tag: 'Review' },
    { id: 'e-3', title: 'Hackathon Submission Deadline', time: '06:00 PM', date: 'Tomorrow', tag: 'Milestone' }
  ],
  healthProfile: {
    heightCm: 175,
    weightKg: 70,
    age: 26,
    unitHeight: 'metric',
    unitWeight: 'metric',
    stepGoal: 8000,
    waterGoal: 2000,
    lastUpdated: new Date().toISOString()
  },
  healthDailyLogs: {},
  updatedAt: new Date().toISOString()
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      writeDb(INITIAL_DATA);
      return INITIAL_DATA;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[LifeOS Database] Error reading database file:', err);
    return INITIAL_DATA;
  }
}

function writeDb(data) {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[LifeOS Database] Error writing database file:', err);
    return false;
  }
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

async function handleApiRequest(req, res, pathname) {
  const method = req.method;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // 1. Full Database Snapshot Endpoint: GET/POST /api/db
  if (pathname === '/api/db') {
    if (method === 'GET') {
      const db = readDb();
      res.writeHead(200);
      res.end(JSON.stringify(db));
      return true;
    }
    if (method === 'POST') {
      const payload = await parseJsonBody(req);
      const current = readDb();
      const updated = { ...current, ...payload };
      writeDb(updated);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: 'Database state updated', updatedAt: updated.updatedAt }));
      return true;
    }
  }

  // 2. Database Reset: POST /api/db/reset
  if (pathname === '/api/db/reset' && method === 'POST') {
    writeDb(INITIAL_DATA);
    res.writeHead(200);
    res.end(JSON.stringify({ success: true, message: 'Database reset to initial schema', data: INITIAL_DATA }));
    return true;
  }

  // 3. Tasks: /api/tasks
  if (pathname === '/api/tasks') {
    const db = readDb();
    if (method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(db.todayTasks || []));
      return true;
    }
    if (method === 'POST') {
      const task = await parseJsonBody(req);
      if (!task.id) task.id = 't-' + Date.now();
      db.todayTasks = [task, ...(db.todayTasks || []).filter(t => t.id !== task.id)];
      writeDb(db);
      res.writeHead(201);
      res.end(JSON.stringify({ success: true, task }));
      return true;
    }
  }

  if (pathname.startsWith('/api/tasks/')) {
    const taskId = pathname.replace('/api/tasks/', '');
    const db = readDb();
    if (method === 'PUT') {
      const updates = await parseJsonBody(req);
      db.todayTasks = (db.todayTasks || []).map(t => t.id === taskId ? { ...t, ...updates } : t);
      writeDb(db);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, taskId }));
      return true;
    }
    if (method === 'DELETE') {
      db.todayTasks = (db.todayTasks || []).filter(t => t.id !== taskId);
      writeDb(db);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, deleted: taskId }));
      return true;
    }
  }

  // 4. Habits: /api/habits
  if (pathname === '/api/habits') {
    const db = readDb();
    if (method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(db.todayHabits || []));
      return true;
    }
    if (method === 'POST') {
      const habit = await parseJsonBody(req);
      if (!habit.id) habit.id = 'h-' + Date.now();
      db.todayHabits = [...(db.todayHabits || []).filter(h => h.id !== habit.id), habit];
      writeDb(db);
      res.writeHead(201);
      res.end(JSON.stringify({ success: true, habit }));
      return true;
    }
  }

  if (pathname.startsWith('/api/habits/')) {
    const habitId = pathname.replace('/api/habits/', '');
    const db = readDb();
    if (method === 'PUT') {
      const updates = await parseJsonBody(req);
      db.todayHabits = (db.todayHabits || []).map(h => h.id === habitId ? { ...h, ...updates } : h);
      writeDb(db);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, habitId }));
      return true;
    }
    if (method === 'DELETE') {
      db.todayHabits = (db.todayHabits || []).filter(h => h.id !== habitId);
      writeDb(db);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, deleted: habitId }));
      return true;
    }
  }

  // 5. Goals: /api/goals
  if (pathname === '/api/goals') {
    const db = readDb();
    if (method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(db.goals || []));
      return true;
    }
    if (method === 'POST') {
      const goal = await parseJsonBody(req);
      if (!goal.id) goal.id = 'g-' + Date.now();
      db.goals = [...(db.goals || []).filter(g => g.id !== goal.id), goal];
      writeDb(db);
      res.writeHead(201);
      res.end(JSON.stringify({ success: true, goal }));
      return true;
    }
  }

  if (pathname.startsWith('/api/goals/')) {
    const goalId = pathname.replace('/api/goals/', '');
    const db = readDb();
    if (method === 'PUT') {
      const updates = await parseJsonBody(req);
      db.goals = (db.goals || []).map(g => g.id === goalId ? { ...g, ...updates } : g);
      writeDb(db);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, goalId }));
      return true;
    }
    if (method === 'DELETE') {
      db.goals = (db.goals || []).filter(g => g.id !== goalId);
      writeDb(db);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, deleted: goalId }));
      return true;
    }
  }

  // 6. Projects: /api/projects
  if (pathname === '/api/projects') {
    const db = readDb();
    if (method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(db.projects || []));
      return true;
    }
    if (method === 'POST') {
      const proj = await parseJsonBody(req);
      if (!proj.id) proj.id = 'p-' + Date.now();
      db.projects = [...(db.projects || []).filter(p => p.id !== proj.id), proj];
      writeDb(db);
      res.writeHead(201);
      res.end(JSON.stringify({ success: true, project: proj }));
      return true;
    }
  }

  if (pathname.startsWith('/api/projects/')) {
    const projId = pathname.replace('/api/projects/', '');
    const db = readDb();
    if (method === 'DELETE') {
      db.projects = (db.projects || []).filter(p => p.id !== projId);
      writeDb(db);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, deleted: projId }));
      return true;
    }
  }

  // 7. Notes: /api/notes
  if (pathname === '/api/notes') {
    const db = readDb();
    if (method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(db.notes || []));
      return true;
    }
    if (method === 'POST') {
      const note = await parseJsonBody(req);
      if (!note.id) note.id = 'n-' + Date.now();
      db.notes = [note, ...(db.notes || []).filter(n => n.id !== note.id)];
      writeDb(db);
      res.writeHead(201);
      res.end(JSON.stringify({ success: true, note }));
      return true;
    }
  }

  if (pathname.startsWith('/api/notes/')) {
    const noteId = pathname.replace('/api/notes/', '');
    const db = readDb();
    if (method === 'DELETE') {
      db.notes = (db.notes || []).filter(n => n.id !== noteId);
      writeDb(db);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, deleted: noteId }));
      return true;
    }
  }

  // 8. Calendar Events: /api/calendar
  if (pathname === '/api/calendar') {
    const db = readDb();
    if (method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(db.calendarEvents || []));
      return true;
    }
    if (method === 'POST') {
      const ev = await parseJsonBody(req);
      if (!ev.id) ev.id = 'e-' + Date.now();
      db.calendarEvents = [...(db.calendarEvents || []).filter(e => e.id !== ev.id), ev];
      writeDb(db);
      res.writeHead(201);
      res.end(JSON.stringify({ success: true, event: ev }));
      return true;
    }
  }

  if (pathname.startsWith('/api/calendar/')) {
    const eventId = pathname.replace('/api/calendar/', '');
    const db = readDb();
    if (method === 'DELETE') {
      db.calendarEvents = (db.calendarEvents || []).filter(e => e.id !== eventId);
      writeDb(db);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, deleted: eventId }));
      return true;
    }
  }

  // 9. Health (Profile & Logs): /api/health-data
  if (pathname === '/api/health-data') {
    const db = readDb();
    if (method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({
        healthProfile: db.healthProfile || null,
        healthDailyLogs: db.healthDailyLogs || {}
      }));
      return true;
    }
    if (method === 'POST') {
      const payload = await parseJsonBody(req);
      if (payload.healthProfile !== undefined) db.healthProfile = payload.healthProfile;
      if (payload.healthDailyLogs !== undefined) db.healthDailyLogs = payload.healthDailyLogs;
      writeDb(db);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: 'Health data saved to database' }));
      return true;
    }
  }

  // 10. User Profile: /api/profile
  if (pathname === '/api/profile') {
    const db = readDb();
    if (method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(db.profile || {}));
      return true;
    }
    if (method === 'POST' || method === 'PUT') {
      const updates = await parseJsonBody(req);
      db.profile = { ...(db.profile || {}), ...updates };
      writeDb(db);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, profile: db.profile }));
      return true;
    }
  }

  return false;
}

export {
  handleApiRequest,
  readDb,
  writeDb
};

export default {
  handleApiRequest,
  readDb,
  writeDb
};
