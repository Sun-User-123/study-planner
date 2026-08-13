import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import mammoth from 'mammoth/mammoth.browser.js';
import { formatDuration, formatPriority, formatStatus, parsePlanLines } from './parser.js';
import { formatPeriodLabel } from './date.js';

const periodTypeLabel = { day: '每日', week: '每周', month: '每月' };

function planToLine(plan) {
  const fields = [
    plan.content || '',
    plan.subject_name || '',
    periodTypeLabel[plan.period_type] || plan.period_type || '',
    plan.period || '',
    formatDuration(plan.duration_minutes),
    formatPriority(plan.priority),
    formatStatus(plan.status),
    plan.notes || '',
  ];
  return fields.join(' | ');
}

export function exportPlansToTxt(plans) {
  const lines = [
    '学习计划导出',
    `生成时间：${new Date().toLocaleString('zh-CN')}`,
    `共 ${plans.length} 条计划`,
    '',
    '任务内容 | 科目 | 周期 | 日期 | 预计时长 | 优先级 | 状态 | 备注',
    ...plans.map(planToLine),
    '',
  ];
  return lines.join('\n');
}

function cell(text, options = {}) {
  const runs = [];
  if (text != null && String(text) !== '') {
    runs.push(
      new TextRun({
        text: String(text),
        font: 'Microsoft YaHei',
        size: options.bold ? 22 : 21,
        bold: options.bold,
      }),
    );
  }
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [new Paragraph({ children: runs, spacing: { after: 0 } })],
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
  });
}

export async function exportPlansToDocx(plans) {
  const widths = [26, 11, 8, 12, 10, 7, 9, 17];
  const header = new TableRow({
    tableHeader: true,
    children: ['任务内容', '科目', '周期', '日期', '预计时长', '优先级', '状态', '备注'].map((text, i) =>
      cell(text, { bold: true, width: widths[i] }),
    ),
  });
  const rows = plans.map((plan) =>
    new TableRow({
      children: [
        cell(plan.content, { width: widths[0] }),
        cell(plan.subject_name, { width: widths[1] }),
        cell(periodTypeLabel[plan.period_type] || plan.period_type, { width: widths[2] }),
        cell(plan.period, { width: widths[3] }),
        cell(formatDuration(plan.duration_minutes), { width: widths[4] }),
        cell(formatPriority(plan.priority), { width: widths[5] }),
        cell(formatStatus(plan.status), { width: widths[6] }),
        cell(plan.notes, { width: widths[7] }),
      ],
    }),
  );

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Microsoft YaHei', size: 22 } },
      },
    },
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [new TextRun({ text: '学习计划导出', font: 'Microsoft YaHei', bold: true, size: 36 })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [
              new TextRun({
                text: `生成时间：${new Date().toLocaleString('zh-CN')}    共 ${plans.length} 条计划`,
                font: 'Microsoft YaHei',
                size: 20,
                color: '6B7280',
              }),
            ],
          }),
          new Paragraph({ spacing: { after: 120 }, children: [] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [header, ...rows],
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
              left: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
              right: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
              insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
            },
          }),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function decodeHtmlEntities(text) {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function tableRowsFromHtml(html) {
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0] || '';
  const rows = [];
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellPattern = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(table))) {
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      const value = decodeHtmlEntities(
        cellMatch[1]
          .replace(/<br\s*\/?>/gi, ' ')
          .replace(/<\/p>/gi, ' ')
          .replace(/<[^>]*>/g, ''),
      )
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(value);
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}

export async function readImportFile(file) {
  if (file.name.toLowerCase().endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer();
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const tableRows = tableRowsFromHtml(htmlResult.value);
    const headerIndex = tableRows.findIndex((row) => row[0] === '任务内容');
    if (headerIndex !== -1 && tableRows.length > headerIndex + 1) {
      return tableRows
        .slice(headerIndex + 1)
        .map((row) => row.join(' | '))
        .join('\n');
    }

    const rawResult = await mammoth.extractRawText({ arrayBuffer });
    return rawResult.value;
  }
  return file.text();
}

export function previewImportText(text, context, subjects) {
  const rows = parsePlanLines(text, context, subjects);
  return rows.filter((row) => row.content);
}

export { formatPeriodLabel };
