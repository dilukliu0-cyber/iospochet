import {
  endScanActivity,
  isLiveActivitySupported,
  startScanActivity,
  type ScanActivityState,
} from '../../../modules/live-activity';
import { getCurrencySymbol } from '../../utils/currencies';
import { plural, translate } from '../../i18n/translate';

// Live Activity распознавания чека: то, что видно в Dynamic Island.
//
// Здесь собираются строки и суммы — нативная часть их только рисует. Язык
// интерфейса лежит в настройках приложения, а не в локали устройства, поэтому
// переводить должен именно JS.
//
// Ни одна функция отсюда не бросает исключений и ничего не возвращает вызывающему:
// островок — украшение поверх скана, и он не имеет права его сломать.

/** Сколько примерно длится распознавание. Только для шкалы прогресса. */
const ESTIMATED_SCAN_SECONDS = 18;

/** Сколько итог висит перед тем, как система его уберёт. */
const KEEP_RESULT_SECONDS = 8;

export type ScanOutcome = {
  storeName: string | null;
  totalAmount: number;
  currency: string;
  itemCount: number;
};

/**
 * Запускает активность. Возвращает её идентификатор либо null, если островка
 * не будет (Android, Expo Go, iOS до 16.2, выключено в настройках системы).
 */
export function beginScanActivity(): string | null {
  if (!isLiveActivitySupported()) return null;

  const id = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const startedAt = Date.now() / 1000;

  void startScanActivity(id, {
    status: 'processing',
    title: translate('island_scan_title'),
    subtitle: translate('island_scan_subtitle'),
    amount: '',
    startedAt,
    estimatedEndAt: startedAt + ESTIMATED_SCAN_SECONDS,
  });

  return id;
}

/** Показывает итог и гасит активность через несколько секунд. */
export function finishScanActivity(id: string | null, outcome: ScanOutcome): void {
  if (!id) return;

  const store = outcome.storeName?.trim();
  void endScanActivity(
    id,
    {
      ...closingState(),
      status: 'done',
      title: store && store.length > 0 ? store : translate('island_done_title'),
      subtitle: itemsLabel(outcome.itemCount),
      amount: formatAmount(outcome.totalAmount, outcome.currency),
    },
    KEEP_RESULT_SECONDS,
  );
}

/** Показывает ошибку и гасит активность. */
export function failScanActivity(id: string | null): void {
  if (!id) return;

  void endScanActivity(
    id,
    {
      ...closingState(),
      status: 'error',
      title: translate('island_error_title'),
      subtitle: translate('island_error_subtitle'),
      amount: '',
    },
    KEEP_RESULT_SECONDS,
  );
}

/**
 * Шкала прогресса в финальном состоянии не показывается, но поля обязательные —
 * отдаём уже истёкший интервал, чтобы полоса не «поехала» перед исчезновением.
 */
function closingState(): Pick<ScanActivityState, 'startedAt' | 'estimatedEndAt'> {
  const now = Date.now() / 1000;
  return { startedAt: now - 1, estimatedEndAt: now };
}

function itemsLabel(count: number): string {
  if (count <= 0) return '';
  const noun = plural(
    count,
    translate('island_items_one'),
    translate('island_items_few'),
    translate('island_items_many'),
  );
  return `${count} ${noun}`;
}

/**
 * В островке место сильно ограничено, поэтому символ валюты вместо кода и
 * копейки только когда они есть: «452 Kč», но «452.50 Kč».
 */
function formatAmount(total: number, currency: string): string {
  const rounded = Math.round(total * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `${text} ${getCurrencySymbol(currency)}`;
}
