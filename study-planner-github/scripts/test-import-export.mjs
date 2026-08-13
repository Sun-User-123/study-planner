import { previewImportText, exportPlansToDocx, exportPlansToTxt, readImportFile } from '../src/utils/exportImport.js';

const subjects = [
  { id: 1, name: '数据结构', color: '#6366f1' },
  { id: 2, name: '操作系统', color: '#10b981' },
  { id: 3, name: '计算机网络', color: '#f43f5e' },
];

const plans = [
  {
    id: 1,
    content: '数据结构：红黑树插入与删除综合题',
    subject_name: '数据结构',
    period_type: 'day',
    period: '2026-08-13',
    duration_minutes: 120,
    priority: 'high',
    status: 'done',
    notes: '错题整理；视频 https://www.bilibili.com/video/BV1GJ411x7h7',
  },
  {
    id: 2,
    content: '操作系统：内存管理',
    subject_name: '操作系统',
    period_type: 'week',
    period: '2026-08-10',
    duration_minutes: 90,
    priority: 'medium',
    status: 'todo',
    notes: '分页、分段与虚拟内存',
  },
  {
    id: 3,
    content: '四科基础强化收尾',
    subject_name: '数据结构',
    period_type: 'month',
    period: '2026-08',
    duration_minutes: 300,
    priority: 'high',
    status: 'doing',
    notes: '',
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkRows(rows, source) {
  assert(rows.length === 3, `${source}: expected 3 rows, got ${rows.length}`);
  assert(rows[0].content === plans[0].content, `${source}: content mismatch`);
  assert(rows[0].subjectName === '数据结构', `${source}: subject mismatch`);
  assert(rows[0].periodType === 'day' && rows[0].period === '2026-08-13', `${source}: day period mismatch`);
  assert(rows[0].durationMinutes === 120, `${source}: duration mismatch`);
  assert(rows[0].priority === 'high' && rows[0].status === 'done', `${source}: priority/status mismatch`);
  assert(rows[0].notes.includes('https://www.bilibili.com/video/BV1GJ411x7h7'), `${source}: notes mismatch`);
  assert(rows[1].periodType === 'week' && rows[1].period === '2026-08-10', `${source}: week period mismatch`);
  assert(rows[2].periodType === 'month' && rows[2].period === '2026-08', `${source}: month period mismatch`);
  assert(rows[2].notes === '', `${source}: empty notes should stay empty`);
}

const txt = exportPlansToTxt(plans);
const txtRows = previewImportText(txt, { periodType: 'day', period: '2026-08-13' }, subjects);
checkRows(txtRows, 'txt');

const txtFile = new File([txt], 'plans.txt', { type: 'text/plain;charset=utf-8' });
const txtImported = await readImportFile(txtFile);
checkRows(previewImportText(txtImported, { periodType: 'day', period: '2026-08-13' }, subjects), 'txt file');

const docxBlob = await exportPlansToDocx(plans);
const docxFile = new File([docxBlob], 'plans.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
const docxImported = await readImportFile(docxFile);
const docxRows = previewImportText(docxImported, { periodType: 'day', period: '2026-08-13' }, subjects);
checkRows(docxRows, 'docx');

console.log('roundtrip ok: txt and docx both restored all plan fields');
