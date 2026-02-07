'use client';

import { useState } from 'react';
import { Settings, User, Lock, Bell, Loader2, CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface ProfileFormData {
  fullName: string;
  email: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [studyAlerts, setStudyAlerts] = useState(true);

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      fullName: user?.user_metadata?.full_name || '',
      email: user?.email || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  async function handleProfileSave(data: ProfileFormData) {
    setProfileSaving(true);
    setProfileSaved(false);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: data.fullName },
      });

      if (!error) {
        setProfileSaved(true);
        setTimeout(() => setProfileSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
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
    } catch (err) {
      setPasswordError('Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient text-[#0F1B2D]">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-gold-gradient">
            Settings
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Manage your account and preferences
          </p>
        </div>
      </div>

      {/* Profile Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <User className="h-5 w-5 text-[#C9A84C]" />
          <h2 className="text-lg font-semibold text-white">Profile</h2>
        </div>

        <form
          onSubmit={profileForm.handleSubmit(handleProfileSave)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Full Name</Label>
            <Input
              {...profileForm.register('fullName')}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Email</Label>
            <Input
              {...profileForm.register('email')}
              disabled
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-[#64748B] cursor-not-allowed"
            />
            <p className="text-xs text-[#64748B]">
              Email cannot be changed here. Contact support if needed.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={profileSaving}
              className="bg-gold-gradient text-[#0F1B2D] hover:opacity-90 font-semibold"
            >
              {profileSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Save Profile
            </Button>
            {profileSaved && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="h-5 w-5 text-[#C9A84C]" />
          <h2 className="text-lg font-semibold text-white">Change Password</h2>
        </div>

        <form
          onSubmit={passwordForm.handleSubmit(handlePasswordSave)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Current Password</Label>
            <Input
              type="password"
              {...passwordForm.register('currentPassword')}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#94A3B8]">New Password</Label>
            <Input
              type="password"
              {...passwordForm.register('newPassword')}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#94A3B8]">Confirm New Password</Label>
            <Input
              type="password"
              {...passwordForm.register('confirmPassword')}
              className="bg-[#0F1B2D] border-[rgba(201,168,76,0.15)] text-white focus:border-[#C9A84C]"
            />
          </div>

          {passwordError && (
            <p className="text-sm text-red-400">{passwordError}</p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={passwordSaving}
              className="bg-gold-gradient text-[#0F1B2D] hover:opacity-90 font-semibold"
            >
              {passwordSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Update Password
            </Button>
            {passwordSaved && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Updated
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Preferences Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="h-5 w-5 text-[#C9A84C]" />
          <h2 className="text-lg font-semibold text-white">Preferences</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Email Notifications</p>
              <p className="text-xs text-[#64748B]">
                Receive email updates about your account activity
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <Separator className="bg-[rgba(201,168,76,0.1)]" />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Study Completion Alerts</p>
              <p className="text-xs text-[#64748B]">
                Get notified when a cost seg study is completed
              </p>
            </div>
            <Switch
              checked={studyAlerts}
              onCheckedChange={setStudyAlerts}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
