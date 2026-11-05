// Gibt Testfälle für die stille Installation als JSON aus. Der Go-Test vergleicht sie mit dem Player.
const { loadCore } = require('./helpers');
const C = loadCore();
const cases = [
  { provider: 'gog', silent: true, target: 'C:\\GOG Games\\A B', logPath: 'C:\\t\\x.log', entryArgs: ['/LANG=german'] },
  { provider: 'gog', silent: true, target: '', logPath: '', entryArgs: [] },
  { provider: 'gog', silent: false, target: 'C:\\x', logPath: '', entryArgs: ['/LANG=german'] },
  { provider: 'epic', silent: true, target: 'C:\\x', logPath: '', entryArgs: ['/quiet', '/norestart'] },
  { provider: 'epic', silent: false, target: '', logPath: '', entryArgs: ['/quiet'] },
  { provider: 'steam', silent: true, target: 'C:\\x', logPath: '', entryArgs: [] },
].map(c => ({ ...c, available: C.silentAvailable(c.provider, c.entryArgs), command: C.installCommand(c.provider, c) }));
process.stdout.write(JSON.stringify(cases));
