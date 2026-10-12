const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
exports.load = function load(file, mocks = {}, cache = new Map()) {
  file = path.resolve(root, file); if (cache.has(file)) return cache.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('@/') || name.startsWith('.')) {
      const target = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(file), name);
      return load(target.endsWith('.ts') ? target : target + '.ts', mocks, cache);
    }
    return require(name);
  };
  try { new Function('require', 'module', 'exports', source)(localRequire, mod, mod.exports); }
  catch (error) { if (error instanceof SyntaxError) error.message += ' in '+path.relative(root,file); throw error; }
  cache.set(file, mod.exports); return mod.exports;
};
