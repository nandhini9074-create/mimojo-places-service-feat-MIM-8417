import { AppService } from './app.service';

describe('AppService', () => {
  let instance;

  beforeEach(() => {
    instance = new AppService();
  });

  it('instance should be an instanceof AppService', () => {
    expect(instance instanceof AppService).toBeTruthy();
  });

  it('should have a method getHello()', () => {
    expect(instance.getHello()).toBe('Hello World!');
  });
});
