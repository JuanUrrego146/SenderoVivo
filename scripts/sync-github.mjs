#!/usr/bin/env node
/**
 * sync-github.mjs, Sendero Vivo
 *
 * Crea en GitHub los labels, los milestones y una issue por historia de usuario,
 * leyendo `plan/backlog-jira.csv` como unica fuente de verdad.
 *
 * Se sustituyo al antiguo setup_repo.sh (1.500 lineas escritas a mano) porque el
 * backlog cambia y mantener dos copias del mismo contenido garantiza que se
 * desincronicen. Aqui el CSV manda: si una historia cambia en el CSV, se vuelve a
 * ejecutar este script y GitHub se pone al dia.
 *
 * Es idempotente: los labels y los milestones se actualizan; las issues que ya
 * existen (mismo titulo) se omiten.
 *
 * Uso:
 *   node scripts/sync-github.mjs                 # aplica los cambios
 *   node scripts/sync-github.mjs --dry-run       # solo muestra lo que haria
 *   node scripts/sync-github.mjs --repo owner/nombre
 *
 * Requiere GitHub CLI (`gh`) autenticado.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CSV_PATH = join(ROOT, 'plan', 'backlog-jira.csv');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const repoArgIndex = args.indexOf('--repo');
const REPO_OVERRIDE = repoArgIndex !== -1 ? args[repoArgIndex + 1] : null;

// ---------------------------------------------------------------- utilidades

function gh(cliArgs, { allowFailure = false } = {}) {
  try {
    return execFileSync('gh', cliArgs, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();
  } catch (error) {
    if (allowFailure) return null;
    const detail = (error.stderr || error.message || '').toString().trim();
    throw new Error(`gh ${cliArgs.slice(0, 3).join(' ')} fallo: ${detail}`);
  }
}

/** Parser CSV segun RFC 4180: comillas dobles, comas y saltos de linea dentro de campo. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field); field = '';
    } else if (char === '\n') {
      row.push(field); field = ''; rows.push(row); row = [];
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }

  const header = rows.shift().map((h) => h.trim());
  return rows
    .filter((r) => r.some((cell) => cell.trim() !== ''))
    .map((r) => Object.fromEntries(header.map((key, i) => [key, (r[i] ?? '').trim()])));
}

// ------------------------------------------------------------------- catalogo

const LABELS = [
  ['E1', '0E8A16', 'Epica 1: Captura y reconstruccion del tramo'],
  ['E2', '1D76DB', 'Epica 2: Motor de recorrido web'],
  ['E3', '8B5CF6', 'Epica 3: Puntos de interes, fichas 3D y sonido'],
  ['E4', 'D97706', 'Epica 4: Capa de datos y experiencia de usuario'],
  ['bug', 'D73A4A', 'Algo no funciona como deberia'],
  ['docs', '0075CA', 'Documentacion y contratos de datos'],
  ['3d-asset', 'C2185B', 'Modelado, escaneo u optimizacion de assets 3D'],
  ['ui-ux', 'F59E0B', 'Diseno de interfaz, accesibilidad y experiencia'],
  ['captura', '166534', 'Procesamiento y reconstruccion del tramo'],
  ['campo', '4D7C0F', 'Trabajo en el sendero: visitas V1 a V4'],
  ['audio', '0E7490', 'Ambientacion sonora, audio espacial y cantos'],
  ['rendimiento', '7C2D12', 'Rendimiento, presupuesto de splats y LOD'],
  ['blocked', 'B60205', 'Bloqueada: no puede avanzar sin resolver algo antes'],
  ['S1', 'EDEDED', 'Sprint 1 - 11 ago a 24 ago'],
  ['S2', 'EDEDED', 'Sprint 2 - 25 ago a 7 sep'],
  ['S2b', 'EDEDED', 'Sprint 2b - 25 ago a 7 sep (en paralelo)'],
  ['S3', 'EDEDED', 'Sprint 3 - 8 sep a 21 sep'],
  ['S4', 'EDEDED', 'Sprint 4 - 22 sep a 5 oct'],
  ['S5', 'EDEDED', 'Sprint 5 - 6 oct a 19 oct'],
  ['S6', 'EDEDED', 'Sprint 6 - 20 oct a 2 nov'],
  ['S7', 'EDEDED', 'Sprint 7 - 3 nov a 16 nov'],
  ['W01', 'C5DEF5', 'Entrega semanal 01 - 11-17 ago'],
  ['W02', 'C5DEF5', 'Entrega semanal 02 - 18-24 ago'],
  ['W03', 'C5DEF5', 'Entrega semanal 03 - 25-31 ago'],
  ['W04', 'C5DEF5', 'Entrega semanal 04 - 1-7 sep'],
  ['W05', 'C5DEF5', 'Entrega semanal 05 - 8-14 sep'],
  ['W06', 'C5DEF5', 'Entrega semanal 06 - 15-21 sep'],
  ['W07', 'C5DEF5', 'Entrega semanal 07 - 22-28 sep'],
  ['W08', 'C5DEF5', 'Entrega semanal 08 - 29 sep - 5 oct'],
  ['W09', 'C5DEF5', 'Entrega semanal 09 - 6-12 oct'],
  ['W10', 'C5DEF5', 'Entrega semanal 10 - 13-19 oct'],
  ['W11', 'C5DEF5', 'Entrega semanal 11 - 20-26 oct'],
  ['W12', 'C5DEF5', 'Entrega semanal 12 - 27 oct - 2 nov'],
  ['W13', 'C5DEF5', 'Entrega semanal 13 - 3-9 nov'],
  ['W14', 'C5DEF5', 'Entrega semanal 14 - 10-16 nov'],
  ['W15', 'C5DEF5', 'Entrega semanal 15 - 17-28 nov'],
  ['resp-juan-urrego', 'BFDBFE', 'Responsable: Juan Urrego (PM e integrador)'],
  ['resp-felipe-acevedo', 'FBCFE8', 'Responsable: Felipe Acevedo (artista 3D)'],
  ['resp-alejandra-chambueta', 'C7D2FE', 'Responsable: Alejandra Chambueta (motor)'],
  ['resp-david-beltran', 'A7F3D0', 'Responsable: David Beltran (POIs, datos y audio)'],
  ['resp-eybar-viasus', 'FED7AA', 'Responsable: Eybar Viasus (UI/UX)'],
  ['resp-alberto-aleman', 'DDD6FE', 'Responsable: Alberto Aleman (UI/UX)'],
];

const MILESTONES = [
  ['M1: Decision y reconocimiento', '2026-08-24', 'S1 - E1. ADR-001 cerrado y visita de reconocimiento V1 ejecutada: tramo exacto, etapas, POIs y mapa sonoro decididos. CUS-011.'],
  ['M2: Tramo capturado y reconstruido', '2026-09-07', 'S2 - E1. Visitas V2 y V3 ejecutadas. Tres escenas en SOG, limpias y publicadas en scenes.json. CUS-011, RF-002, RF-023, RNF-003.'],
  ['M2b: Catalogo 3D base', '2026-09-07', 'S2b - E3. Aves con animacion idle y helecho arboreo modelados y optimizados. CUS-012, CUS-014, RF-029, RNF-012.'],
  ['M3: Tramo navegable', '2026-09-21', 'S3 - E2. Escena cargando, camara y navegacion basica. Visita V4 de verificacion ejecutada. Identidad visual aplicada. CUS-001, CUS-002, CUS-003, CUS-009.'],
  ['M4: Recorrido completo', '2026-10-05', 'S4 - E2. Tres escenas encadenadas a 30 fps en gama media con LOD por proximidad activo. CUS-008, CUS-010, CUS-015, RF-027, RNF-001.'],
  ['M5: Puntos de interes', '2026-10-19', 'S5 - E3. Cinco o seis POIs completos, al menos uno patrimonial, y ambientacion sonora espacial funcionando. CUS-004, CUS-005, CUS-006, CUS-012, CUS-013.'],
  ['M6: Capa de datos', '2026-11-02', 'S6 - E4. HUD con datos reales del track GPS. CUS-007, RF-013 a RF-016, RF-020.'],
  ['M7: Experiencia final', '2026-11-16', 'S7 - E4. UI final con la paleta aplicada, responsive, onboarding y accesibilidad. CUS-010, RF-019, RF-026, RF-032, RNF-005, RNF-006.'],
  ['M8: Integracion y entrega', '2026-11-28', 'Semana 15. Integracion, pruebas cruzadas, despliegue y entrega.'],
];

const SPRINT_TO_MILESTONE = {
  S1: 'M1: Decision y reconocimiento',
  S2: 'M2: Tramo capturado y reconstruido',
  S2b: 'M2b: Catalogo 3D base',
  S3: 'M3: Tramo navegable',
  S4: 'M4: Recorrido completo',
  S5: 'M5: Puntos de interes',
  S6: 'M6: Capa de datos',
  S7: 'M7: Experiencia final',
  Cierre: 'M8: Integracion y entrega',
};

const SPRINT_DATES = {
  S1: '11 ago - 24 ago de 2026',
  S2: '25 ago - 7 sep de 2026',
  S2b: '25 ago - 7 sep de 2026 (en paralelo con S2)',
  S3: '8 sep - 21 sep de 2026',
  S4: '22 sep - 5 oct de 2026',
  S5: '6 oct - 19 oct de 2026',
  S6: '20 oct - 2 nov de 2026',
  S7: '3 nov - 16 nov de 2026',
  Cierre: '17 nov - 28 nov de 2026',
};

// ------------------------------------------------------------------ contenido

/** Separa la descripcion del CSV en objetivo y lista de criterios de aceptacion. */
function splitDescription(description) {
  const marker = /Criterios de aceptacion:\s*/i;
  const match = description.match(marker);
  if (!match) return { goal: description, criteria: [] };

  const goal = description.slice(0, match.index).trim();
  const criteria = description
    .slice(match.index + match[0].length)
    .split(/\(\d+\)\s*/)
    .map((c) => c.replace(/^[;.\s]+|[;.\s]+$/g, ''))
    .filter(Boolean);
  return { goal, criteria };
}

