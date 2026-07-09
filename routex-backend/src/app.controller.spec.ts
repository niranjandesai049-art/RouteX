import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { BookingService } from './booking/booking.service';
import { AiService } from './ai/ai.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  const mockBookingService = {};
  const mockAiService = {};
  const mockPrismaService = {};

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: BookingService, useValue: mockBookingService },
        { provide: AiService, useValue: mockAiService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return healthy status', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
    });
  });
});
