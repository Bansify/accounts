/**
 * Gothwad product catalog (Accounts dashboard).
 * Core = First-party Gothwad Services: automatically enabled with the account, non-revocable.
 * Others = Connected apps using Sign in with Gothwad: revocable at any time.
 */

export const GOTHWAD_SERVICES = [
  {
    id: 'gothwad-meet',
    name: 'Bansify Meet',
    url: 'https://meet.gothwadtech.com',
    icon: 'video',
    description: 'Video meetings for your Bansify Account',
  },
  {
    id: 'gothwad-mail',
    name: 'Bansify Email',
    url: 'https://mail.gothwadtech.com',
    icon: 'mail',
    description: 'username@gothwadtech.com inbox',
  },
  {
    id: 'kiwi-store',
    name: 'Kiwi Store',
    url: 'https://kiwistore.gothwadtech.com',
    icon: 'store',
    description: 'Apps and add-ons for Kiwi Store',
  },
  {
    id: 'gothwad-drive',
    name: 'Bansify Drive',
    url: 'https://drive.gothwadtech.com',
    icon: 'hard-drive',
    description: 'Files and folders on your account',
  },
  {
    id: 'gothwad-notes',
    name: 'Bansify Notes',
    url: 'https://notes.gothwadtech.com',
    icon: 'file-text',
    description: 'Notes and lists, synced',
  },
  {
    id: 'gothwad-calendar',
    name: 'Bansify Calendar',
    url: 'https://calender.gothwadtech.com',
    icon: 'calendar',
    description: 'Events and reminders',
  },
  {
    id: 'gothwad-contacts',
    name: 'Bansify Contacts',
    url: 'https://contacts.gothwadtech.com',
    icon: 'users',
    description: 'People and addresses',
  },
];

export const GOTHWAD_PRODUCTS = [
  {
    id: 'gothwad-tube',
    name: 'Bansify Tube (PlusTube)',
    url: 'https://tube.gothwadtech.com',
    icon: 'play',
    description: 'Video — PlusTube',
  },
  {
    id: 'gothwad-chat',
    name: 'Bansify Chat (GrixChat)',
    url: 'https://grixchat.gothwadtech.com',
    icon: 'message-circle',
    description: 'Messaging',
  },
  {
    id: 'gothwad-indogram',
    name: 'Indogram',
    url: 'https://indogram.gothwadtech.com',
    icon: 'send',
    description: 'Telegram-style chat',
  },
];

export const CORE_APP_IDS = GOTHWAD_SERVICES.map((a) => a.id);

export function isCoreApp(id) {
  return CORE_APP_IDS.includes(id);
}
