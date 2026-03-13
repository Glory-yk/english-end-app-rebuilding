import { Test, TestingModule } from '@nestjs/testing';
import { SM2Service, SM2Input } from './sm2.service';

describe('SM2Service', () => {
  let service: SM2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SM2Service],
    }).compile();

    service = module.get<SM2Service>(SM2Service);
  });

  const defaultInput: SM2Input = {
    quality: 4,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
  };

  describe('First review (repetitions=0)', () => {
    it('should set interval to 1 day on quality >= 3', () => {
      const result = service.calculate({ ...defaultInput, quality: 4 });
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
      expect(result.status).toBe('review');
    });

    it('should reset on quality < 3', () => {
      const result = service.calculate({ ...defaultInput, quality: 2 });
      expect(result.interval).toBe(0);
      expect(result.repetitions).toBe(0);
      expect(result.status).toBe('learning');
    });

    it('should set interval to 0 on quality = 0 (completely unknown)', () => {
      const result = service.calculate({ ...defaultInput, quality: 0 });
      expect(result.interval).toBe(0);
      expect(result.repetitions).toBe(0);
      expect(result.status).toBe('learning');
    });
  });

  describe('Second review (repetitions=1)', () => {
    it('should set interval to 6 days on success', () => {
      const result = service.calculate({
        ...defaultInput,
        quality: 4,
        repetitions: 1,
        interval: 1,
      });
      expect(result.interval).toBe(6);
      expect(result.repetitions).toBe(2);
    });

    it('should reset on failure', () => {
      const result = service.calculate({
        ...defaultInput,
        quality: 1,
        repetitions: 1,
        interval: 1,
      });
      expect(result.interval).toBe(0);
      expect(result.repetitions).toBe(0);
    });
  });

  describe('Subsequent reviews (repetitions >= 2)', () => {
    it('should multiply interval by ease factor', () => {
      const result = service.calculate({
        ...defaultInput,
        quality: 4,
        repetitions: 2,
        interval: 6,
        easeFactor: 2.5,
      });
      expect(result.interval).toBe(15); // round(6 * 2.5) = 15
      expect(result.repetitions).toBe(3);
    });

    it('should use updated ease factor for interval calculation', () => {
      const result = service.calculate({
        ...defaultInput,
        quality: 5,
        repetitions: 3,
        interval: 15,
        easeFactor: 2.6,
      });
      expect(result.interval).toBe(41); // round(15 * 2.7) - EF 2.6 + 0.1 for quality=5
    });
  });

  describe('Ease Factor', () => {
    it('should never go below 1.3', () => {
      const result = service.calculate({
        ...defaultInput,
        quality: 0,
        easeFactor: 1.3,
      });
      expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
    });

    it('should increase ease factor on quality = 5', () => {
      const result = service.calculate({
        ...defaultInput,
        quality: 5,
        easeFactor: 2.5,
      });
      expect(result.easeFactor).toBe(2.6);
    });

    it('should keep ease factor same on quality = 4', () => {
      const result = service.calculate({
        ...defaultInput,
        quality: 4,
        easeFactor: 2.5,
      });
      expect(result.easeFactor).toBe(2.5);
    });

    it('should decrease ease factor on quality = 3', () => {
      const result = service.calculate({
        ...defaultInput,
        quality: 3,
        easeFactor: 2.5,
      });
      expect(result.easeFactor).toBe(2.36);
    });

    it('should significantly decrease on quality = 0', () => {
      const result = service.calculate({
        ...defaultInput,
        quality: 0,
        easeFactor: 2.5,
      });
      // EF = 2.5 + (0.1 - 5*(0.08 + 5*0.02)) = 2.5 + (0.1 - 0.9) = 1.7
      expect(result.easeFactor).toBe(1.7);
    });

    it('should clamp to 1.3 when calculation goes below', () => {
      const result = service.calculate({
        ...defaultInput,
        quality: 0,
        easeFactor: 1.5,
      });
      expect(result.easeFactor).toBe(1.3);
    });
  });

  describe('Status transitions', () => {
    it('should be learning when repetitions = 0', () => {
      const result = service.calculate({ ...defaultInput, quality: 1 });
      expect(result.status).toBe('learning');
    });

    it('should be review when interval < 21', () => {
      const result = service.calculate({
        ...defaultInput,
        quality: 4,
        repetitions: 1,
        interval: 1,
      });
      expect(result.status).toBe('review');
    });

    it('should be mastered when interval >= 21', () => {
      const result = service.calculate({
        ...defaultInput,
        quality: 5,
        repetitions: 3,
        interval: 15,
        easeFactor: 2.5,
      });
      // interval = round(15 * 2.6) = 39 >= 21
      expect(result.status).toBe('mastered');
    });
  });

  describe('Next review date', () => {
    it('should set to today for interval = 0', () => {
      const result = service.calculate({ ...defaultInput, quality: 0 });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(result.nextReview.getTime()).toBe(today.getTime());
    });

    it('should set to tomorrow for interval = 1', () => {
      const result = service.calculate({ ...defaultInput, quality: 4 });
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      expect(result.nextReview.getTime()).toBe(tomorrow.getTime());
    });
  });

  describe('Edge cases', () => {
    it('should handle quality = 3 (barely passing)', () => {
      const result = service.calculate({ ...defaultInput, quality: 3 });
      expect(result.repetitions).toBe(1);
      expect(result.interval).toBe(1);
    });

    it('should handle consecutive failures', () => {
      let result = service.calculate({ ...defaultInput, quality: 0 });
      result = service.calculate({ quality: 0, ...result });
      expect(result.repetitions).toBe(0);
      expect(result.interval).toBe(0);
      expect(result.status).toBe('learning');
    });
  });
});
