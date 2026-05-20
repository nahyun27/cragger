// supabase/scripts/build-vote-seed.mjs
//
// Becky의 색깔↔V그레이드 매핑 시트 (CSV) 를 grade_votes seed로 변환.
//
// Modes:
//   기본 (dry-run): CSV 파싱 + DB gyms 매칭 + 변환 결과 보고만. INSERT 안 함.
//     node supabase/scripts/build-vote-seed.mjs
//
//   --apply: dry-run 결과 그대로 grade_votes에 UPSERT.
//     SUPABASE_SERVICE_ROLE_KEY 필요 (RLS 우회), --user-id 인자 필수.
//     node supabase/scripts/build-vote-seed.mjs --apply --user-id <uuid>
//
// CSV 위치: supabase/seed-source/gym-colors.csv

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const PROJECT_ROOT = resolve(import.meta.dirname, '../..');
const CSV_PATH = resolve(PROJECT_ROOT, 'supabase/seed-source/gym-colors.csv');

// ── 인자 파싱 ──────────────────────────────────────────────
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const userIdIdx = args.indexOf('--user-id');
const USER_ID = userIdIdx >= 0 ? args[userIdIdx + 1] : null;

// ── .env 로더 (간단 파서) ──────────────────────────────────
function loadEnv() {
  const env = {};
  try {
    const text = readFileSync(resolve(PROJECT_ROOT, '.env'), 'utf-8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[m[1]] = val;
    }
  } catch (e) {
    console.error('.env 읽기 실패:', e.message);
  }
  return env;
}

// ── 최소 CSV 파서 (quoted multi-line 지원) ────────────────
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; ) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ',') {
      row.push(cell);
      cell = '';
      i++;
      continue;
    }
    if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
      continue;
    }
    if (c === '\r') {
      i++;
      continue;
    }
    cell += c;
    i++;
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

// ── 그레이드 밴드 파싱 ─────────────────────────────────────
function parseGradeBand(label) {
  const clean = label.replace(/\s+/g, '').trim();
  if (!clean) return null; // 연속 행: 직전 band 유지
  const nums = [...clean.matchAll(/(\d+)/g)].map((m) => parseInt(m[1], 10));
  if (nums.length === 0) {
    // vb / vbb / vbbb / vbbbbb 등 — V0 이하라고 봐도 무방
    return 'V0';
  }
  return `V${Math.max(...nums)}`;
}

function vToNum(v) {
  const m = v.match(/^V(\d+)(\+?)$/i);
  if (!m) return 0;
  return parseInt(m[1], 10) + (m[2] ? 0.5 : 0);
}

// ── 색깔 매핑 ───────────────────────────────────────────────
const COLOR_MAP = {
  검정: 'black',
  검은: 'black',
  흰색: 'white',
  하양: 'white',
  회색: 'gray',
  빨강: 'red',
  빨간: 'red',
  파랑: 'blue',
  파란: 'blue',
  노랑: 'yellow',
  노란: 'yellow',
  초록: 'green',
  핑크: 'pink',
  분홍: 'pink',
  주황: 'orange',
  보라: 'purple',
  // 아래 4개는 현재 climb-colors.ts에 없음. 인식은 되지만 SUPPORTED_COLORS에서 걸러짐
  갈색: 'brown',
  남색: 'navy',
  하늘: 'sky',
  연두: 'lime',
};

// 앱이 실제로 렌더링할 수 있는 색깔
const SUPPORTED_COLORS = new Set([
  'red',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'orange',
  'black',
  'white',
  'gray',
]);

function normalizeColor(raw) {
  const clean = raw.replace(/\s+/g, '').trim();
  if (!clean) return null;
  return COLOR_MAP[clean] ?? null;
}

// ── 암장 매칭 (체인 = 같은 데이터) ─────────────────────────
// 사용자 결정: 체인점은 난이도 동일 가정. 한 CSV 컬럼이 DB의 같은 name 가진
// 모든 branch에 적용. 즉:
//   - CSV "더클라임" → DB의 5개 더클라임 branch 모두
//   - CSV "알레클라이밍 혜화" + "영등포 알레" → 둘 다 알레클라이밍에 매핑됨,
//     색깔별 max V로 머지
// 매칭 우선순위:
//   1) CSV 토큰이 DB name(공백제거)에 포함 → 그 name의 모든 branch 매칭
//   2) name 매치 없으면 fallback: CSV 토큰이 DB branch(공백제거)에 포함 → 그 한 곳만
//      (ICN 같은 branch-only 식별자 처리용)

function cleanForMatch(s) {
  return s.replace(/\s+/g, '');
}

function tokenizeCsvName(csvName) {
  // 공백으로 토큰화 후 길이 2 이상만 (한글 2자도 의미 있음)
  return csvName
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((t) => t.length >= 2);
}

