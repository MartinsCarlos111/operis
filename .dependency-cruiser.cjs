/**
 * Architecture boundary rules (Clean Architecture, feature-first).
 *
 * Layer dependency rule inside every module:
 *   domain  <-  application  <-  infrastructure
 *
 * - domain must depend on nothing but itself (and stdlib).
 * - application may depend on domain only.
 * - infrastructure may depend on application and domain.
 * - features must not import each other's internals (only via shared).
 *
 * Run with: npm run arch
 */
module.exports = {
  forbidden: [
    {
      name: 'domain-stays-pure',
      comment:
        'domain/ must not depend on application, infrastructure, or any framework/ORM. It is the pure core.',
      severity: 'error',
      from: { path: 'src/modules/[^/]+/domain' },
      to: {
        pathNot: [
          'src/modules/[^/]+/domain',
          'node_modules/typescript',
        ],
        path: [
          'src/modules/[^/]+/(application|infrastructure)',
          'src/shared/infra',
          'node_modules/(fastify|@prisma|@fastify)',
        ],
      },
    },
    {
      name: 'application-only-on-domain',
      comment:
        'application/ may depend on its own domain and shared abstractions — never on infrastructure or web/ORM frameworks.',
      severity: 'error',
      from: { path: 'src/modules/[^/]+/application' },
      to: {
        path: [
          'src/modules/[^/]+/infrastructure',
          'node_modules/(fastify|@prisma|@fastify)',
        ],
      },
    },
    {
      name: 'no-cross-feature-internals',
      comment:
        'A feature must not reach into another feature\'s folders. Share via src/shared instead.',
      severity: 'error',
      from: { path: 'src/modules/([^/]+)/' },
      to: {
        path: 'src/modules/([^/]+)/',
        pathNot: 'src/modules/$1/',
      },
    },
    {
      name: 'no-orphans',
      comment: 'Dead modules (imported by nothing, importing nothing) — likely leftover.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '(^|/)tsconfig',
          '(^|/)\\.[^/]+\\.(js|cjs|mjs|ts)$',
        ],
      },
      to: {},
    },
    {
      name: 'no-circular',
      comment: 'Circular dependencies make reasoning and testing hard.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
};
