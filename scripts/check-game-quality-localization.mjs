import assert from 'node:assert/strict';
import {translateTextForLocale} from '../src/i18n/index.js';

const failures=[];
const readableSources=['Counter advice','SCOUT RUN COMPLETE','NO CAREER XP',
  'SCOUT RUN: NO CAREER XP OR RANKED PROGRESS','Unranked practice',
  'Scout Best: {score}','This Run: {score}','No leaderboard submission',
  'New Scout Best','ONE MORE SCOUT RUN'];
const scripts={'zh-CN':/[\u4e00-\u9fff]/,ru:/[\u0400-\u04ff]/,ko:/[\uac00-\ud7af]/,ja:/[\u3040-\u30ff\u4e00-\u9fff]/};
for(const [locale,characters]of Object.entries(scripts))for(const source of readableSources){
  const text=translateTextForLocale(locale,source,{score:12345});
  if(!characters.test(text))failures.push(`${locale}: romanized or English-only result: ${source}`);
  if(source.includes('{score}')&&!text.includes('12345'))failures.push(`${locale}: lost score placeholder`);
}
for(const locale of ['de','zh-CN','ru','es','pt-BR','ko','ja'])for(const source of ['Next goal: Run ranked for the boards','NEXT GOAL: RUN RANKED FOR THE BOARDS']){
  const text=translateTextForLocale(locale,source);
  if(/run ranked for the boards/i.test(text))failures.push(`${locale}: untranslated Scout next goal`);
}
assert.deepEqual(failures,[]);
console.log('[game-quality-localization] PASS native-script result guidance, all-language Scout goal and score placeholders');
