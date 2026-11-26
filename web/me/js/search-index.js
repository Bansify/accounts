/** Search describes only available settings, with explicit destinations and common synonyms. */
export const SETTINGS_INDEX = [
  { title: 'Google accounts', sub: 'Security · Sign-in methods', keywords: 'gmail connect linked google login', icon: 'account_circle', section: 'security', shellTab: 'security', target: 'btn-google-settings', action: 'google' },
  { title: 'Passkeys', sub: 'Security · Sign-in methods', keywords: 'fingerprint face biometric security key passwordless', icon: 'key', section: 'security', shellTab: 'security', target: 'btn-passkey-settings', action: 'passkeys' },
  { title: 'Change your name', sub: 'Profile & photo · Profile', keywords: 'first last surname display name', icon: 'person', section: 'personal', shellTab: 'personal', dialog: 'name' },
  { title: 'Change your photo', sub: 'Profile & photo · Profile', keywords: 'avatar picture image crop profile', icon: 'photo_camera', section: 'personal', shellTab: 'personal', dialog: 'photo' },
  { title: 'Date of birth', sub: 'Profile & photo · Optional details', keywords: 'birthday dob age birth date', icon: 'cake', section: 'personal', shellTab: 'personal', dialog: 'dob' },
  { title: 'Gender', sub: 'Profile & photo · Optional details', keywords: 'optional male female', icon: 'diversity_3', section: 'personal', shellTab: 'personal', dialog: 'gender' },
  { title: 'Phone number', sub: 'Contact info · Sign-in identifier', keywords: 'mobile telephone number sms', icon: 'call', section: 'personal', shellTab: 'contact', dialog: 'phone' },
  { title: 'Recovery email', sub: 'Contact info · Account recovery', keywords: 'backup email address verify recovery', icon: 'mark_email_read', section: 'personal', shellTab: 'contact', dialog: 'recovery' },
  { title: 'Account email address', sub: 'Contact info · Fixed identifier', keywords: 'bansify gothwad email username mailbox address', icon: 'alternate_email', section: 'personal', shellTab: 'contact', target: 'pi-email' },
  { title: 'Add or change password', sub: 'Security · Sign-in methods', keywords: 'password reset update login', icon: 'password', section: 'security', shellTab: 'security', dialog: 'password' },
  { title: '2-Step Verification', sub: 'Security · Authenticator', keywords: '2fa mfa two factor two step authenticator otp totp verification', icon: 'phonelink_lock', section: 'security', shellTab: 'security', target: 'btn-mfa-settings', action: 'mfa' },
  { title: 'Recent security activity', sub: 'Activity log · Sign-in history', keywords: 'login history events activity', icon: 'history', section: 'data', shellTab: 'activity', target: 'dp-activity' },
  { title: 'Your devices', sub: 'Your devices · Active sessions', keywords: 'sessions browsers computers phones device', icon: 'devices', section: 'security', shellTab: 'devices', target: 'device-list' },
  { title: 'Sign out other devices', sub: 'Your devices · Active sessions', keywords: 'logout revoke sessions other devices', icon: 'logout', section: 'security', shellTab: 'devices', target: 'btn-revoke-others' },
  { title: 'Storage', sub: 'Storage · Shared quota', keywords: 'space quota drive mail usage', icon: 'cloud', section: 'data', shellTab: 'storage', target: 'dp-storage-card' },
  { title: 'Export your data', sub: 'Data & privacy · Account data', keywords: 'download export backup account data', icon: 'download', section: 'data', shellTab: 'data', target: 'btn-export' },
  { title: 'Delete your account', sub: 'Data & privacy · Account data', keywords: 'remove close erase delete account', icon: 'warning', section: 'data', shellTab: 'data', dialog: 'delete' },
  { title: 'Profile visibility', sub: 'Profile & photo · Sharing information', keywords: 'public private privacy sharing visibility', icon: 'person', section: 'personal', shellTab: 'personal', target: 'profile-visibility' },
  { title: 'Home', sub: 'Overview', keywords: 'dashboard overview home', icon: 'home', section: 'home', shellTab: 'home' },
];
const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function findSettings(query) {
  const q = normalize(query);
  if (!q) return [];
  return SETTINGS_INDEX.filter(item => {
    const text = normalize(`${item.title} ${item.sub} ${item.keywords}`);
    return q.split(/\s+/).every(token => text.includes(token));
  }).sort((a, b) => Number(normalize(b.title).startsWith(q)) - Number(normalize(a.title).startsWith(q))).slice(0, 8);
}
