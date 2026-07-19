const { spawnSync } = require('node:child_process');
const { readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const { cssToReactNativeRuntime } = require('react-native-css-interop/css-to-rn');

const projectRoot = resolve(__dirname, '..');
const outputPath = join(tmpdir(), `brenotion-nativewind-${process.pid}.css`);
const tailwindCli = resolve(projectRoot, 'node_modules/tailwindcss/lib/cli.js');
const nativeButtonPath = resolve(projectRoot, 'src/components/ui/button.tsx');
const requiredClasses = [
  'bg-zinc-25',
  'bg-canvas',
  'bg-surface',
  'bg-surface-muted',
  'bg-ink',
  'bg-action-primary',
  'text-ink',
  'text-ink-on-action',
  'border-divider',
  'shadow-card',
  'scale-100',
  'active:scale-[0.96]',
];

try {
  const build = spawnSync(
    process.execPath,
    [tailwindCli, '-i', './src/global.css', '-o', outputPath, '--config', './tailwind.config.js', '--minify'],
    {
      cwd: projectRoot,
      encoding: 'utf8',
      env: { ...process.env, NATIVEWIND_OS: 'android' },
    }
  );

  if (build.status !== 0) {
    process.stderr.write(build.stderr || build.stdout);
    process.exit(build.status ?? 1);
  }

  const runtime = cssToReactNativeRuntime(readFileSync(outputPath));
  const failures = requiredClasses.flatMap((className) => {
    const rule = runtime.rules?.[className];
    const declarationCount = (rule?.n ?? []).reduce(
      (total, entry) => total + (entry.d?.length ?? 0),
      0
    );
    const warnings = rule?.warnings ?? [];

    if (!rule) return [`${className}: regra não gerada`];
    if (warnings.length > 0) return [`${className}: ${JSON.stringify(warnings)}`];
    if (declarationCount === 0) return [`${className}: nenhuma declaração nativa`];
    return [];
  });
  const buttonSource = readFileSync(nativeButtonPath, 'utf8');
  const restingScaleRule = runtime.rules?.['scale-100'];
  const pressedScaleRule = runtime.rules?.['active:scale-[0.96]'];

  if (!buttonSource.includes("'group scale-100 shrink-0")) {
    failures.push(
      'Button nativo: scale-100 deve existir no estado inicial para preparar as variáveis usadas pelo feedback active'
    );
  }

  if (!restingScaleRule?.variables || !pressedScaleRule?.variables) {
    failures.push(
      'Button nativo: os estados inicial e active precisam declarar o mesmo contexto de variáveis NativeWind'
    );
  }

  if (failures.length > 0) {
    process.stderr.write(`NativeWind Android inválido:\n${failures.join('\n')}\n`);
    process.exit(1);
  }

  process.stdout.write(
    `NativeWind Android válido: ${requiredClasses.length} utilitários sem avisos.\n`
  );
} finally {
  rmSync(outputPath, { force: true });
}
