import { useState } from 'react';
import { Download, FileText, LogOut, Server, Upload } from 'lucide-react';
import BatchAddModal from '../components/BatchAddModal.jsx';
import { Button, Field, Segmented } from '../components/UI.jsx';
import { getApiBase, setApiBase } from '../api.js';
import { useData } from '../store.jsx';
import { downloadBlob, exportPlansToDocx, exportPlansToTxt, readImportFile } from '../utils/exportImport.js';
import { periodFromKey, startOfWeek, toPeriodKey, todayKey } from '../utils/date.js';

const scopes = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'undone', label: '未完成' },
];

function filterPlans(plans, scope) {
  if (scope === 'all') return plans;
  if (scope === 'undone') return plans.filter((p) => p.status !== 'done');
  if (scope === 'today') return plans.filter((p) => p.period_type === 'day' && p.period === todayKey());
  if (scope === 'week') {
    const start = startOfWeek(new Date());
    return plans.filter((p) => {
      const date = periodFromKey(p.period, p.period_type);
      return date >= start && date <= new Date(start.getTime() + 6 * 86400000);
    });
  }
  const prefix = toPeriodKey(new Date(), 'month');
  return plans.filter((p) => p.period.startsWith(prefix));
}

export default function SettingsPage({ user, onLogout }) {
  const { plans, subjects } = useData();
  const [scope, setScope] = useState('all');
  const [apiBase, setApiBaseState] = useState(getApiBase());
  const [serverSaved, setServerSaved] = useState(false);
  const [importText, setImportText] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState('');

  function handleExportTxt() {
    const text = exportPlansToTxt(filterPlans(plans, scope));
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `学习计划-${new Date().toISOString().slice(0, 10)}.txt`);
  }

  async function handleExportDocx() {
    const blob = await exportPlansToDocx(filterPlans(plans, scope));
    downloadBlob(blob, `学习计划-${new Date().toISOString().slice(0, 10)}.docx`);
  }

  async function handleImportFile(file) {
    try {
      const text = await readImportFile(file);
      setImportText(text);
      setImportOpen(true);
      setError('');
    } catch {
      setError('文件读取失败，请确认是 txt 或 Word 文件');
    }
  }

  function handleSaveServer() {
    setApiBase(apiBase.trim());
    setServerSaved(true);
    setTimeout(() => setServerSaved(false), 2000);
  }

  const visibleCount = filterPlans(plans, scope).length;

  return (
    <div className="page settings-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">设置</p>
          <h1>同步、导入与导出</h1>
          <p className="subtitle">当前数据保存在本机，接入服务器后即可多端同步</p>
        </div>
      </section>

      <div className="settings-grid">
        <section className="settings-card">
          <div className="section-heading">
            <div>
              <h2>账号</h2>
              <p>当前登录信息</p>
            </div>
          </div>
          <div className="profile-row">
            <div className="avatar large">{user.nickname?.slice(0, 1).toUpperCase() || user.username.slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>{user.nickname || user.username}</strong>
              <span>@ {user.username}</span>
            </div>
          </div>
          <Button variant="danger" onClick={onLogout} icon={LogOut}>
            退出登录
          </Button>
        </section>

        <section className="settings-card">
          <div className="section-heading">
            <div>
              <h2>服务器地址</h2>
              <p>桌面端可连接自己的云端服务器</p>
            </div>
          </div>
          <Field label="API 地址">
            <div className="server-field">
              <Server size={17} />
              <input
                value={apiBase}
                onChange={(e) => {
                  setApiBaseState(e.target.value);
                  setServerSaved(false);
                }}
                placeholder="留空表示使用当前站点"
              />
              <Button size="sm" onClick={handleSaveServer}>
                {serverSaved ? '已保存' : '保存'}
              </Button>
            </div>
          </Field>
        </section>

        <section className="settings-card export-card">
          <div className="section-heading">
            <div>
              <h2>导出计划</h2>
              <p>可分享给同学，或备份到本地</p>
            </div>
          </div>
          <Field label="导出范围">
            <Segmented options={scopes} value={scope} onChange={setScope} />
          </Field>
          <div className="export-actions">
            <Button variant="secondary" onClick={handleExportTxt} icon={FileText}>
              导出 TXT（{visibleCount} 条）
            </Button>
            <Button onClick={handleExportDocx} icon={Download}>
              导出 Word（{visibleCount} 条）
            </Button>
          </div>
        </section>

        <section className="settings-card import-card">
          <div className="section-heading">
            <div>
              <h2>导入计划</h2>
              <p>支持 txt 和 Word，导入前可预览修改</p>
            </div>
          </div>
          <label className="import-dropzone">
            <Upload size={26} />
            <strong>选择文件导入</strong>
            <span>txt 或 .docx</span>
            <input type="file" accept=".txt,.docx" onChange={(e) => handleImportFile(e.target.files[0])} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
        </section>
      </div>

      {importOpen ? (
        <BatchAddModal
          context={{ periodType: 'day', period: todayKey(), subjectId: null }}
          initialText={importText}
          onClose={() => {
            setImportOpen(false);
            setImportText('');
          }}
        />
      ) : null}
    </div>
  );
}
