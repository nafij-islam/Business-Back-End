import { roundToTwoDecimals, calculatePercentageChange } from './currency.util';

describe('Currency & Financial Math Utils', () => {
  describe('roundToTwoDecimals', () => {
    it('should accurately round floating point numbers to 2 decimal places', () => {
      expect(roundToTwoDecimals(10.555)).toBe(10.56);
      expect(roundToTwoDecimals(10.554)).toBe(10.55);
      expect(roundToTwoDecimals(0.1 + 0.2)).toBe(0.3);
      expect(roundToTwoDecimals(100)).toBe(100);
      expect(roundToTwoDecimals(0)).toBe(0);
    });
  });

  describe('calculatePercentageChange', () => {
    it('should calculate positive growth correctly', () => {
      expect(calculatePercentageChange(150, 100)).toBe(50);
    });

    it('should calculate negative decline correctly', () => {
      expect(calculatePercentageChange(80, 100)).toBe(-20);
    });

    it('should handle zero previous value gracefully without crashing or returning NaN', () => {
      expect(calculatePercentageChange(100, 0)).toBe(100);
      expect(calculatePercentageChange(0, 0)).toBe(0);
    });
  });
});