function requirementsOf(text) {
  const ids = [...text.matchAll(/\b(RF-\d{3}|RNF-\d{3}|CUS-\d{3})\b/g)].map((m) => m[1]);
  return [...new Set(ids)].sort();
}

function issueBody(story, subtasks) {
  const { goal, criteria } = splitDescription(story.Description);
  const requirements = requirementsOf(story.Description);
  const storyId = story.Summary.match(/^HU-\d+/)?.[0] ?? '';

  const lines = [];
  lines.push('## Objetivo', '', goal, '');

  lines.push('## Requerimientos que implementa', '');
  lines.push(requirements.length
    ? requirements.map((r) => `- ${r}`).join('\n')
    : '- Trabajo de proceso o de gestion; ver `plan/plan_de_trabajo.md`.');
  lines.push('');

  if (subtasks.length) {
    lines.push('## Tareas', '');
    for (const sub of subtasks) {
      const title = sub.Summary.replace(/^HU-[\d.]+\s*/, '');
      lines.push(`- [ ] ${title}, **${sub.Assignee}** _(${sub['Story Points']} pts)_`);
    }
    lines.push('');
  }

  if (criteria.length) {
    lines.push('## Criterios de aceptacion', '');
    lines.push(criteria.map((c) => `- [ ] ${c}`).join('\n'));
    lines.push('');
  }

  lines.push('## Definicion de hecho', '');
  lines.push('- [ ] Revisada y aprobada por otra persona (el dueno de la carpeta, ver `docs/09-ambitos-de-los-tres-programadores.md`)');
  lines.push('- [ ] Probada en Chrome escritorio y en un celular real');
  lines.push('- [ ] No baja de 30 fps en el dispositivo de referencia');
  lines.push('- [ ] Todos los textos visibles en espanol');
  lines.push('- [ ] Fusionada a `develop`');
  lines.push('');

  lines.push('## Planificacion', '');
  lines.push(`- **Responsable:** ${story.Assignee}`);
  lines.push(`- **Sprint:** ${story.Sprint} (${SPRINT_DATES[story.Sprint] ?? 'fechas por confirmar'})`);
  lines.push(`- **Epica:** ${story['Epic Link']}`);
  lines.push(`- **Estimacion:** ${story['Story Points']} puntos de historia`);
  if (storyId) lines.push(`- **Rama sugerida:** \`dev/<tu-nombre>/${storyId}-<descripcion-kebab-case>\``);
  lines.push('- Detalle en `docs/04-actividades-y-roles.md` y `plan/plan_de_trabajo.md`');
  lines.push('');
  lines.push('> Este backlog es una **guia inicial**. La visita de reconocimiento V1 de la semana 2 puede cambiar el alcance de esta historia.');

  return lines.join('\n');
}

