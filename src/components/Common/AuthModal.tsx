import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { User, LogOut, X, AlertCircle, Camera, Pencil, Target, FileText, Check, Loader2, Trash2, RefreshCw } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, showToast, syncStatus } = useApp();
  const { 
    currentUser, 
    isGuest, 
    isFirebaseAvailable,
    loginWithEmail, 
    signupWithEmail, 
    loginAsGuest, 
    logout, 
    resetPassword,
    userProfile,
    saveUserProfile,
    deleteAccount,
  } = useAuth();
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [activeTab, setActiveTab] = useState<'profile' | 'cloud'>('profile');
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Profile editing state
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const bioInputRef = useRef<HTMLTextAreaElement>(null);
  const goalInputRef = useRef<HTMLInputElement>(null);

  // Sync profile state when modal opens or profile changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setEditName(userProfile?.displayName || currentUser?.displayName || '');
      setEditBio(userProfile?.bio || '');
      setEditGoal(userProfile?.goal || '');
      setEditPhotoURL(userProfile?.photoURL || currentUser?.photoURL || '');
      setError(null);
    }
  }, [currentUser, isGuest, isAuthModalOpen, userProfile]);

  // Auto-focus edit fields
  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus();
  }, [isEditingName]);
  useEffect(() => {
    if (isEditingBio) bioInputRef.current?.focus();
  }, [isEditingBio]);
  useEffect(() => {
    if (isEditingGoal) goalInputRef.current?.focus();
  }, [isEditingGoal]);

  if (!isAuthModalOpen) return null;

  // --- Profile editing handlers ---
  const handleSaveName = () => {
    if (!editName.trim()) return;
    setSavingField('name');
    saveUserProfile({ displayName: editName.trim() });
    setIsEditingName(false);
    setSavingField(null);
    showToast(isAr ? 'تم تحديث الاسم' : 'Name updated');
  };

  const handleSaveBio = () => {
    setSavingField('bio');
    saveUserProfile({ bio: editBio.trim() });
    setIsEditingBio(false);
    setSavingField(null);
    showToast(isAr ? 'تم تحديث الوصف' : 'Bio updated');
  };

  const handleSaveGoal = () => {
    setSavingField('goal');
    saveUserProfile({ goal: editGoal.trim() });
    setIsEditingGoal(false);
    setSavingField(null);
    showToast(isAr ? 'تم تحديث الهدف' : 'Goal updated');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate mime type
    if (!file.type.startsWith('image/')) {
      showToast(isAr ? 'يرجى اختيار ملف صورة صالح' : 'Please select a valid image file');
      return;
    }

    // Validate file size (max 2MB for base64 storage)
    if (file.size > 2 * 1024 * 1024) {
      showToast(isAr ? 'الصورة كبيرة جداً (الحد الأقصى 2MB)' : 'Image too large (max 2MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setEditPhotoURL(dataUrl);
      saveUserProfile({ photoURL: dataUrl });
      showToast(isAr ? 'تم تحديث الصورة' : 'Photo updated');
    };
    reader.readAsDataURL(file);

    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      await deleteAccount();
      showToast(isAr ? 'تم حذف الحساب والبيانات بالكامل' : 'Account and data permanently deleted');
      setIsConfirmingDelete(false);
      setIsAuthModalOpen(false);
    } catch (err) {
      console.error('Delete account error:', err);
      showToast(isAr ? 'تعذر حذف الحساب، يرجى إعادة تسجيل الدخول والمحاولة' : 'Failed to delete account. Please re-authenticate and try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleRemovePhoto = () => {
    setEditPhotoURL('');
    saveUserProfile({ photoURL: '' });
    showToast(isAr ? 'تم إزالة الصورة' : 'Photo removed');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  };

  // --- Auth handlers ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isFirebaseAvailable) {
      setError(
        isAr
          ? 'المزامنة السحابية تتطلب إعداد مفاتيح Firebase في ملف .env (راجع .env.example). يمكنك استخدام التطبيق وتعديل ملفك الشخصي محلياً الآن.'
          : 'Cloud authentication requires Firebase keys configured in .env (see .env.example). DayWeave works 100% locally right now.'
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        showToast(isAr ? 'تم تسجيل الدخول بنجاح!' : 'Signed in successfully.');
        setIsAuthModalOpen(false);
      } else if (mode === 'signup') {
        await signupWithEmail(email, password, displayName);
        showToast(isAr ? `أهلاً بك، ${displayName || 'مستخدم جديد'}!` : `Welcome to DayWeave, ${displayName || 'Planner'}!`);
        setIsAuthModalOpen(false);
      } else if (mode === 'reset') {
        await resetPassword(email);
        showToast(isAr ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.' : 'Password reset email sent.');
        setMode('login');
      }
    } catch (err: any) {
      console.error(err);
      let msg = err?.message || 'Authentication operation failed.';
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password') {
        msg = isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.';
      } else if (err?.code === 'auth/email-already-in-use') {
        msg = isAr ? 'هذا البريد الإلكتروني مسجل بالفعل.' : 'This email is already in use.';
      } else if (err?.code === 'auth/weak-password') {
        msg = isAr ? 'كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.' : 'Password should be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setLoading(true);
    try {
      await loginAsGuest();
      showToast(isAr ? 'تمت المتابعة كزائر (تخزين محلي).' : 'Continuing as Guest with local-first sync.');
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Guest login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast(isAr ? 'تم تسجيل الخروج.' : 'Signed out.');
    setIsAuthModalOpen(false);
  };

  // --- Shared styles ---
  const fieldLabelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const fieldRowStyle: React.CSSProperties = {
    padding: '10px 14px',
    backgroundColor: 'var(--bg-subtle)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    cursor: 'pointer',
  };

  const editBtnStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: 11,
    color: 'var(--accent-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    borderRadius: 'var(--radius-xs)',
    transition: 'background-color 0.15s ease',
  };

  const inlineInputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--bg-surface)',
    border: '1.5px solid var(--accent-primary)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    outline: 'none',
    boxShadow: '0 0 0 3px var(--accent-primary-subtle)',
    fontFamily: 'var(--font-sans)',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)',
        padding: 16,
      }}
      onClick={() => setIsAuthModalOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: currentUser && !isGuest ? 480 : 420,
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-dropdown)',
          padding: 24,
        }}
        className="animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div 
              style={{ 
                width: 32, 
                height: 32, 
                borderRadius: 'var(--radius-sm)', 
                backgroundColor: 'var(--accent-primary-subtle)', 
                color: 'var(--accent-primary)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}
            >
              {activeTab === 'profile' ? <User size={16} /> : <RefreshCw size={16} />}
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>
                {activeTab === 'profile' 
                  ? (isAr ? 'الملف الشخصي' : 'User Profile') 
                  : (isAr ? 'المزامنة السحابية والحساب' : 'Cloud Sync & Account')}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {activeTab === 'profile' 
                  ? (isAr ? 'تخصيص معلوماتك وصورتك الشخصية' : 'Personalize your profile and daily goals') 
                  : (isAr ? 'ربط الحساب والمزامنة عبر الأجهزة' : 'Multi-device cloud synchronization')}
              </p>
            </div>
          </div>
          <button className="btn-icon-subtle" onClick={() => setIsAuthModalOpen(false)}>
            <X size={16} />
          </button>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
          <button
            type="button"
            onClick={() => { setActiveTab('profile'); setError(null); }}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-xs)',
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: activeTab === 'profile' ? 'var(--accent-primary-subtle)' : 'transparent',
              color: activeTab === 'profile' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease'
            }}
          >
            <User size={14} />
            <span>{isAr ? 'الملف الشخصي' : 'Profile'}</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('cloud'); setError(null); }}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-xs)',
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: activeTab === 'cloud' ? 'var(--accent-primary-subtle)' : 'transparent',
              color: activeTab === 'cloud' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease'
            }}
          >
            <RefreshCw size={14} />
            <span>{isAr ? 'المزامنة السحابية' : 'Cloud Sync'}</span>
          </button>
        </div>

        {error && (
          <div 
            style={{ 
              padding: '8px 12px', 
              backgroundColor: 'var(--status-danger-bg)', 
              borderRadius: 'var(--radius-sm)', 
              color: 'var(--status-danger)', 
              fontSize: 12, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              marginBottom: 16 
            }}
          >
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'profile' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* ===== PROFILE PHOTO ===== */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingBottom: 8 }}>
              <div style={{ position: 'relative' }}>
                {editPhotoURL ? (
                  <img
                    src={editPhotoURL}
                    alt="Profile"
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--accent-primary-subtle)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent-primary) 0%, #7c3aed 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 28,
                      fontWeight: 800,
                      letterSpacing: '-0.02em',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                    }}
                  >
                    {getInitials(editName || currentUser?.displayName || (isAr ? 'مستخدم' : 'User'))}
                  </div>
                )}
                <button
                  onClick={() => photoInputRef.current?.click()}
                  title={isAr ? 'تغيير الصورة' : 'Change photo'}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-primary)',
                    color: '#fff',
                    border: '2px solid var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                  }}
                >
                  <Camera size={14} />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
              </div>
              {editPhotoURL && (
                <button
                  onClick={handleRemovePhoto}
                  style={{
                    fontSize: 11,
                    color: 'var(--status-danger)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-xs)',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {isAr ? 'إزالة الصورة' : 'Remove photo'}
                </button>
              )}
            </div>

            {/* ===== DISPLAY NAME ===== */}
            <div>
              <div style={fieldLabelStyle}>
                <Pencil size={12} />
                <span>{isAr ? 'الاسم' : 'Display Name'}</span>
              </div>
              {isEditingName ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setIsEditingName(false); }}
                    placeholder={isAr ? 'أدخل اسمك' : 'Enter your name'}
                    style={inlineInputStyle}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={!editName.trim()}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#fff',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: editName.trim() ? 'pointer' : 'not-allowed',
                      opacity: editName.trim() ? 1 : 0.5,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    {savingField === 'name' ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                  </button>
                </div>
              ) : (
                <div
                  style={fieldRowStyle}
                  onClick={() => setIsEditingName(true)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary-border)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                      {editName || (isAr ? 'أضف اسمك' : 'Add your name')}
                    </span>
                    <span style={editBtnStyle}>
                      <Pencil size={12} />
                      <span>{isAr ? 'تعديل' : 'Edit'}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ===== EMAIL (read-only) ===== */}
            <div>
              <div style={fieldLabelStyle}>
                <span style={{ fontSize: 12 }}>✉</span>
                <span>{isAr ? 'البريد الإلكتروني' : 'Email'}</span>
              </div>
              <div style={{ ...fieldRowStyle, cursor: 'default', opacity: 0.8 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                  {currentUser?.email || (isAr ? 'حساب محلي (تخزين في المتصفح)' : 'Local Profile (Stored in browser)')}
                </span>
              </div>
            </div>

            {/* ===== BIO ===== */}
            <div>
              <div style={fieldLabelStyle}>
                <FileText size={12} />
                <span>{isAr ? 'الوصف' : 'Bio'}</span>
              </div>
              {isEditingBio ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <textarea
                    ref={bioInputRef}
                    value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') setIsEditingBio(false); }}
                    placeholder={isAr ? 'اكتب شيئاً عن نفسك...' : 'Tell something about yourself...'}
                    maxLength={200}
                    style={{
                      ...inlineInputStyle,
                      fontWeight: 400,
                      fontSize: 13,
                      minHeight: 80,
                      resize: 'vertical',
                      lineHeight: 1.5,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {editBio.length}/200
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setIsEditingBio(false)}
                        style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 10px' }}
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                      <button
                        onClick={handleSaveBio}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: 'var(--accent-primary)',
                          color: '#fff',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Check size={13} />
                        <span>{isAr ? 'حفظ' : 'Save'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={fieldRowStyle}
                  onClick={() => setIsEditingBio(true)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary-border)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{
                      fontSize: 13,
                      color: editBio ? 'var(--text-secondary)' : 'var(--text-muted)',
                      lineHeight: 1.5,
                      fontStyle: editBio ? 'normal' : 'italic',
                      flex: 1,
                    }}>
                      {editBio || (isAr ? 'أضف وصف عنك...' : 'Add a bio...')}
                    </span>
                    <span style={{ ...editBtnStyle, flexShrink: 0, marginLeft: 8 }}>
                      <Pencil size={12} />
                      <span>{isAr ? 'تعديل' : 'Edit'}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ===== GOAL ===== */}
            <div>
              <div style={fieldLabelStyle}>
                <Target size={12} />
                <span>{isAr ? 'الهدف' : 'Goal'}</span>
              </div>
              {isEditingGoal ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    ref={goalInputRef}
                    type="text"
                    value={editGoal}
                    onChange={e => setEditGoal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveGoal(); if (e.key === 'Escape') setIsEditingGoal(false); }}
                    placeholder={isAr ? 'مثال: أريد أن أكون أكثر إنتاجية' : 'e.g. Become more productive this year'}
                    maxLength={120}
                    style={inlineInputStyle}
                  />
                  <button
                    onClick={handleSaveGoal}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#fff',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      transition: 'opacity 0.15s ease',
                    }}
                  >
                    {savingField === 'goal' ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    ...fieldRowStyle,
                    background: editGoal
                      ? 'linear-gradient(135deg, var(--accent-primary-subtle) 0%, rgba(124,58,237,0.06) 100%)'
                      : 'var(--bg-subtle)',
                  }}
                  onClick={() => setIsEditingGoal(true)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-primary-border)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      {editGoal && <Target size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
                      <span style={{
                        fontSize: 13,
                        fontWeight: editGoal ? 600 : 400,
                        color: editGoal ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontStyle: editGoal ? 'normal' : 'italic',
                      }}>
                        {editGoal || (isAr ? 'حدد هدفك...' : 'Set your goal...')}
                      </span>
                    </div>
                    <span style={{ ...editBtnStyle, flexShrink: 0, marginLeft: 8 }}>
                      <Pencil size={12} />
                      <span>{isAr ? 'تعديل' : 'Edit'}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Real Sync Status Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 
                    syncStatus === 'synced' ? 'var(--status-success)' :
                    syncStatus === 'syncing' ? 'var(--status-warning)' :
                    syncStatus === 'offline' ? 'var(--text-muted)' : 'var(--status-danger)',
                }} />
                <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {syncStatus === 'synced' && (isAr ? 'متزامن مع السحابة' : 'Synced with Cloud')}
                  {syncStatus === 'syncing' && (isAr ? 'جارِ المزامنة...' : 'Syncing changes...')}
                  {syncStatus === 'offline' && (isAr ? 'العمل دون اتصال (محفوظ محلياً)' : 'Offline (saved locally)')}
                  {syncStatus === 'sync_failed' && (isAr ? 'فشلت المزامنة (ستتم إعادة المحاولة)' : 'Sync failed (will retry)')}
                </span>
              </div>
              {syncStatus === 'syncing' && <RefreshCw size={13} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />}
            </div>

            {/* Actions: Sign out / Local mode status */}
            {currentUser && !isGuest ? (
              <>
                <button 
                  onClick={handleLogout}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                >
                  <LogOut size={16} />
                  <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
                </button>

                {/* Account Deletion Danger Zone */}
                <div style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                  {!isConfirmingDelete ? (
                    <button
                      onClick={() => setIsConfirmingDelete(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--status-danger)',
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 0',
                        opacity: 0.8,
                      }}
                    >
                      <Trash2 size={13} />
                      <span>{isAr ? 'حذف الحساب والبيانات نهائياً' : 'Delete Account and Data Permanently'}</span>
                    </button>
                  ) : (
                    <div style={{
                      padding: 12,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--status-danger-bg)',
                      border: '1px solid var(--status-danger-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}>
                      <p style={{ fontSize: 12, color: 'var(--status-danger)', fontWeight: 600, margin: 0 }}>
                        {isAr ? 'هل أنت متأكد؟ سيتم مسح جميع الأنشطة والبيانات نهائياً!' : 'Are you sure? All activities, streak and cloud data will be permanently deleted.'}
                      </p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteLoading}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-xs)',
                            backgroundColor: 'var(--status-danger)',
                            color: '#FFF',
                            border: 'none',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          {deleteLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                          <span>{isAr ? 'تأكيد الحذف النهائي' : 'Confirm Permanent Delete'}</span>
                        </button>
                        <button
                          onClick={() => setIsConfirmingDelete(false)}
                          disabled={deleteLoading}
                          className="btn-ghost"
                          style={{ fontSize: 12, padding: '6px 12px' }}
                        >
                          {isAr ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{
                marginTop: 4,
                padding: '12px 14px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {isAr ? 'ملفك الشخصي يعمل في الوضع المحلي (محفوظ على جهازك).' : 'Profile operating in Local Mode (saved on this device).'}
                </div>
                <button
                  type="button"
                  onClick={() => { setActiveTab('cloud'); setError(null); }}
                  className="btn-ghost"
                  style={{ fontSize: 12, color: 'var(--accent-primary)', flexShrink: 0, padding: '4px 8px', fontWeight: 600 }}
                >
                  {isAr ? 'المزامنة السحابية' : 'Cloud Sync'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {currentUser && !isGuest ? (
              <div style={{
                padding: '16px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {isAr ? 'مسجل الدخول كـ:' : 'Signed in as:'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {currentUser.email}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                >
                  <LogOut size={16} />
                  <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
                </button>
              </div>
            ) : (
              <>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'signup' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    {isAr ? 'الاسم الكامل' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isAr ? 'مثال: أحمد محمد' : 'e.g. Alex Morgan'}
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  {isAr ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              {mode !== 'reset' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {isAr ? 'كلمة المرور' : 'Password'}
                    </label>
                    {mode === 'login' && (
                      <button 
                        type="button" 
                        onClick={() => setMode('reset')}
                        style={{ fontSize: 11, color: 'var(--accent-primary)', padding: 0 }}
                      >
                        {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '10px 16px' }}
              >
                {loading 
                  ? (isAr ? 'جارٍ المعالجة...' : 'Processing...') 
                  : mode === 'login' 
                    ? (isAr ? 'تسجيل الدخول' : 'Sign In') 
                    : mode === 'signup' 
                      ? (isAr ? 'إنشاء حساب جديد' : 'Create Account') 
                      : (isAr ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link')}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, marginTop: 4 }}>
                {mode === 'login' ? (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {isAr ? 'ليس لديك حساب؟' : "Don't have an account?"}
                    </span>
                    <button type="button" onClick={() => setMode('signup')} style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {isAr ? 'إنشاء حساب' : 'Sign Up'}
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {isAr ? 'لديك حساب بالفعل؟' : 'Already have an account?'}
                    </span>
                    <button type="button" onClick={() => setMode('login')} style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                      {isAr ? 'تسجيل الدخول' : 'Sign In'}
                    </button>
                  </>
                )}
              </div>

              <div style={{ textAlign: 'center', margin: '4px 0', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                <button 
                  type="button" 
                  onClick={handleGuestMode} 
                  className="btn-ghost" 
                  style={{ fontSize: 12, color: 'var(--text-secondary)' }}
                >
                  {isAr ? 'المتابعة كزائر (بدون مزامنة سحابية)' : 'Continue as Guest (Local Offline Mode)'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    )}
  </div>
</div>
  );
};
