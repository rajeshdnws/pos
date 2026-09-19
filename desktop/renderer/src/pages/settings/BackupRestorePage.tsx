import React, { useEffect, useState } from 'react';
import {
  HardDriveDownload,
  Database,
  FolderOpen,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileUp,
  RotateCcw,
} from 'lucide-react';
import { BackupFileInfo, BackupCreateResult, RestoreResult } from '@rs-inventory/types';
import { useNotificationStore } from '../../store/notificationStore';

export const BackupRestorePage: React.FC = () => {
  const { notify } = useNotificationStore();

  const [backups, setBackups] = useState<BackupFileInfo[]>([]);
  const [customBackupDir, setCustomBackupDir] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackupResult, setLastBackupResult] = useState<BackupCreateResult | null>(null);
  const [lastRestoreResult, setLastRestoreResult] = useState<RestoreResult | null>(null);

  // Restore Confirmation Modal
  const [candidateToRestore, setCandidateToRestore] = useState<string | null>(null);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.listBackups();
        if (res.success && res.data) {
          setBackups(res.data);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleChooseDirectory = async () => {
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.chooseBackupDirectory();
        if (res.success && res.data) {
          setCustomBackupDir(res.data);
        }
      }
    } catch (err: any) {
      notify('error', err?.message || 'Failed to select directory.');
    }
  };

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setLastBackupResult(null);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.createBackup(customBackupDir || undefined);
        if (res.success && res.data) {
          setLastBackupResult(res.data);
          notify('success', 'SQLite database backup completed successfully.');
          await loadBackups();
        } else {
          notify('error', res.error?.message || 'Database backup failed.');
        }
      }
    } catch (err: any) {
      notify('error', err?.message || 'Backup operation error.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleChooseFileAndRestore = async () => {
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.chooseBackupFile();
        if (res.success && res.data) {
          setCandidateToRestore(res.data);
        }
      }
    } catch (err: any) {
      notify('error', err?.message || 'Failed to select backup file.');
    }
  };

  const executeRestore = async () => {
    if (!candidateToRestore) return;
    setIsRestoring(true);
    setLastRestoreResult(null);
    try {
      if (typeof window !== 'undefined' && window.rsInventory) {
        const res = await window.rsInventory.restoreBackup(candidateToRestore);
        if (res.success && res.data) {
          setLastRestoreResult(res.data);
          setCandidateToRestore(null);
          notify('success', 'Database restored successfully! Active data reloaded.');
          await loadBackups();
        } else {
          notify('error', res.error?.message || 'Restore verification failed.');
        }
      }
    } catch (err: any) {
      notify('error', err?.message || 'Database restore error.');
    } finally {
      setIsRestoring(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <HardDriveDownload className="h-6 w-6 text-brand-400" />
            Database Backup & Disaster Recovery
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Perform zero-downtime SQLite WAL checkpoints, generate consistent offline database archives, and restore historical snapshots.
          </p>
        </div>
        <button
          type="button"
          onClick={loadBackups}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-semibold border border-surface-700 transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Backups
        </button>
      </div>

      {/* Backup Creation Card */}
      <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-surface-800 pb-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Database className="h-4 w-4 text-brand-400" />
            Create Instant SQLite Snapshot
          </h2>
          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Full WAL Checkpointing Enabled
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Backup Destination Directory (Optional Custom Path)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={customBackupDir || 'Default AppData / Backups directory'}
                placeholder="Default AppData / Backups directory"
                className="w-full px-3.5 py-2 rounded-xl bg-surface-950 border border-surface-700 text-xs text-slate-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleChooseDirectory}
                className="px-3.5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-medium border border-surface-700 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <FolderOpen className="h-4 w-4 text-brand-400" />
                Browse
              </button>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              You can save backups directly to an external USB flash drive or secondary hard drive.
            </span>
          </div>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={isBackingUp}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <HardDriveDownload className={`h-4 w-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
              {isBackingUp ? 'Checkpointing & Copying...' : 'Create Full Backup Now'}
            </button>
          </div>
        </div>

        {lastBackupResult && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Backup Created Successfully
            </div>
            <p className="text-[11px] text-emerald-400/90 break-all">
              Path: {lastBackupResult.filePath} ({formatBytes(lastBackupResult.sizeBytes)})
            </p>
          </div>
        )}
      </div>

      {/* Restore Database Card */}
      <div className="rounded-2xl bg-surface-900/70 border border-surface-800 p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-surface-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-400" />
              Restore Database from File
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select an external SQLite .db backup file to restore application state.
            </p>
          </div>
          <button
            type="button"
            onClick={handleChooseFileAndRestore}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-200 text-xs font-semibold border border-surface-700 transition-colors cursor-pointer"
          >
            <FileUp className="h-4 w-4 text-amber-400" />
            Select Backup File...
          </button>
        </div>

        {lastRestoreResult && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              Database Restored Successfully
            </div>
            <p className="text-[11px] text-emerald-400/90">
              Verified {lastRestoreResult.restoredTablesCount || 20}+ system tables. Safety copy saved to:
              <span className="block break-all mt-0.5 font-mono text-[10px] text-slate-300">
                {lastRestoreResult.safetyBackupPath}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Available Backups Table */}
      <div className="rounded-2xl bg-surface-900/70 border border-surface-800 overflow-hidden">
        <div className="p-5 border-b border-surface-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-400" />
            Existing Local Backups ({backups.length})
          </h2>
          <span className="text-[11px] text-slate-400">Stored in application backup directory</span>
        </div>

        {backups.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No backup files found yet. Click "Create Full Backup Now" above to generate your first snapshot.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-surface-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-surface-800">
                <tr>
                  <th className="px-5 py-3">Filename</th>
                  <th className="px-5 py-3">File Size</th>
                  <th className="px-5 py-3">Created At</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800/50">
                {backups.map((b) => (
                  <tr key={b.filePath} className="hover:bg-surface-800/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white flex items-center gap-2">
                      <Database className="h-4 w-4 text-brand-400 shrink-0" />
                      <span className="truncate max-w-xs">{b.filename}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{formatBytes(b.sizeBytes)}</td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {new Date(b.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setCandidateToRestore(b.filePath)}
                        className="px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-amber-950/60 hover:text-amber-300 text-slate-300 text-[11px] font-semibold border border-surface-700 hover:border-amber-700/50 transition-colors cursor-pointer"
                      >
                        Restore Snapshot
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restore Confirmation Safeguard Modal */}
      {candidateToRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-surface-900 border border-amber-500/40 shadow-2xl p-6 space-y-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-base font-bold text-white">Confirm Database Restore</h3>
                <p className="text-xs text-slate-400 mt-1">
                  You are about to restore the database from an archive.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-950 border border-surface-800 text-xs text-slate-300 space-y-2">
              <div className="text-[11px] text-slate-400">Selected Candidate:</div>
              <div className="font-mono text-xs text-amber-300 break-all">{candidateToRestore}</div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Automatic Safety Pre-Backup
              </div>
              <p className="text-[11px] text-slate-400">
                The system will automatically snapshot your current database before replacing it. If the candidate file fails schema or integrity verification, the restore is cancelled and your active data remains untouched.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-800">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setCandidateToRestore(null)}
                className="px-4 py-2 rounded-xl bg-surface-800 hover:bg-surface-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={executeRestore}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 flex items-center gap-2 cursor-pointer"
              >
                {isRestoring ? 'Restoring & Verifying...' : 'Yes, Restore Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
