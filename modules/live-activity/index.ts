import { requireOptionalNativeModule } from 'expo-modules-core';

// JS-обёртка над ActivityKit (см. ios/LiveActivityModule.swift).
//
// Модуль есть только в собранной iOS-версии: в Expo Go и на Android нативной
// части нет, поэтому берём его через requireOptionalNativeModule и молча
// ничего не делаем. Островок — украшение поверх скана, и он не имеет права
// сломать сам скан.

export type ScanActivityStatus = 'processing' | 'done' | 'error';

export type ScanActivityState = {
  status: ScanActivityStatus;
  /** Уже переведённые строки: язык берётся из настроек приложения, не из локали устройства. */
  title: string;
  subtitle: string;
  /** Отформатированная сумма либо пустая строка. */
  amount: string;
  /** Границы шкалы прогресса в epoch-секундах (не миллисекундах). */
  startedAt: number;
  estimatedEndAt: number;
};

type NativeLiveActivity = {
  isSupported(): boolean;
  start(id: string, state: ScanActivityState): Promise<boolean>;
  update(id: string, state: ScanActivityState): Promise<boolean>;
  end(id: string, state: ScanActivityState, keepVisibleSeconds: number): Promise<boolean>;
  endAll(): Promise<number>;
};

const native = requireOptionalNativeModule<NativeLiveActivity>('LiveActivity');

/** Есть ли нативная часть и разрешены ли активности в настройках системы. */
export function isLiveActivitySupported(): boolean {
  try {
    return native?.isSupported() ?? false;
  } catch {
    return false;
  }
}

export async function startScanActivity(id: string, state: ScanActivityState): Promise<boolean> {
  return call((module) => module.start(id, state));
}

export async function updateScanActivity(id: string, state: ScanActivityState): Promise<boolean> {
  return call((module) => module.update(id, state));
}

export async function endScanActivity(
  id: string,
  state: ScanActivityState,
  keepVisibleSeconds: number,
): Promise<boolean> {
  return call((module) => module.end(id, state, keepVisibleSeconds));
}

/** Погасить всё, что осталось с прошлого запуска (приложение убили посреди скана). */
export async function endAllScanActivities(): Promise<void> {
  if (!native) return;
  try {
    await native.endAll();
  } catch {
    /* нечего гасить или система не даёт — не наша забота */
  }
}

async function call(action: (module: NativeLiveActivity) => Promise<boolean>): Promise<boolean> {
  if (!native) return false;
  try {
    return await action(native);
  } catch {
    return false;
  }
}
