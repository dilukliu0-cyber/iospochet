// Live Activity описывается структурой ScanActivityAttributes, и она обязана
// существовать в двух копиях: под нативного модуля и таргет виджета собираются
// раздельно, общего файла между ними нет.
//
// ActivityKit связывает приложение и виджет по ИМЕНИ типа, а не по содержимому.
// Значит, расхождение полей не даст ошибки компиляции — островок просто молча
// не появится. Отладить это без устройства нельзя, поэтому проверяем здесь.
//
//   node scripts/check-live-activity-sync.mjs        — проверить
//   node scripts/check-live-activity-sync.mjs --fix  — переписать копию из оригинала

import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = 'modules/live-activity/ios/ScanActivityAttributes.swift';
const COPY = 'targets/scan/ScanActivityAttributes.swift';

const read = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    console.error(`Не читается ${path}: ${error.message}`);
    process.exit(1);
  }
};

// Переводы строк не сравниваем: Swift к ним равнодушен, а git на Windows
// подменяет LF на CRLF при checkout — иначе проверка падала бы на пустом месте.
const normalize = (text) => text.replace(/\r\n/g, '\n');

const source = read(SOURCE);
const copy = read(COPY);

if (normalize(source) === normalize(copy)) {
  console.log('ScanActivityAttributes: копии совпадают');
  process.exit(0);
}

if (process.argv.includes('--fix')) {
  writeFileSync(COPY, source);
  console.log(`Переписан ${COPY} из ${SOURCE}`);
  process.exit(0);
}

const sourceLines = normalize(source).split('\n');
const copyLines = normalize(copy).split('\n');
const limit = Math.max(sourceLines.length, copyLines.length);
for (let i = 0; i < limit; i++) {
  if (sourceLines[i] !== copyLines[i]) {
    console.error(`Копии ScanActivityAttributes разошлись, первая разница — строка ${i + 1}:`);
    console.error(`  ${SOURCE}: ${sourceLines[i] ?? '<конец файла>'}`);
    console.error(`  ${COPY}: ${copyLines[i] ?? '<конец файла>'}`);
    break;
  }
}
console.error('');
console.error('Островок с такими файлами не появится. Почините так:');
console.error('  node scripts/check-live-activity-sync.mjs --fix');
process.exit(1);