// ------------------------------------------------------------------ ejecucion

function main() {
  const rows = parseCsv(readFileSync(CSV_PATH, 'utf8'));
  const stories = rows.filter((r) => r['Issue Type'] === 'Story');
  const subtasks = rows.filter((r) => r['Issue Type'] === 'Sub-task');

  const subtasksByStory = new Map();
  for (const sub of subtasks) {
    const parent = sub.Summary.match(/^(HU-\d+)\./)?.[1];
    if (!parent) continue;
    if (!subtasksByStory.has(parent)) subtasksByStory.set(parent, []);
    subtasksByStory.get(parent).push(sub);
  }

  const repo = REPO_OVERRIDE
    ?? gh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']);

  console.log(`Repositorio : ${repo}`);
  console.log(`Backlog     : ${stories.length} historias, ${subtasks.length} subtareas`);
  console.log(`Modo        : ${DRY_RUN ? 'simulacion (--dry-run)' : 'aplicar cambios'}\n`);

  // 1. Labels
  console.log('==> Labels');
  for (const [name, color, description] of LABELS) {
    if (DRY_RUN) { console.log(`    [dry-run] ${name}`); continue; }
    gh(['label', 'create', name, '--repo', repo, '--color', color,
      '--description', description, '--force'], { allowFailure: true });
  }
  console.log(`    ${LABELS.length} labels\n`);

  // 2. Milestones
  console.log('==> Milestones');
  const existingMilestones = new Set(
    JSON.parse(gh(['api', `repos/${repo}/milestones?state=all&per_page=100`], { allowFailure: true }) || '[]')
      .map((m) => m.title)
  );
  for (const [title, due, description] of MILESTONES) {
    if (existingMilestones.has(title)) { console.log(`    ya existe : ${title}`); continue; }
    if (DRY_RUN) { console.log(`    [dry-run] ${title} (${due})`); continue; }
    gh(['api', `repos/${repo}/milestones`, '-X', 'POST',
      '-f', `title=${title}`, '-f', `due_on=${due}T23:59:59Z`, '-f', `description=${description}`],
      { allowFailure: true });
    console.log(`    creado    : ${title} (${due})`);
  }
  console.log('');

  // 3. Issues, una por historia
  console.log('==> Issues');
  const existingIssues = new Set(
    JSON.parse(gh(['issue', 'list', '--repo', repo, '--state', 'all', '--limit', '500', '--json', 'title'],
      { allowFailure: true }) || '[]').map((i) => i.title)
  );

  let created = 0;
  let skipped = 0;
  for (const story of stories) {
    if (existingIssues.has(story.Summary)) { skipped++; continue; }

    const storyId = story.Summary.match(/^HU-\d+/)?.[0] ?? '';
    const body = issueBody(story, subtasksByStory.get(storyId) ?? []);
    const labels = story.Labels.split(';').map((l) => l.trim()).filter(Boolean).join(',');
    const milestone = SPRINT_TO_MILESTONE[story.Sprint];

    if (DRY_RUN) {
      console.log(`    [dry-run] ${story.Summary}  [${labels}]  -> ${milestone}`);
      created++;
      continue;
    }

    const cliArgs = ['issue', 'create', '--repo', repo,
      '--title', story.Summary, '--body', body, '--label', labels];
    if (milestone) cliArgs.push('--milestone', milestone);

    const url = gh(cliArgs, { allowFailure: true });
    if (url) { console.log(`    creada    : ${story.Summary}`); created++; }
    else console.error(`    ERROR     : ${story.Summary}`);
  }

  console.log(`\n    ${created} issues creadas, ${skipped} omitidas por existir ya.`);
  console.log('\nListo.');
  console.log('Nota: las issues no llevan asignado un usuario de GitHub porque los seis');
  console.log('miembros todavia no estan en el repositorio. El responsable va en la etiqueta');
  console.log('`resp-<persona>` y en el cuerpo de la issue. Cuando cada quien acepte la');
  console.log('invitacion, se asignan filtrando por esa etiqueta.');
}

main();
