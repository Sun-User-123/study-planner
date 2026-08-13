const base = process.env.API_BASE || 'http://127.0.0.1:8787';

const pad = (n) => String(n).padStart(2, '0');
const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const startOfWeek = (date) => {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
};
const addDays = (date, amount) => {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
};

async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${path} ${response.status}: ${data.error || response.statusText}`);
  }
  return data;
}

async function getToken() {
  try {
    const result = await request('/api/auth/register', {
      method: 'POST',
      body: { username: 'demo', password: 'test123456', nickname: '学习用户' },
    });
    return result.token;
  } catch {
    const result = await request('/api/auth/login', {
      method: 'POST',
      body: { username: 'demo', password: 'test123456' },
    });
    return result.token;
  }
}

const now = new Date();
const today = toKey(now);
const yesterday = toKey(addDays(now, -1));
const twoDaysAgo = toKey(addDays(now, -2));
const tomorrow = toKey(addDays(now, 1));
const weekStart = toKey(startOfWeek(now));
const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

const token = await getToken();
const subjectsResult = await request('/api/subjects', { token });
const subjectMap = new Map(subjectsResult.subjects.map((s) => [s.name, s.id]));

if (!subjectMap.has('英语')) {
  const created = await request('/api/subjects', {
    method: 'POST',
    body: { name: '英语', color: '#0ea5e9' },
    token,
  });
  subjectMap.set('英语', created.subject.id);
}
if (!subjectMap.has('数学')) {
  const created = await request('/api/subjects', {
    method: 'POST',
    body: { name: '数学', color: '#8b5cf6' },
    token,
  });
  subjectMap.set('数学', created.subject.id);
}

const plans = [
  {
    content: '数据结构：红黑树插入与删除综合题',
    subjectId: subjectMap.get('数据结构'),
    periodType: 'day',
    period: today,
    durationMinutes: 120,
    priority: 'high',
    status: 'done',
    notes: '错题整理：删除的双黑结点处理；配套视频 https://www.bilibili.com/video/BV1GJ411x7h7',
  },
  {
    content: '计算机组成原理：指令流水线与冒险处理',
    subjectId: subjectMap.get('计算机组成原理'),
    periodType: 'day',
    period: today,
    durationMinutes: 90,
    priority: 'high',
    status: 'doing',
    notes: '重点对比数据冒险、结构冒险与控制冒险',
  },
  {
    content: '操作系统：进程调度算法对比',
    subjectId: subjectMap.get('操作系统'),
    periodType: 'day',
    period: today,
    durationMinutes: 60,
    priority: 'medium',
    status: 'todo',
    notes: '整理 FCFS / SJF / 时间片轮转的表格',
  },
  {
    content: '计算机网络：TCP 拥塞控制',
    subjectId: subjectMap.get('计算机网络'),
    periodType: 'day',
    period: today,
    durationMinutes: 90,
    priority: 'medium',
    status: 'todo',
    notes: '慢启动、拥塞避免、快重传与快恢复',
  },
  {
    content: '英语：2010 年阅读 Text 1 精读',
    subjectId: subjectMap.get('英语'),
    periodType: 'day',
    period: today,
    durationMinutes: 60,
    priority: 'low',
    status: 'todo',
    notes: '摘抄生词 20 个并复习',
  },
  {
    content: '数学：高数极限强化',
    subjectId: subjectMap.get('数学'),
    periodType: 'day',
    period: today,
    durationMinutes: 90,
    priority: 'high',
    status: 'todo',
    notes: '课后题 1-10，卡住的题标记出来',
  },
  {
    content: '整理今日错题本',
    subjectId: null,
    periodType: 'day',
    period: today,
    durationMinutes: 30,
    priority: 'low',
    status: 'todo',
    notes: '把今天的易错点汇总到错题本',
  },
  {
    content: '操作系统：进程与线程',
    subjectId: subjectMap.get('操作系统'),
    periodType: 'day',
    period: yesterday,
    durationMinutes: 60,
    priority: 'medium',
    status: 'done',
    notes: '',
  },
  {
    content: '数据结构：二叉树遍历与线索化',
    subjectId: subjectMap.get('数据结构'),
    periodType: 'day',
    period: twoDaysAgo,
    durationMinutes: 90,
    priority: 'high',
    status: 'done',
    notes: '',
  },
  {
    content: '计算机网络：网络层 IP 分片',
    subjectId: subjectMap.get('计算机网络'),
    periodType: 'day',
    period: tomorrow,
    durationMinutes: 60,
    priority: 'medium',
    status: 'todo',
    notes: '',
  },
  {
    content: '数据结构：树与二叉树章节真题',
    subjectId: subjectMap.get('数据结构'),
    periodType: 'week',
    period: weekStart,
    durationMinutes: 180,
    priority: 'high',
    status: 'doing',
    notes: '真题按题型拆解，整理常考结论',
  },
  {
    content: '操作系统：内存管理',
    subjectId: subjectMap.get('操作系统'),
    periodType: 'week',
    period: weekStart,
    durationMinutes: 120,
    priority: 'medium',
    status: 'todo',
    notes: '分页、分段与虚拟内存',
  },
  {
    content: '英语：作文模板背诵与仿写',
    subjectId: subjectMap.get('英语'),
    periodType: 'week',
    period: weekStart,
    durationMinutes: 90,
    priority: 'low',
    status: 'todo',
    notes: '',
  },
  {
    content: '四科基础强化收尾',
    subjectId: subjectMap.get('数据结构'),
    periodType: 'month',
    period: month,
    durationMinutes: 300,
    priority: 'high',
    status: 'doing',
    notes: '数据结构、计组、操作系统、计网各完成一轮强化',
  },
  {
    content: '数学基础过关',
    subjectId: subjectMap.get('数学'),
    periodType: 'month',
    period: month,
    durationMinutes: 240,
    priority: 'medium',
    status: 'todo',
    notes: '',
  },
  {
    content: '英语真题一刷',
    subjectId: subjectMap.get('英语'),
    periodType: 'month',
    period: month,
    durationMinutes: 150,
    priority: 'medium',
    status: 'todo',
    notes: '',
  },
];

const created = await request('/api/plans', { method: 'POST', body: { plans }, token });
console.log(`seeded ${created.plans.length} plans for ${today}`);
