// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type enforcement
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation changes
        'style', // Code style changes (formatting, etc.)
        'refactor', // Code refactoring
        'perf', // Performance improvements
        'test', // Adding or updating tests
        'chore', // Maintenance tasks
        'ci', // CI/CD changes
        'build', // Build system changes
        'revert', // Reverting previous commits
        'breaking', // Breaking changes (alternative to BREAKING CHANGE footer)
      ],
    ],

    // Subject line rules
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 72],
    'subject-min-length': [2, 'always', 10],

    // Header rules
    'header-max-length': [2, 'always', 100],
    'header-min-length': [2, 'always', 15],

    // Type rules
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // Scope rules for framework modules
    'scope-enum': [
      2,
      'always',
      [
        'core', // Core framework functionality
        'client', // NATS client wrapper
        'server', // Server/service functionality
        'middleware', // Middleware system
        'decorators', // Decorator utilities
        'types', // Type definitions
        'utils', // Utility functions
        'errors', // Error handling
        'config', // Configuration management
        'logging', // Logging functionality
        'metrics', // Metrics and monitoring
        'health', // Health checks
        'discovery', // Service discovery
        'security', // Security features
        'validation', // Input validation
        'serialization', // Message serialization
        'routing', // Message routing
        'streaming', // NATS streaming features
        'jetstream', // JetStream functionality
        'kv', // Key-Value store
        'objectstore', // Object store
        'examples', // Example code
        'docs', // Documentation
        'deps', // Dependencies
        'release', // Release related
      ],
    ],
    'scope-case': [2, 'always', 'lower-case'],

    // Body and footer rules
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],

    // References (issue linking)
    'references-empty': [1, 'never'],
  },

  // Custom plugins for additional validation
  plugins: [
    {
      rules: {
        'require-scope-for-features': parsed => {
          const { type, scope } = parsed;
          if (type === 'feat' && !scope) {
            return [
              false,
              'Feature commits must include a scope to indicate which module is affected',
            ];
          }
          return [true];
        },
        'require-breaking-change-footer': parsed => {
          const { subject, body, footer } = parsed;
          const hasBreakingInSubject = subject && subject.includes('!');
          const hasBreakingInFooter = footer && footer.includes('BREAKING CHANGE');

          if (hasBreakingInSubject && !hasBreakingInFooter) {
            return [
              false,
              'Breaking changes must include "BREAKING CHANGE:" in the footer with details',
            ];
          }
          return [true];
        },
      },
    },
  ],

  // Ignore certain patterns
  ignores: [
    commit => commit.includes('WIP'),
    commit => commit.includes('fixup!'),
    commit => commit.includes('squash!'),
  ],

  // Default ignore rules
  defaultIgnores: true,

  // Help URL for your team
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',

  // Prompt configuration for interactive mode
  prompt: {
    questions: {
      type: {
        description: "Select the type of change that you're committing:",
        enum: {
          feat: {
            description: 'A new feature',
            title: 'Features',
            emoji: '?',
          },
          fix: {
            description: 'A bug fix',
            title: 'Bug Fixes',
            emoji: '??',
          },
          docs: {
            description: 'Documentation only changes',
            title: 'Documentation',
            emoji: '??',
          },
          style: {
            description: 'Changes that do not affect the meaning of the code',
            title: 'Styles',
            emoji: '??',
          },
          refactor: {
            description: 'A code change that neither fixes a bug nor adds a feature',
            title: 'Code Refactoring',
            emoji: '??',
          },
          perf: {
            description: 'A code change that improves performance',
            title: 'Performance Improvements',
            emoji: '??',
          },
          test: {
            description: 'Adding missing tests or correcting existing tests',
            title: 'Tests',
            emoji: '??',
          },
          build: {
            description: 'Changes that affect the build system or external dependencies',
            title: 'Builds',
            emoji: '??',
          },
          ci: {
            description: 'Changes to our CI configuration files and scripts',
            title: 'Continuous Integrations',
            emoji: '??',
          },
          chore: {
            description: "Other changes that don't modify src or test files",
            title: 'Chores',
            emoji: '??',
          },
          revert: {
            description: 'Reverts a previous commit',
            title: 'Reverts',
            emoji: '??',
          },
          breaking: {
            description: 'A breaking change',
            title: 'Breaking Changes',
            emoji: '??',
          },
        },
      },
      scope: {
        description: 'What is the scope of this change (e.g. component or file name)',
      },
      subject: {
        description: 'Write a short, imperative tense description of the change',
      },
      body: {
        description: 'Provide a longer description of the change',
      },
      isBreaking: {
        description: 'Are there any breaking changes?',
      },
      breakingBody: {
        description:
          'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself',
      },
      breaking: {
        description: 'Describe the breaking changes',
      },
      isIssueAffected: {
        description: 'Does this change affect any open issues?',
      },
      issuesBody: {
        description:
          'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself',
      },
      issues: {
        description: 'Add issue references (e.g. "fix #123", "re #123".)',
      },
    },
  },
};
