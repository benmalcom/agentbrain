import { describe, it, expect } from '@jest/globals'
import { calculateRelevanceScore } from '../index.js'

describe('calculateRelevanceScore', () => {
  describe('business logic detection', () => {
    it('gives +60 bonus to files with "contract" in path', () => {
      const score = calculateRelevanceScore('src/contracts/FlipGame.sol')
      expect(score).toBeGreaterThanOrEqual(60)
    })

    it('gives +60 bonus to files with "hook" in path', () => {
      const score = calculateRelevanceScore('src/hooks/useWallet.ts')
      expect(score).toBeGreaterThanOrEqual(60)
    })

    it('gives +60 bonus to files with "service" in path', () => {
      const score = calculateRelevanceScore('src/services/AuthService.ts')
      expect(score).toBeGreaterThanOrEqual(60)
    })

    it('gives +60 bonus to files with "api" in path', () => {
      const score = calculateRelevanceScore('src/api/routes.ts')
      expect(score).toBeGreaterThanOrEqual(60)
    })

    it('gives +60 bonus to files with "game" in path', () => {
      const score = calculateRelevanceScore('src/game/FlipLogic.ts')
      // +60 (game keyword) -3 (2 levels * 1.5) = 57
      expect(score).toBeGreaterThanOrEqual(57)
    })

    it('detects business logic regardless of depth', () => {
      const deep = calculateRelevanceScore('a/b/c/d/e/f/contracts/Token.sol')
      expect(deep).toBeGreaterThan(0)
    })
  })

  describe('high-value directory bonus', () => {
    it('gives +40 to files in /hooks directory', () => {
      const score = calculateRelevanceScore('src/hooks/index.ts')
      expect(score).toBeGreaterThanOrEqual(40)
    })

    it('gives +40 to files in /services directory', () => {
      const score = calculateRelevanceScore('src/services/index.ts')
      expect(score).toBeGreaterThanOrEqual(40)
    })

    it('gives +40 to files in /lib directory', () => {
      const score = calculateRelevanceScore('src/lib/utils.ts')
      // +40 (lib dir) -3 (2 levels * 1.5) = 37
      expect(score).toBeGreaterThanOrEqual(37)
    })

    it('gives +40 to files in /api directory', () => {
      const score = calculateRelevanceScore('src/api/index.ts')
      // +40 (api dir) +50 (index) -3 (2 levels * 1.5) = 87
      expect(score).toBeGreaterThanOrEqual(87)
    })

    it('gives +40 to files in /components directory', () => {
      const score = calculateRelevanceScore('src/components/Button.tsx')
      // +40 (components dir) -3 (2 levels * 1.5) = 37
      expect(score).toBeGreaterThanOrEqual(37)
    })
  })

  describe('depth penalty', () => {
    it('uses -1.5 penalty per directory level (not -3)', () => {
      const shallow = calculateRelevanceScore('index.ts')
      const deep = calculateRelevanceScore('a/b/c/index.ts')

      // 3 levels deep = -4.5 penalty
      expect(shallow - deep).toBeCloseTo(4.5, 1)
    })

    it('has 0 depth for root files', () => {
      const score = calculateRelevanceScore('README.md')
      expect(score).toBeGreaterThanOrEqual(100) // Always-include bonus
    })
  })

  describe('always-include files', () => {
    it('gives 100+ score to README.md', () => {
      expect(calculateRelevanceScore('README.md')).toBeGreaterThanOrEqual(100)
    })

    it('gives 100+ score to package.json', () => {
      expect(calculateRelevanceScore('package.json')).toBeGreaterThanOrEqual(100)
    })

    it('gives 100+ score to CLAUDE.md', () => {
      expect(calculateRelevanceScore('CLAUDE.md')).toBeGreaterThanOrEqual(100)
    })

    it('gives 100+ score to .cursorrules', () => {
      expect(calculateRelevanceScore('.cursorrules')).toBeGreaterThanOrEqual(100)
    })
  })

  describe('entry points', () => {
    it('gives +50 bonus to index.ts files', () => {
      const score = calculateRelevanceScore('src/index.ts')
      // +50 (entry point) -1.5 (1 level * 1.5) = 48.5
      expect(score).toBeGreaterThanOrEqual(48)
    })

    it('gives +50 bonus to main.ts files', () => {
      const score = calculateRelevanceScore('src/main.ts')
      // +50 (entry point) -1.5 (1 level * 1.5) = 48.5
      expect(score).toBeGreaterThanOrEqual(48)
    })

    it('gives +50 bonus to app.ts files', () => {
      const score = calculateRelevanceScore('src/app.ts')
      // +50 (entry point) -1.5 (1 level * 1.5) = 48.5
      expect(score).toBeGreaterThanOrEqual(48)
    })
  })

  describe('config files', () => {
    it('gives +30 bonus to .config. files', () => {
      const score = calculateRelevanceScore('jest.config.ts')
      expect(score).toBeGreaterThanOrEqual(30)
    })

    it('gives +30 bonus to .setup. files', () => {
      const score = calculateRelevanceScore('jest.setup.ts')
      expect(score).toBeGreaterThanOrEqual(30)
    })
  })

  describe('test file penalty', () => {
    it('penalizes .test. files by -10', () => {
      const nonTest = calculateRelevanceScore('src/utils.ts')
      const test = calculateRelevanceScore('src/utils.test.ts')
      expect(nonTest - test).toBeGreaterThanOrEqual(10)
    })

    it('penalizes .spec. files by -10', () => {
      const nonTest = calculateRelevanceScore('src/utils.ts')
      const spec = calculateRelevanceScore('src/utils.spec.ts')
      expect(nonTest - spec).toBeGreaterThanOrEqual(10)
    })

    it('penalizes files in __tests__ directory', () => {
      const nonTest = calculateRelevanceScore('src/utils.ts')
      const test = calculateRelevanceScore('src/__tests__/utils.ts')
      expect(nonTest - test).toBeGreaterThanOrEqual(10)
    })
  })

  describe('combined scoring', () => {
    it('prioritizes business logic in high-value dirs despite depth', () => {
      // Deep file but in services AND has "auth" keyword
      const score = calculateRelevanceScore('apps/frontend/src/lib/services/AuthService.ts')

      // Should have:
      // +60 (auth keyword)
      // +40 (services dir)
      // -9 (6 levels deep * 1.5)
      // = 91 total
      expect(score).toBeGreaterThan(80)
    })

    it('gives low score to deep test files', () => {
      const score = calculateRelevanceScore('apps/frontend/src/lib/__tests__/utils.test.ts')

      // Has:
      // +40 (lib dir bonus)
      // -9 (6 levels deep * 1.5)
      // -10 (test file)
      // = 21
      // So not negative, but still relatively low
      expect(score).toBeLessThan(30)
    })
  })
})
