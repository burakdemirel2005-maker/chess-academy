import React, { useEffect, useState } from 'react';
import {
  Cloud,
  KeyRound,
  Laptop,
  LogIn,
  LogOut,
  RefreshCw,
  Scale,
  Settings,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { BOARD_THEMES, BoardThemeId, useAcademyStore } from '@/stores/useAcademyStore';
import { isSupabaseConfigured, supabase } from '@/services/supabaseClient';
import {
  flushPendingSyncQueue,
  loadPendingSyncQueue,
} from '@/services/syncAdapter';
import { getRuntimePlatformInfo, RuntimePlatformInfo } from '@/services/platformAdapter';

export const SettingsSyncView: React.FC = () => {
  const {
    user,
    setUser,
    locale,
    setLocale,
    coachLevel,
    setCoachLevel,
    boardTheme,
    setBoardTheme,
    soundEnabled,
    setSoundEnabled,
    showCoordinates,
    setShowCoordinates,
  } = useAcademyStore();

  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);
  const [platformInfo, setPlatformInfo] = useState<RuntimePlatformInfo | null>(null);

  useEffect(() => {
    setPendingQueueCount(loadPendingSyncQueue().length);
    getRuntimePlatformInfo().then(setPlatformInfo);
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);

    if (!isSupabaseConfigured || !supabase) {
      // Allow local account profile creation when offline / guest mode
      if (email.trim()) {
        setUser({
          id: `local_${email.trim()}`,
          email: email.trim(),
          displayName: displayName.trim() || email.split('@')[0],
          isGuest: false,
        });
        setAuthMessage(
          'Yerel profil etkinleştirildi. Supabase ortam değişkenleri yapılandırıldığında bulut senkronizasyonu otomatik devreye girer.'
        );
      }
      return;
    }

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: displayName.trim() || email.split('@')[0] },
          },
        });
        if (error) throw error;
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email ?? email,
            displayName: displayName.trim() || email.split('@')[0],
            isGuest: false,
          });
          setAuthMessage('Hesabınız başarıyla oluşturuldu ve oturum açıldı!');
        }
      } else if (authMode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email ?? email,
            displayName:
              (data.user.user_metadata?.display_name as string) ||
              email.split('@')[0],
            isGuest: false,
          });
          setAuthMessage('Başarıyla giriş yapıldı ve bulut senkronizasyonu başlatıldı.');
          await flushPendingSyncQueue(data.user.id);
          setPendingQueueCount(loadPendingSyncQueue().length);
        }
      } else if (authMode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setAuthMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
      }
    } catch (err) {
      setAuthMessage(
        err instanceof Error ? err.message : 'Kimlik doğrulama işlemi sırasında hata oluştu.'
      );
    }
  };

  const handleManualSync = async () => {
    const res = await flushPendingSyncQueue(user.id ?? '');
    setPendingQueueCount(res.remainingCount);
    setSyncMessage(
      res.error
        ? res.error
        : `${res.flushedCount} kayıt bulutla senkronize edildi. Bekleyen kayıt: ${res.remainingCount}.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-navy-900/90 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Ayarlar, Hesap ve Web + macOS Senkronizasyonu
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Çevrimdışı önbellek, Supabase bulut eşitlemesi, uygulama tercihleri ve açık kaynak lisans bilgileri.
          </p>
        </div>

        {platformInfo && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-navy-950 border border-slate-800 text-xs text-emerald-300">
            <Laptop className="w-4 h-4" />
            <span>
              Çalışma Ortamı: {platformInfo.isDesktop ? 'macOS Native (Tauri 2)' : 'Web Tarayıcı'} ({platformInfo.arch})
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Account & Cloud Sync */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-400" />
                Kullanıcı Hesabı ve Supabase Bulut Eşitlemesi
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {user.isGuest ? 'Misafir Modu' : 'Kayıtlı Hesap'}
              </span>
            </div>

            {!user.isGuest ? (
              <div className="p-4 rounded-xl bg-navy-950 border border-slate-800 space-y-3 text-xs">
                <div>
                  <div className="text-slate-400">Aktif Kullanıcı</div>
                  <div className="text-sm font-bold text-slate-100">{user.displayName}</div>
                  <div className="text-slate-400">{user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (supabase) supabase.auth.signOut().catch(() => {});
                    setUser({
                      id: null,
                      email: null,
                      displayName: 'Misafir Öğrenci',
                      isGuest: true,
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 font-semibold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Oturumu Kapat ve Misafir Moduna Geç
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      authMode === 'signin'
                        ? 'bg-emerald-500 text-navy-950'
                        : 'bg-navy-950 text-slate-300'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5 inline mr-1" />
                    Giriş Yap
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      authMode === 'signup'
                        ? 'bg-emerald-500 text-navy-950'
                        : 'bg-navy-950 text-slate-300'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 inline mr-1" />
                    Kayıt Ol
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('reset')}
                    className={`px-3 py-1.5 rounded-lg font-semibold ${
                      authMode === 'reset'
                        ? 'bg-emerald-500 text-navy-950'
                        : 'bg-navy-950 text-slate-300'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                    Şifre Sıfırla
                  </button>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label htmlFor="auth-name" className="block text-slate-300 mb-1">
                      Ad Soyad veya Kullanıcı Adı
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      autoComplete="name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className="block text-slate-300 mb-1">
                    E-posta Adresi
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100"
                  />
                </div>

                {authMode !== 'reset' && (
                  <div>
                    <label htmlFor="auth-password" className="block text-slate-300 mb-1">
                      Şifre
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      required
                      autoComplete={
                        authMode === 'signup' ? 'new-password' : 'current-password'
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-navy-950 font-bold transition"
                >
                  {authMode === 'signup'
                    ? 'Hesap Oluştur'
                    : authMode === 'reset'
                    ? 'Sıfırlama Bağlantısı Gönder'
                    : 'Oturum Aç'}
                </button>
              </form>
            )}

            {authMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200">
                {authMessage}
              </div>
            )}

            {/* Offline Sync Queue Inspector */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-slate-200">
                  Çevrimdışı Senkronizasyon Kuyruğu: {pendingQueueCount} kayıt
                </div>
                <div className="text-[11px] text-slate-400">
                  Çevrimdışı yapılan ders, açılış ve bulmaca ilerlemeleri internet bağlantısı sağlandığında tekil ID ile eşitlenir.
                </div>
              </div>
              <button
                type="button"
                onClick={handleManualSync}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-slate-700 text-slate-200 font-semibold shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                Şimdi Eşitle
              </button>
            </div>

            {syncMessage && (
              <div className="p-2.5 rounded-xl bg-navy-950 border border-slate-800 text-xs text-slate-300">
                {syncMessage}
              </div>
            )}
          </div>
        </div>

        {/* Right: Preferences & GPLv3 License Notice */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-5 space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Eğitim, Dil ve Tahta Tercihleri
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="pref-locale" className="block text-slate-300 mb-1 font-medium">
                  Uygulama Dili
                </label>
                <select
                  id="pref-locale"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as 'tr' | 'en')}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100"
                >
                  <option value="tr">Türkçe (Varsayılan)</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label htmlFor="pref-coach" className="block text-slate-300 mb-1 font-medium">
                  Varsayılan Koç Açıklama Seviyesi
                </label>
                <select
                  id="pref-coach"
                  value={coachLevel}
                  onChange={(e) =>
                    setCoachLevel(
                      e.target.value as 'beginner' | 'intermediate' | 'advanced'
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100"
                >
                  <option value="beginner">Başlangıç (Sade Türkçe)</option>
                  <option value="intermediate">Orta Seviye (Konumsal ve Taktik)</option>
                  <option value="advanced">İleri Seviye (Motor Varyantlı)</option>
                </select>
              </div>

              <div>
                <label htmlFor="pref-theme" className="block text-slate-300 mb-1 font-medium">
                  Satranç Tahtası Teması
                </label>
                <select
                  id="pref-theme"
                  value={boardTheme}
                  onChange={(e) => setBoardTheme(e.target.value as BoardThemeId)}
                  className="w-full px-3 py-2 rounded-xl bg-navy-950 border border-slate-700 text-slate-100"
                >
                  {Object.entries(BOARD_THEMES).map(([id, t]) => (
                    <option key={id} value={id}>
                      {t.nameTr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col justify-center gap-2 pt-3">
                <label className="inline-flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                  />
                  <span>Hamle ve Uyarı Sesleri Aktif</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="checkbox"
                    checked={showCoordinates}
                    onChange={(e) => setShowCoordinates(e.target.checked)}
                  />
                  <span>Tahta Koordinatlarını (a-h, 1-8) Göster</span>
                </label>
              </div>
            </div>
          </div>

          {/* Stockfish GPLv3 & Open Source Licensing Card */}
          <div className="rounded-2xl bg-navy-900/95 border border-slate-800 p-5 space-y-2.5 text-xs">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              Açık Kaynak ve Stockfish GPLv3 Lisans Bildirimi
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Satranç Akademisi analiz ve oyun motoru olarak <strong>Stockfish (stockfish.js WASM)</strong> kullanır ve hiçbir ücretli/bulut LLM servisine bağımlı değildir. Stockfish, <strong>GNU General Public License v3 (GPLv3)</strong> altında lisanslanmıştır.
            </p>
            <p className="text-slate-400">
              GPLv3 yükümlülükleri gereğince tam kaynak kodu, lisans metni (<code>/stockfish/Copying.txt</code> ve <code>LICENSES.md</code>) ve derleme talimatları proje deposunda açık olarak sunulmaktadır. Satranç kuralları için <code>chess.js</code> (BSD-2-Clause) ve arayüz bileşenleri için MIT lisanslı açık kaynak kütüphaneler kullanılmıştır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