function findMatchingDbGyms(csvName, dbGyms) {
  const tokens = tokenizeCsvName(csvName);
  if (tokens.length === 0) return [];

  // 1) name 매칭: 모든 DB gym name 중 토큰이 부분문자열인 name 들 수집
  const matchedNameKeys = new Set();
  for (const t of tokens) {
    for (const g of dbGyms) {
      if (cleanForMatch(g.name).includes(t)) {
        matchedNameKeys.add(g.name);
      }
    }
  }
  if (matchedNameKeys.size > 0) {
    return dbGyms.filter((g) => matchedNameKeys.has(g.name));
  }

  // 2) branch fallback: ASCII 토큰(영문/숫자)만 허용 — ICN 같은 식별자만.
  //    한글 위치 토큰("성수", "수원", "문래" 등)이 우연히 다른 브랜드의
  //    "성수점", "수원점" 등에 부분문자열 매치되는 가짜 매칭을 막음.
  for (const t of tokens) {
    if (!/^[A-Za-z0-9]+$/.test(t)) continue;
    for (const g of dbGyms) {
      if (g.branch && cleanForMatch(g.branch).includes(t)) {
        return [g];
      }
    }
  }
  return [];
}

// ── 메인 ───────────────────────────────────────────────────
async function main() {
  const env = loadEnv();
  const SUPABASE_URL = env.EXPO_PUBLIC_SUPABASE_URL;
  const ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !ANON_KEY) {
    console.error('.env에 EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 필요');
    process.exit(1);
  }

  const sb = createClient(SUPABASE_URL, ANON_KEY);

  // 1) CSV 읽고 파싱
  const csvText = readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCsv(csvText);
  console.log(`CSV rows: ${rows.length}`);

  // 2) 헤더 추출 — row 0 의 col 1 부터
  const header = rows[0] ?? [];
  const gymHeaders = header.slice(1).map((h) => h.replace(/\s+/g, ' ').trim());
  console.log(`Gym columns: ${gymHeaders.length}`);

  // 3) 데이터 row 순회: gymCol → color(raw) → max V grade
  // votes[gymCol] = Map<rawColor, vGradeString>
  const votes = new Map();
  let currentBand = null;
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const labelCell = row[0] ?? '';
    const band = parseGradeBand(labelCell);
    if (band !== null) currentBand = band;
    if (!currentBand) continue;

    for (let c = 1; c < row.length; c++) {
      const gymCol = c - 1;
      const cellRaw = (row[c] ?? '').replace(/\s+/g, '').trim();
      if (!cellRaw) continue;
      let g = votes.get(gymCol);
      if (!g) {
        g = new Map();
        votes.set(gymCol, g);
      }
      const existing = g.get(cellRaw);
      if (!existing || vToNum(currentBand) > vToNum(existing)) {
        g.set(cellRaw, currentBand);
      }
    }
  }

  // 4) DB gyms fetch
  const { data: dbGyms, error: gymsErr } = await sb
    .from('gyms')
    .select('id, name, branch, city');
  if (gymsErr) {
    console.error(gymsErr);
    process.exit(1);
  }
  console.log(`DB gyms: ${dbGyms.length}`);

  // 5) 매칭 + 색깔 정규화 (체인 머지)
  // gymVotesByDbId: Map<dbGymId, Map<color, maxGrade>>
  // csvByDbId: Map<dbGymId, string[]> (어느 CSV 컬럼들이 기여했는지 보고용)
  const gymVotesByDbId = new Map();
  const csvByDbId = new Map();
  const unmatchedGyms = [];
  const unmappedColorsCount = new Map();
  const unsupportedColorsCount = new Map();

  for (let i = 0; i < gymHeaders.length; i++) {
    const csvName = gymHeaders[i];
    if (!csvName) continue;
    const gymVotes = votes.get(i);
    if (!gymVotes || gymVotes.size === 0) continue;

    const matchedDbGyms = findMatchingDbGyms(csvName, dbGyms);
    if (matchedDbGyms.length === 0) {
      unmatchedGyms.push(csvName);
      continue;
    }

    // CSV 한 컬럼의 raw votes를 색깔 식별자로 변환 + 중복 max 정리
    const colVotes = new Map();
    for (const [colorRaw, grade] of gymVotes) {
      const color = normalizeColor(colorRaw);
      if (!color) {
        unmappedColorsCount.set(colorRaw, (unmappedColorsCount.get(colorRaw) ?? 0) + 1);
        continue;
      }
      if (!SUPPORTED_COLORS.has(color)) {
        const key = `${colorRaw} → ${color}`;
        unsupportedColorsCount.set(key, (unsupportedColorsCount.get(key) ?? 0) + 1);
        continue;
      }
      const prev = colVotes.get(color);
      if (!prev || vToNum(grade) > vToNum(prev)) colVotes.set(color, grade);
    }

    if (colVotes.size === 0) continue;

    // 매칭된 모든 DB gym (체인의 모든 branch)에 같은 데이터 적용, 머지 시 max
    for (const dbGym of matchedDbGyms) {
      let existing = gymVotesByDbId.get(dbGym.id);
      if (!existing) {
        existing = new Map();
        gymVotesByDbId.set(dbGym.id, existing);
      }
      for (const [color, grade] of colVotes) {
        const prev = existing.get(color);
        if (!prev || vToNum(grade) > vToNum(prev)) existing.set(color, grade);
      }
      let csvNames = csvByDbId.get(dbGym.id);
      if (!csvNames) {
        csvNames = [];
        csvByDbId.set(dbGym.id, csvNames);
      }
      if (!csvNames.includes(csvName)) csvNames.push(csvName);
    }
  }

  // 출력 정렬 위해 matched 재구성
  const matched = [];
  for (const [dbGymId, colorMap] of gymVotesByDbId) {
    const dbGym = dbGyms.find((g) => g.id === dbGymId);
    matched.push({
      dbGym,
      csvSources: csvByDbId.get(dbGymId) ?? [],
      votes: [...colorMap.entries()].map(([color, grade]) => ({ color, grade })),
    });
  }
  matched.sort((a, b) =>
    `${a.dbGym.name}${a.dbGym.branch ?? ''}`.localeCompare(
      `${b.dbGym.name}${b.dbGym.branch ?? ''}`,
    ),
  );

  // 6) 보고
  const totalVotes = matched.reduce((acc, m) => acc + m.votes.length, 0);

  console.log('\n=== MATCHED DB GYMS ===');
  for (const m of matched) {
    const dbLabel = `${m.dbGym.name}${m.dbGym.branch ? ' ' + m.dbGym.branch : ''}`;
    const sources = m.csvSources.map((s) => `"${s}"`).join(' + ');
    console.log(`  [${m.votes.length}] ${dbLabel}  ← ${sources}`);
  }
  console.log(`Total matched DB gyms: ${matched.length} / ${totalVotes} votes`);
  // DB에서 매칭 안 된 시드 gym도 표시 (사용자가 수동 채울 곳)
  const matchedIds = new Set(matched.map((m) => m.dbGym.id));
  const dbUnmatched = dbGyms.filter((g) => !matchedIds.has(g.id));
  if (dbUnmatched.length > 0) {
    console.log('\n=== DB GYMS WITHOUT CSV MATCH (시드 안 됨, 수동 채움) ===');
    for (const g of dbUnmatched) {
      console.log(`  ${g.name}${g.branch ? ' ' + g.branch : ''}`);
    }
  }

  console.log('\n=== UNMATCHED CSV GYMS (시드 안 됨) ===');
  for (const u of unmatchedGyms) console.log(`  "${u}"`);
  console.log(`Total: ${unmatchedGyms.length}`);

  console.log('\n=== UNMAPPED COLORS (한글 → 식별자 매핑 없음) ===');
  for (const [raw, count] of [...unmappedColorsCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  "${raw}" × ${count}`);
  }
  if (unmappedColorsCount.size === 0) console.log('  (없음)');

  console.log('\n=== UNSUPPORTED COLORS (climb-colors.ts에 없는 식별자, skip) ===');
  for (const [k, count] of [...unsupportedColorsCount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k} × ${count}`);
  }
  if (unsupportedColorsCount.size === 0) console.log('  (없음)');

  // 샘플
  console.log('\n=== SAMPLE: 더클라임 양재점 (있으면) ===');
  const sample =
    matched.find((m) => m.dbGym.name === '더클라임' && m.dbGym.branch === '양재점') ??
    matched.find((m) => m.dbGym.name.includes('더클라임')) ??
    matched[0];
  if (sample) {
    const dbLabel = `${sample.dbGym.name}${sample.dbGym.branch ? ' ' + sample.dbGym.branch : ''}`;
    const sources = sample.csvSources.join(', ');
    console.log(`  ${dbLabel}  (CSV 소스: ${sources})`);
    const sorted = [...sample.votes].sort((a, b) => vToNum(b.grade) - vToNum(a.grade));
    for (const v of sorted) console.log(`    ${v.color}: ${v.grade}`);
  } else {
    console.log('  (no match)');
  }

  // 7) Apply 단계
  if (!APPLY) {
    console.log('\n(dry-run. --apply 와 --user-id <uuid> 로 실제 INSERT.)');
    return;
  }

  if (!USER_ID) {
    console.error('\n--apply 시 --user-id <uuid> 필수');
    process.exit(1);
  }
  const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE_KEY) {
    console.error('\n.env에 SUPABASE_SERVICE_ROLE_KEY 필요 (RLS 우회용)');
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rowsToUpsert = [];
  for (const m of matched) {
    for (const v of m.votes) {
      rowsToUpsert.push({
        user_id: USER_ID,
        gym_id: m.dbGym.id,
        color: v.color,
        grade: v.grade,
      });
    }
  }
  console.log(`\nUPSERT ${rowsToUpsert.length} rows…`);
  const { error: upErr } = await admin
    .from('grade_votes')
    .upsert(rowsToUpsert, { onConflict: 'user_id,gym_id,color' });
  if (upErr) {
    console.error('UPSERT failed:', upErr);
    process.exit(1);
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
