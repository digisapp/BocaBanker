'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Settings, User, Lock, Bell, Landmark, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import PageHeader from '@/components/shared/PageHeader';

interface ProfileFormData {
  fullName: string;
  email: string;
}

interface PasswordFormData {
  newPassword: string;
  confirmPassword: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Message from a failed /api/settings call, preferring a field-specific one. */
async function readSettingsError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  const fieldErrors: Record<string, string[] | undefined> | undefined =
    data?.details?.fieldErrors;
  const fieldMessage = fieldErrors
    ? Object.values(fieldErrors).flat().find((m) => typeof m === 'string')
    : undefined;
  return fieldMessage || (typeof data?.error === 'string' ? data.error : '') || fallback;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // New lead alerts: the switch saves on toggle, the address with its button
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [notifyNewLeads, setNotifyNewLeads] = useState(true);
  const [notifySaving, setNotifySaving] = useState(false);
  const [leadAlertEmail, setLeadAlertEmail] = useState('');
  const [savedLeadAlertEmail, setSavedLeadAlertEmail] = useState('');
  const [leadEmailError, setLeadEmailError] = useState('');
  const [leadEmailSaving, setLeadEmailSaving] = useState(false);
  const [leadEmailSaved, setLeadEmailSaved] = useState(false);

  // Mortgage settings
  const [ariveLink, setAriveLink] = useState('');
  const [ariveCompanyName, setAriveCompanyName] = useState('');
  const [rateAlertEnabled, setRateAlertEnabled] = useState(false);
  const [rateAlertThresholdBps, setRateAlertThresholdBps] = useState('25');
  const [mortgageSaving, setMortgageSaving] = useState(false);
  const [mortgageSaved, setMortgageSaved] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setAriveLink(data.ariveLink || '');
          setAriveCompanyName(data.ariveCompanyName || '');
          setRateAlertEnabled(data.rateAlertEnabled || false);
          setRateAlertThresholdBps(data.rateAlertThresholdBps?.toString() || '25');
          setNotifyNewLeads(data.notifyNewLeads ?? true);
          setLeadAlertEmail(data.leadAlertEmail || '');
          setSavedLeadAlertEmail(data.leadAlertEmail || '');
        }
      } catch {
        // Settings may not exist yet — that's fine
      } finally {
        setSettingsLoaded(true);
      }
    }
    loadSettings();
  }, []);

  /** PUT is partial: only the keys sent are changed. */
  async function saveSettings(changes: Record<string, unknown>, fallbackError: string) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    });
    if (!res.ok) throw new Error(await readSettingsError(res, fallbackError));
  }

  async function handleNotifyNewLeadsChange(checked: boolean) {
    // Optimistic: flip now, roll back if the save fails
    setNotifyNewLeads(checked);
    setNotifySaving(true);
    try {
      await saveSettings({ notifyNewLeads: checked }, 'Failed to save lead alerts');
      toast.success(checked ? 'New lead alerts on' : 'New lead alerts off');
    } catch (err) {
      setNotifyNewLeads(!checked);
      logger.error('settings-page', 'Failed to save lead alert preference', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save lead alerts');
    } finally {
      setNotifySaving(false);
    }
  }

  async function handleLeadAlertEmailSave(e: React.FormEvent) {
    e.preventDefault();
    const email = leadAlertEmail.trim();
    if (email && (email.length > 200 || !EMAIL_RE.test(email))) {
      setLeadEmailError('Enter a valid email address, or leave it blank');
      return;
    }
    setLeadEmailError('');
    setLeadEmailSaving(true);
    setLeadEmailSaved(false);
    try {
      // Empty means "use the account email", stored as null
      await saveSettings({ leadAlertEmail: email || null }, 'Failed to save alert email');
      setLeadAlertEmail(email);
      setSavedLeadAlertEmail(email);
      setLeadEmailSaved(true);
      setTimeout(() => setLeadEmailSaved(false), 3000);
    } catch (err) {
      logger.error('settings-page', 'Failed to save lead alert email', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save alert email');
    } finally {
      setLeadEmailSaving(false);
    }
  }

  async function handleMortgageSettingsSave() {
    setMortgageSaving(true);
    setMortgageSaved(false);
    try {
      // Surfaces the server's message (e.g. which field failed validation)
      await saveSettings(
        {
          ariveLink: ariveLink || null,
          ariveCompanyName: ariveCompanyName || null,
          rateAlertEnabled,
          rateAlertThresholdBps: rateAlertThresholdBps ? Number(rateAlertThresholdBps) : null,
        },
        'Failed to save mortgage settings'
      );
      setMortgageSaved(true);
      setTimeout(() => setMortgageSaved(false), 3000);
    } catch (err) {
      logger.error('settings-page', 'Failed to save mortgage settings', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save mortgage settings');
    } finally {
      setMortgageSaving(false);
    }
  }

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      fullName: user?.user_metadata?.full_name || '',
      email: user?.email || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Prefill the profile form once the user loads (defaultValues capture
  // user=null on a hard reload, so reset when the user becomes available).
  // Keyed on the user id (token refreshes emit a new User object) and skipped
  // once the user has started editing, so typing isn't clobbered.
  const userId = user?.id;
  const userFullName = user?.user_metadata?.full_name || '';
  const userEmail = user?.email || '';
  useEffect(() => {
    if (userId && !profileForm.formState.isDirty) {
      profileForm.reset({ fullName: userFullName, email: userEmail });
    }
  }, [userId, userFullName, userEmail, profileForm]);

  async function handleProfileSave(data: ProfileFormData) {
    setProfileSaving(true);
    setProfileSaved(false);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: data.fullName },
      });

      if (error) throw error;
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      logger.error('settings-page', 'Failed to update profile', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(data: PasswordFormData) {
    setPasswordSaving(true);
    setPasswordSaved(false);
    setPasswordError('');

    if (data.newPassword !== data.confirmPassword) {
      setPasswordError('Passwords do not match');
      setPasswordSaving(false);
      return;
    }

    if (data.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setPasswordSaving(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSaved(true);
        passwordForm.reset();
        setTimeout(() => setPasswordSaved(false), 3000);
      }
    } catch {
      setPasswordError('Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Page Header */}
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Manage your account and preferences"
      />

      {/* Profile Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        </div>

        <form
          onSubmit={profileForm.handleSubmit(handleProfileSave)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="settings-full-name" className="text-gray-500">Full Name</Label>
            <Input
              id="settings-full-name"
              {...profileForm.register('fullName')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-email" className="text-gray-500">Email</Label>
            <Input
              id="settings-email"
              {...profileForm.register('email')}
              disabled
              className="bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400">
              Email cannot be changed here. Contact support if needed.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={profileSaving}
              className="bg-navy text-white hover:bg-navy-light font-semibold"
            >
              {profileSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Profile
            </Button>
            {profileSaved && (
              <span className="flex items-center gap-1 text-sm text-emerald-500">
                <CheckCircle className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
        </div>

        <form
          onSubmit={passwordForm.handleSubmit(handlePasswordSave)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="settings-new-password" className="text-gray-500">New Password</Label>
            <Input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('newPassword')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-confirm-new-password" className="text-gray-500">Confirm New Password</Label>
            <Input
              id="settings-confirm-new-password"
              type="password"
              autoComplete="new-password"
              {...passwordForm.register('confirmPassword')}
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
          </div>

          {passwordError && (
            <p className="text-sm text-red-500">{passwordError}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={passwordSaving}
              className="bg-navy text-white hover:bg-navy-light font-semibold"
            >
              {passwordSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Update Password
            </Button>
            {passwordSaved && (
              <span className="flex items-center gap-1 text-sm text-emerald-500">
                <CheckCircle className="h-4 w-4" />
                Updated
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Mortgage & Arive Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Landmark className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900">Mortgage & Arive</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="settings-arive-application-link" className="text-gray-500">Arive Application Link</Label>
            <Input
              id="settings-arive-application-link"
              type="url"
              value={ariveLink}
              onChange={(e) => setAriveLink(e.target.value)}
              placeholder="https://apply.arive.com/your-nmls"
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
            <p className="text-xs text-gray-400">
              Your Arive POS link that borrowers use to apply
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-company-name" className="text-gray-500">Company Name</Label>
            <Input
              id="settings-company-name"
              value={ariveCompanyName}
              onChange={(e) => setAriveCompanyName(e.target.value)}
              placeholder="Your Brokerage Name"
              className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20"
            />
            <p className="text-xs text-gray-400">
              Used in email templates sent to borrowers
            </p>
          </div>

          <Separator className="bg-gray-200" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-900">Rate Drop Alerts</p>
              <p className="text-xs text-gray-400">
                Get notified when mortgage rates drop significantly
              </p>
            </div>
            <Switch
              aria-label="Rate drop alerts"
              checked={rateAlertEnabled}
              onCheckedChange={setRateAlertEnabled}
            />
          </div>

          {rateAlertEnabled && (
            <div className="space-y-2 pl-0">
              <Label htmlFor="settings-alert-threshold-basis-points" className="text-gray-500">Alert Threshold (basis points)</Label>
              <Input
                id="settings-alert-threshold-basis-points"
                type="number"
                inputMode="numeric"
                value={rateAlertThresholdBps}
                onChange={(e) => setRateAlertThresholdBps(e.target.value)}
                placeholder="25"
                min={5}
                max={200}
                className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20 w-32"
              />
              <p className="text-xs text-gray-400">
                Alert when rate drops by this many bps (25 = 0.25%)
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              disabled={mortgageSaving}
              onClick={handleMortgageSettingsSave}
              className="bg-navy text-white hover:bg-navy-light font-semibold"
            >
              {mortgageSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Mortgage Settings
            </Button>
            {mortgageSaved && (
              <span className="flex items-center gap-1 text-sm text-emerald-500">
                <CheckCircle className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-900">New lead alerts</p>
              <p className="text-xs text-gray-400">
                Get an email when a lead comes in from the website chat, contact form, or phone.
              </p>
            </div>
            <Switch
              aria-label="New lead alerts"
              checked={notifyNewLeads}
              onCheckedChange={handleNotifyNewLeadsChange}
              disabled={!settingsLoaded || notifySaving}
            />
          </div>

          {notifyNewLeads && (
            <form onSubmit={handleLeadAlertEmailSave} noValidate className="space-y-2">
              <Label htmlFor="settings-lead-alert-email" className="text-gray-500">
                Send alerts to
              </Label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  id="settings-lead-alert-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={leadAlertEmail}
                  onChange={(e) => {
                    setLeadAlertEmail(e.target.value);
                    if (leadEmailError) setLeadEmailError('');
                  }}
                  placeholder={user?.email || 'you@example.com'}
                  disabled={!settingsLoaded}
                  aria-invalid={leadEmailError ? true : undefined}
                  aria-describedby="settings-lead-alert-email-hint"
                  className="bg-gray-50 border-gray-200 text-gray-900 focus:border-amber-500 focus:ring-amber-500/20 sm:flex-1"
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    disabled={
                      !settingsLoaded ||
                      leadEmailSaving ||
                      leadAlertEmail.trim() === savedLeadAlertEmail
                    }
                    className="bg-navy text-white hover:bg-navy-light font-semibold"
                  >
                    {leadEmailSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Save
                  </Button>
                  {leadEmailSaved && (
                    <span className="flex items-center gap-1 text-sm text-emerald-500">
                      <CheckCircle className="h-4 w-4" />
                      Saved
                    </span>
                  )}
                </div>
              </div>
              {leadEmailError ? (
                <p id="settings-lead-alert-email-hint" className="text-xs text-red-500">
                  {leadEmailError}
                </p>
              ) : (
                <p id="settings-lead-alert-email-hint" className="text-xs text-gray-400">
                  Optional. Leave blank to use your account email.
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
