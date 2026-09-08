/** Browser copy for the shell-integration settings card. */

/** Locale namespace owning the card copy. */
export const LOCALE_NS = 'dshShellIntegration'

/** All copy keys for the shell-integration card. */
export type ShellLocaleKey =
  | 'title'
  | 'expandLabel'
  | 'toggleLabel'
  | 'enabledTag'
  | 'disabledTag'
  | 'deleteLabel'
  | 'deleteTitle'
  | 'deletePrompt'
  | 'accept'
  | 'cancel'
  | 'working'
  | 'saving'
  | 'failed'

/** Chinese card copy. */
export const zh: Record<ShellLocaleKey, string> = {
  title: 'DSH 快捷开启',
  expandLabel: '展开或收起快捷开启设置',
  toggleLabel: '启用“在 DSH 中打开”文件夹右键菜单',
  enabledTag: '已启用',
  disabledTag: '已停用',
  deleteLabel: '彻底删除',
  deleteTitle: '永久删除插件“DSH 快捷开启”？',
  deletePrompt: '将删除：注册表右键菜单、系统托盘、全部已生成的脚本与日志、本设置卡片，以及该插件的安装文件；插件自身的装载条目也会被移除，DSH 重启后不再加载。此操作不可撤销，如需再次使用请重新安装插件。',
  accept: '永久删除',
  cancel: '取消',
  working: '正在删除…',
  saving: '正在保存…',
  failed: '操作失败，请重试。',
}

/** English card copy. */
export const en: Record<ShellLocaleKey, string> = {
  title: 'DSH quick open',
  expandLabel: 'Expand or collapse quick-open settings',
  toggleLabel: 'Enable the “Open in DSH” folder context menu',
  enabledTag: 'Enabled',
  disabledTag: 'Disabled',
  deleteLabel: 'Delete',
  deleteTitle: 'Permanently delete the “DSH quick open” plugin?',
  deletePrompt: 'Deletes the Explorer context-menu entries, the system tray, every generated script and log, this settings card, and the plugin\'s installed files; the plugin\'s own mount rows are removed too, so DSH will not load it again after a restart. This cannot be undone — reinstall the plugin to use it again.',
  accept: 'Delete permanently',
  cancel: 'Cancel',
  working: 'Removing…',
  saving: 'Saving…',
  failed: 'Action failed. Please retry.',
}
