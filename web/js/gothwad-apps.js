import { GOTHWAD_CONFIG } from './config.js';
const domain = GOTHWAD_CONFIG.APP_DOMAIN;
/**
 * Bansify product catalog (Accounts dashboard).
 * Core = First-party Bansify Services: automatically enabled with the account, non-revocable.
 * Others = Connected apps using Sign in with Bansify: revocable at any time.
 */

export const GOTHWAD_SERVICES = [
  {
    id: 'gothwad-meet',
    name: 'Bansify Meet',
    url: `https://meet.${domain}`,
    icon: 'video',
    description: 'Video meetings for your Bansify Account',
  },
  {
    id: 'gothwad-mail',
    name: 'Bansify Mail',
    url: `https://mail.${domain}`,
    icon: 'mail',
    description: `Your account address at ${domain}; mailbox availability is managed by Mail`,
  },
  {
    id: 'kiwi-store',
    name: 'Kiwi Store',
    url: `https://kiwistore.${domain}`,
    icon: 'store',
    description: 'Apps and add-ons for Kiwi Store',
  },
  {
    id: 'gothwad-drive',
    name: 'Bansify Drive',
    url: `https://drive.${domain}`,
    icon: 'hard-drive',
    description: 'Files and folders on your account',
  },
  {
    id: 'gothwad-notes',
    name: 'Bansify Notes',
    url: `https://notes.${domain}`,
    icon: 'file-text',
    description: 'Notes and lists, synced',
  },
  {
    id: 'gothwad-calendar',
    name: 'Bansify Calendar',
    url: `https://calender.${domain}`,
    icon: 'calendar',
    description: 'Events and reminders',
  },
  {
    id: 'gothwad-contacts',
    name: 'Bansify Contacts',
    url: `https://contacts.${domain}`,
    icon: 'users',
    description: 'People and addresses',
  },
];

export const GOTHWAD_PRODUCTS = [
  {
    id: 'gothwad-tube',
    name: 'Bansify Tube (PlusTube)',
    url: `https://tube.${domain}`,
    icon: 'play',
    description: 'Video — PlusTube',
  },
  {
    id: 'gothwad-chat',
    name: 'GrixChat (Bansify Chat)',
    url: `https://grixchat.${domain}`,
    icon: 'message-circle',
    description: 'Messaging',
  },
  {
    id: 'gothwad-indogram',
    name: 'Indogram',
    url: `https://indogram.${domain}`,
    icon: 'send',
    description: 'Telegram-style chat',
  },
];

export const BANSIFY_SERVICES = GOTHWAD_SERVICES;
export const BANSIFY_PRODUCTS = GOTHWAD_PRODUCTS;
export const CORE_APP_IDS = GOTHWAD_SERVICES.map((a) => a.id);

export function isCoreApp(id) {
  return CORE_APP_IDS.includes(id);
}
