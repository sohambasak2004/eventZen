jest.mock('../config', () => ({
  jwt: {
    publicKeyPath: '../auth-service/public.pem',
    algorithm: 'RS256'
  }
}));

const path = require('path');
const { resolveExistingKeyPath } = require('./auth');

describe('resolveExistingKeyPath', () => {
  it('finds the shared auth-service public key from the service codebase', () => {
    const resolvedPath = resolveExistingKeyPath('../auth-service/public.pem');

    expect(resolvedPath).toBe(
      path.resolve(__dirname, '..', '..', '..', 'auth-service', 'public.pem')
    );
  });

  it('returns null when no candidate path exists', () => {
    expect(resolveExistingKeyPath('../auth-service/missing-key.pem')).toBeNull();
  });
});
