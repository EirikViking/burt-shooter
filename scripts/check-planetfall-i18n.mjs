import assert from 'node:assert/strict';
import {translateTextForLocale} from '../src/i18n/index.js';
import * as planetfall from '../src/i18n/planetfallText.js';
assert.equal(typeof planetfall.getPlanetfallCodexText,'function','the natural encounter needs its own localized Codex identity');
const english=planetfall.getPlanetfallCodexText('en');
for(const locale of ['de','es','pt-BR','ru','zh-CN','ko','ja']){
 const text=planetfall.getPlanetfallCodexText(locale);
 for(const key of ['role','description','tip'])assert(text[key]&&text[key]!==english[key]&&!/TODO|FALLBACK|MISSING/.test(text[key]),`${locale}: ${key}`);
 assert.equal(text.name,'Planetfall');
}
for(const locale of ['de','es','pt-BR','ru','zh-CN','ko','ja'])for(const source of ['CORE EXPOSED','CORE SEALED','ORBITAL RUPTURE']){
 const text=translateTextForLocale(locale,source);assert(text&&text!==source,`${locale}: ${source}`);
 assert(!/TODO|FALLBACK|MISSING/.test(text));
}
console.log('[planetfall] PASS all phase labels translated in seven non-English locales');
