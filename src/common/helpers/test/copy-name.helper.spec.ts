import { getNextCopyName } from '../copy-name.helper';

describe('copy-name.helper', () => {
  describe('getNextCopyName', () => {
    it('should return "name copy (1)" when name has no copy suffix', () => {
      expect(getNextCopyName('KFC')).toBe('KFC copy (1)');
      expect(getNextCopyName('Test Outlet')).toBe('Test Outlet copy (1)');
    });

    it('should return "name copy (2)" when name is "name copy (1)"', () => {
      expect(getNextCopyName('KFC copy (1)')).toBe('KFC copy (2)');
      expect(getNextCopyName('Test Outlet copy (1)')).toBe('Test Outlet copy (2)');
    });

    it('should increment the number when name already has copy (N)', () => {
      expect(getNextCopyName('KFC copy (2)')).toBe('KFC copy (3)');
      expect(getNextCopyName('Outlet copy (10)')).toBe('Outlet copy (11)');
    });

    it('should treat legacy "name copy" (no number) as copy (1)', () => {
      expect(getNextCopyName('KFC copy')).toBe('KFC copy (1)');
      expect(getNextCopyName('Test copy')).toBe('Test copy (1)');
    });

    it('should handle null and empty string', () => {
      expect(getNextCopyName(null)).toBe(' copy (1)');
      expect(getNextCopyName(undefined)).toBe(' copy (1)');
      expect(getNextCopyName('')).toBe(' copy (1)');
    });

    it('should trim whitespace before parsing', () => {
      expect(getNextCopyName('  KFC  ')).toBe('KFC copy (1)');
      expect(getNextCopyName('  KFC copy (1)  ')).toBe('KFC copy (2)');
    });

    it('should parse "copy" case-insensitively and output normalized " copy (N)"', () => {
      expect(getNextCopyName('KFC COPY (1)')).toBe('KFC copy (2)');
      expect(getNextCopyName('KFC Copy (2)')).toBe('KFC copy (3)');
    });
  });
});
