import { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';

const SettingsPanel = () => {
  const settings = useSettingsStore();
  const [localState, setLocalState] = useState({
    doubaoApiKey: settings.doubaoApiKey,
    supabaseUrl: settings.supabaseUrl,
    supabaseKey: settings.supabaseKey,
    amapApiKey: settings.amapApiKey,
    defaultCurrency: settings.defaultCurrency,
    voicePreferred: settings.voicePreferred
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    settings.setDoubaoApiKey(localState.doubaoApiKey.trim());
    settings.setSupabaseUrl(localState.supabaseUrl.trim());
    settings.setSupabaseKey(localState.supabaseKey.trim());
    settings.setAmapApiKey(localState.amapApiKey.trim());
    settings.setDefaultCurrency(localState.defaultCurrency.trim());
    settings.setVoicePreferred(localState.voicePreferred);
    alert('设置已保存到本地浏览器');
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>API & 偏好设置</h2>
      <label>
        豆包 API Key
        <input
          type="password"
          value={localState.doubaoApiKey}
          onChange={(event) => setLocalState((prev) => ({ ...prev, doubaoApiKey: event.target.value }))}
          placeholder="sk-..."
        />
      </label>
      <label>
        Supabase Project URL
        <input
          value={localState.supabaseUrl}
          onChange={(event) => setLocalState((prev) => ({ ...prev, supabaseUrl: event.target.value }))}
          placeholder="https://xxx.supabase.co"
        />
      </label>
      <label>
        Supabase API Key
        <input
          type="password"
          value={localState.supabaseKey}
          onChange={(event) => setLocalState((prev) => ({ ...prev, supabaseKey: event.target.value }))}
          placeholder="service_role 或 anon key"
        />
      </label>
      <label>
        高德地图 API Key
        <input
          value={localState.amapApiKey}
          onChange={(event) => setLocalState((prev) => ({ ...prev, amapApiKey: event.target.value }))}
          placeholder="请在高德开放平台注册"
        />
      </label>
      <label>
        默认币种
        <input
          value={localState.defaultCurrency}
          onChange={(event) => setLocalState((prev) => ({ ...prev, defaultCurrency: event.target.value }))}
        />
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={localState.voicePreferred}
          onChange={(event) => setLocalState((prev) => ({ ...prev, voicePreferred: event.target.checked }))}
        />
        优先使用语音输入
      </label>
      <button type="submit" className="primary">
        保存设置
      </button>
      <p className="hint">所有密钥仅保存在当前浏览器的 LocalStorage 中。</p>
    </form>
  );
};

export default SettingsPanel;
