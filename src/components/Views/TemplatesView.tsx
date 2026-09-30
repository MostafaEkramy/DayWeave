import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatMinutesDuration } from '../../utils/timeUtils';
import { formatDateTitle } from '../../utils/dateUtils';
import { CATEGORY_DEFINITIONS } from '../../types/activity';
import { ScheduleTemplate } from '../../types/template';
import { 
  Plus, 
  ArrowRight,
  ArrowLeft,
  X,
  Trash2,
  Edit2,
  Check,
  Calendar,
  AlertTriangle
} from 'lucide-react';

export const TemplatesView: React.FC = () => {
  const { 
    templates, 
    applyTemplate, 
    selectedDate, 
    todayActivities,
    saveDayAsTemplate, 
    deleteTemplate,
    updateTemplate,
  } = useApp();
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();

  // Save new template modal
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTag, setNewTag] = useState('Productivity');

  // Edit template modal
  const [editingTmpl, setEditingTmpl] = useState<ScheduleTemplate | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTag, setEditTag] = useState('');

  // Apply confirmation dialog
  const [applyingTmpl, setApplyingTmpl] = useState<ScheduleTemplate | null>(null);
  const [applyMode, setApplyMode] = useState<'replace' | 'merge'>('replace');

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenEdit = (tmpl: ScheduleTemplate) => {
    setEditingTmpl(tmpl);
    setEditTitle(tmpl.title);
    setEditDescription(tmpl.description || '');
    setEditTag(tmpl.tag || 'Custom');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTmpl || !editTitle.trim()) return;
    updateTemplate(editingTmpl.id, {
      title: editTitle.trim(),
      description: editDescription.trim(),
      tag: editTag.trim() || 'Custom',
    });
    setEditingTmpl(null);
  };

  const handleConfirmApply = () => {
    if (!applyingTmpl) return;
    applyTemplate(applyingTmpl.id, selectedDate, applyMode);
    setApplyingTmpl(null);
    navigate('/');
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    saveDayAsTemplate(newTitle.trim(), newDescription.trim(), newTag);
    setIsSavingTemplate(false);
    setNewTitle('');
    setNewDescription('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Banner: Save Today or Apply */}
      <div 
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '16px 20px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {t('templates.title')}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {t('templates.description')} ({formatDateTitle(selectedDate, language)})
          </p>
        </div>

        <button
          onClick={() => setIsSavingTemplate(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
        >
          <Plus size={15} />
          <span>{t('templates.saveCurrentDay')}</span>
        </button>
      </div>

      {/* Save Today Modal Dialog */}
      {isSavingTemplate && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 'var(--z-modal)',
            padding: 16,
          }}
          onClick={() => setIsSavingTemplate(false)}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              boxShadow: 'var(--shadow-modal)',
            }}
            className="animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{t('templates.saveAsTemplate')}</h4>
              <button onClick={() => setIsSavingTemplate(false)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {t('templates.templateName')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={t('templates.placeholder.name')}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    marginTop: 6,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {t('templates.tag')}
                </label>
                <input
                  type="text"
                  placeholder={t('templates.placeholder.tag')}
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    marginTop: 6,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {t('templates.descriptionLabel')}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('templates.placeholder.notes')}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    marginTop: 6,
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setIsSavingTemplate(false)} className="btn-ghost">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Template Modal Dialog */}
      {editingTmpl && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 'var(--z-modal)',
            padding: 16,
          }}
          onClick={() => setEditingTmpl(null)}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              boxShadow: 'var(--shadow-modal)',
            }}
            className="animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{t('templates.editTemplate')}</h4>
              <button onClick={() => setEditingTmpl(null)} className="btn-icon">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {t('templates.templateTitle')} *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    marginTop: 6,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {t('templates.tag')}
                </label>
                <input
                  type="text"
                  value={editTag}
                  onChange={e => setEditTag(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    marginTop: 6,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {t('templates.descriptionLabel')}
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    marginTop: 6,
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" onClick={() => setEditingTmpl(null)} className="btn-ghost">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Apply Confirmation Dialog (Replace vs Merge) */}
      {applyingTmpl && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 'var(--z-modal)',
            padding: 16,
          }}
          onClick={() => setApplyingTmpl(null)}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              boxShadow: 'var(--shadow-modal)',
            }}
            className="animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Calendar size={20} style={{ color: 'var(--accent-primary)' }} />
              <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('templates.applyConfirmTitle').replace('{title}', applyingTmpl.title).replace('{date}', formatDateTitle(selectedDate, language))}
              </h4>
            </div>

            {todayActivities.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--status-warning-bg)',
                border: '1px solid var(--status-warning-border)',
                marginBottom: 16,
                fontSize: 12,
                color: 'var(--status-warning)',
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{t('templates.existingTasksWarning').replace('{count}', String(todayActivities.length))}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${applyMode === 'replace' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                backgroundColor: applyMode === 'replace' ? 'var(--bg-subtle)' : 'transparent',
                cursor: 'pointer',
              }}>
                <input
                  type="radio"
                  name="applyMode"
                  checked={applyMode === 'replace'}
                  onChange={() => setApplyMode('replace')}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t('templates.replaceEntireDay')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t('templates.replaceDesc').replace('{date}', formatDateTitle(selectedDate, language))}
                  </div>
                </div>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${applyMode === 'merge' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                backgroundColor: applyMode === 'merge' ? 'var(--bg-subtle)' : 'transparent',
                cursor: 'pointer',
              }}>
                <input
                  type="radio"
                  name="applyMode"
                  checked={applyMode === 'merge'}
                  onChange={() => setApplyMode('merge')}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t('templates.mergeWithExisting')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t('templates.mergeDesc')}
                  </div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={() => setApplyingTmpl(null)} className="btn-ghost">
                {t('common.cancel')}
              </button>
              <button type="button" onClick={handleConfirmApply} className="btn-primary">
                {t('templates.confirmApply')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Template Cards Grid */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {templates.map(tmpl => (
          <div
            key={tmpl.id}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
            }}
          >
            <div>
              {/* Header: Tag, Title, Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                  <span 
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--accent-primary)',
                      backgroundColor: 'var(--bg-subtle)',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-xs)',
                    }}
                  >
                    {tmpl.tag || 'Routine'}
                  </span>
                  <h4 style={{ fontSize: 16, fontWeight: 700, marginTop: 6, color: 'var(--text-primary)' }}>
                    {tmpl.title}
                  </h4>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => handleOpenEdit(tmpl)}
                    className="btn-icon-subtle"
                    title="Edit Template"
                    style={{ width: 26, height: 26 }}
                  >
                    <Edit2 size={13} />
                  </button>

                  {deletingId === tmpl.id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <button
                        onClick={() => { deleteTemplate(tmpl.id); setDeletingId(null); }}
                        className="btn-icon-subtle"
                        style={{ width: 26, height: 26, color: 'var(--status-danger)', backgroundColor: 'var(--status-danger-bg)' }}
                        title="Confirm Delete"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="btn-icon-subtle"
                        style={{ width: 26, height: 26 }}
                        title="Cancel"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(tmpl.id)}
                      className="btn-icon-subtle"
                      title="Delete Template"
                      style={{ width: 26, height: 26, color: 'var(--status-danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {tmpl.description && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                  {tmpl.description}
                </p>
              )}

              {/* Activity count & Planned hours */}
              <div 
                style={{
                  display: 'flex',
                  gap: 12,
                  marginTop: 12,
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                }}
              >
                <span>{tmpl.activities.length} {t('templates.tasksCount')}</span>
                <span>•</span>
                <span>{formatMinutesDuration(tmpl.totalPlannedMinutes)} {t('templates.totalLabel')}</span>
              </div>

              {/* Activities Mini Preview List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
                {tmpl.activities.slice(0, 4).map(item => {
                  const cat = CATEGORY_DEFINITIONS[item.category] || CATEGORY_DEFINITIONS.work;
                  return (
                    <div 
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        padding: '4px 6px',
                        borderLeft: isRTL ? undefined : `3px solid ${cat.accentColor}`,
                        borderRight: isRTL ? `3px solid ${cat.accentColor}` : undefined,
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {item.startTime} ({item.durationMinutes}m)
                      </span>
                    </div>
                  );
                })}
                {tmpl.activities.length > 4 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: isRTL ? undefined : 6, paddingRight: isRTL ? 6 : undefined }}>
                    + {tmpl.activities.length - 4} {t('templates.moreActivities')}...
                  </span>
                )}
              </div>
            </div>

            {/* Apply Button */}
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setApplyingTmpl(tmpl)}
                className="btn-secondary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: 13,
                  gap: 6,
                }}
              >
                <span>{t('templates.applyToDate')}</span>
                {isRTL ? <ArrowLeft size={14} /> : <ArrowRight size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
