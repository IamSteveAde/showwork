const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
exports.load = function load(file, mocks = {}, cache = new Map()) {
  file = path.resolve(root, file); if (cache.has(file)) return cache.get(file);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {fileName:file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const mod = { exports: {} };
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if(name.endsWith('.module.css'))return {__esModule:true,default:new Proxy({},{get:(_target,key)=>String(key)})};
    if (name.startsWith('@/') || name.startsWith('.')) {
      const target = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(file), name);
      const resolved=/\.tsx?$/.test(target)?target:fs.existsSync(target+'.ts')?target+'.ts':fs.existsSync(target+'.tsx')?target+'.tsx':path.join(target,'index.ts');
      return load(resolved, mocks, cache);
    }
    return require(name);
  };
  try { new Function('require', 'module', 'exports', source)(localRequire, mod, mod.exports); }
  catch (error) { if (error instanceof SyntaxError) error.message += ' in '+path.relative(root,file); throw error; }
  cache.set(file, mod.exports); return mod.exports;
};
