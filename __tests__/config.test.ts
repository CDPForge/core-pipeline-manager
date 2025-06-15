import Config from '../src/config';
import * as fs from 'fs';
import YAML from 'yaml';

// Mock fs.readFileSync and YAML.parse
jest.mock('fs');
jest.mock('yaml');

describe('Classe Config', () => {
  let readFileSyncMock: jest.Mock;
  let parseMock: jest.Mock;

  beforeEach(() => {
    // Reset mock before each test
    readFileSyncMock = fs.readFileSync as jest.Mock;
    parseMock = YAML.parse as jest.Mock;
  });

  afterEach(() => {
    (Config as any).instance = null;
  });

  it('dovrebbe creare una singola istanza di Config', () => {
    // Simulate file reading and parsing
    readFileSyncMock.mockReturnValue('chiave: valore');
    parseMock.mockReturnValue({ chiave: 'valore' });

    const config1 = Config.getInstance();
    const config2 = Config.getInstance();

    // Verify that the same instance is returned
    expect(config1).toBe(config2);
  });

  it('dovrebbe leggere e parsificare correttamente il file di configurazione', () => {
    const mockConfigData = { chiave: 'valore' };
    readFileSyncMock.mockReturnValue('chiave: valore');
    parseMock.mockReturnValue(mockConfigData);

    const config = Config.getInstance();

    // Verify that the data returned by the configuration is correct
    expect(config.config).toEqual(mockConfigData);
  });

  it('dovrebbe gestire correttamente gli errori durante la lettura o parsificazione del file', () => {
    // Simulate a file reading error
    readFileSyncMock.mockImplementation(() => {
      throw new Error('Errore di lettura del file');
    });

    // Verify that an error is thrown when trying to create the instance
    expect(() => Config.getInstance()).toThrow('Errore di lettura del file');
  });
});
