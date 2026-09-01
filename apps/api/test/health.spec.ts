import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('bootstrap', () => {
  it('creates the application module', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(module).toBeDefined();
  });
});
