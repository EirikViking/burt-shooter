const COPY = Object.freeze({
  de: Object.freeze({
    'TOURS': 'TOUREN', 'TOURS ×{count}': 'TOUREN ×{count}',
    'Q / B PASS // HOLD: LOCK BUILD': 'Q / B PASS // HALTEN: BUILD SPERREN', 'LOCK BUILD {percent}%': 'BUILD SPERREN {percent}%',
    'BUILD LOCKED': 'BUILD GESPERRT', 'Current upgrades kept. Future Drafts disabled for this run.': 'Aktuelle Upgrades bleiben. Weitere Drafts sind für diesen Run deaktiviert.', 'BUILD LOCKED // NO MORE DRAFTS': 'BUILD GESPERRT // KEINE WEITEREN DRAFTS',
    'HOLOGRAM TARGETS // CONTACT SAFE': 'HOLOGRAMM-ZIELE // KONTAKT SICHER', 'SKILL FLIGHT: {pattern}\nBREAK HOLOGRAM TARGETS // CONTACT SAFE': 'SKILL-FLUG: {pattern}\nHOLOGRAMM-ZIELE TREFFEN // KONTAKT SICHER',
    'CPU RIVAL': 'CPU-RIVALE', 'STEAM PILOTS + CPU RIVALS': 'STEAM-PILOTEN + CPU-RIVALEN', 'PAGE {page}/{pages}': 'SEITE {page}/{pages}',
    'TOP 50 BREACHED': 'TOP 50 DURCHBROCHEN', 'TOP 50 GATE': 'TOP-50-SCHRANKE', 'TOP 50 GATE: #{rank} {name} // {score} MORE': 'TOP-50-SCHRANKE: #{rank} {name} // {score} MEHR'
  }),
  es: Object.freeze({
    'TOURS': 'GIRAS', 'TOURS ×{count}': 'GIRAS ×{count}',
    'Q / B PASS // HOLD: LOCK BUILD': 'Q / B PASAR // MANTÉN: BLOQUEAR BUILD', 'LOCK BUILD {percent}%': 'BLOQUEAR BUILD {percent}%',
    'BUILD LOCKED': 'BUILD BLOQUEADA', 'Current upgrades kept. Future Drafts disabled for this run.': 'Conservas las mejoras actuales. Los próximos Drafts quedan desactivados en esta partida.', 'BUILD LOCKED // NO MORE DRAFTS': 'BUILD BLOQUEADA // SIN MÁS DRAFTS',
    'HOLOGRAM TARGETS // CONTACT SAFE': 'BLANCOS HOLOGRÁFICOS // CONTACTO SEGURO', 'SKILL FLIGHT: {pattern}\nBREAK HOLOGRAM TARGETS // CONTACT SAFE': 'VUELO DE HABILIDAD: {pattern}\nROMPE BLANCOS HOLOGRÁFICOS // CONTACTO SEGURO',
    'CPU RIVAL': 'RIVAL CPU', 'STEAM PILOTS + CPU RIVALS': 'PILOTOS STEAM + RIVALES CPU', 'PAGE {page}/{pages}': 'PÁGINA {page}/{pages}',
    'TOP 50 BREACHED': 'TOP 50 SUPERADO', 'TOP 50 GATE': 'ACCESO AL TOP 50', 'TOP 50 GATE: #{rank} {name} // {score} MORE': 'ACCESO TOP 50: #{rank} {name} // FALTAN {score}'
  }),
  ru: Object.freeze({
    'TOURS': 'ТУРЫ', 'TOURS ×{count}': 'ТУРЫ ×{count}',
    'Q / B PASS // HOLD: LOCK BUILD': 'Q / B ПАС // УДЕРЖ.: ЗАКРЕПИТЬ БИЛД', 'LOCK BUILD {percent}%': 'ЗАКРЕПИТЬ БИЛД {percent}%',
    'BUILD LOCKED': 'БИЛД ЗАКРЕПЛЁН', 'Current upgrades kept. Future Drafts disabled for this run.': 'Текущие улучшения сохранены. Дальнейшие драфты в этом забеге отключены.', 'BUILD LOCKED // NO MORE DRAFTS': 'БИЛД ЗАКРЕПЛЁН // ДРАФТОВ БОЛЬШЕ НЕТ',
    'HOLOGRAM TARGETS // CONTACT SAFE': 'ГОЛОЦЕЛИ // КОНТАКТ БЕЗОПАСЕН', 'SKILL FLIGHT: {pattern}\nBREAK HOLOGRAM TARGETS // CONTACT SAFE': 'ПОЛЁТ МАСТЕРСТВА: {pattern}\nРАЗБЕЙТЕ ГОЛОЦЕЛИ // КОНТАКТ БЕЗОПАСЕН',
    'CPU RIVAL': 'CPU-СОПЕРНИК', 'STEAM PILOTS + CPU RIVALS': 'ПИЛОТЫ STEAM + CPU-СОПЕРНИКИ', 'PAGE {page}/{pages}': 'СТР. {page}/{pages}',
    'TOP 50 BREACHED': 'ТОП-50 ПРОБИТ', 'TOP 50 GATE': 'ПОРОГ ТОП-50', 'TOP 50 GATE: #{rank} {name} // {score} MORE': 'ПОРОГ ТОП-50: #{rank} {name} // ЕЩЁ {score}'
  }),
  'zh-CN': Object.freeze({
    'TOURS': '巡航', 'TOURS ×{count}': '巡航 ×{count}', 'Q / B PASS // HOLD: LOCK BUILD': 'Q / B 跳过 // 长按：锁定配置', 'LOCK BUILD {percent}%': '锁定配置 {percent}%',
    'BUILD LOCKED': '配置已锁定', 'Current upgrades kept. Future Drafts disabled for this run.': '保留当前升级。本次航程不再出现战术选秀。', 'BUILD LOCKED // NO MORE DRAFTS': '配置已锁定 // 不再选秀',
    'HOLOGRAM TARGETS // CONTACT SAFE': '全息目标 // 接触安全', 'SKILL FLIGHT: {pattern}\nBREAK HOLOGRAM TARGETS // CONTACT SAFE': '技巧飞行：{pattern}\n击破全息目标 // 接触安全', 'CPU RIVAL': 'CPU 对手', 'STEAM PILOTS + CPU RIVALS': 'STEAM 飞行员 + CPU 对手', 'PAGE {page}/{pages}': '第 {page}/{pages} 页',
    'TOP 50 BREACHED': '已突破前50', 'TOP 50 GATE': '前50门槛', 'TOP 50 GATE: #{rank} {name} // {score} MORE': '前50门槛：#{rank} {name} // 还差 {score}'
  }),
  'pt-BR': Object.freeze({
    'TOURS': 'TURNÊS', 'TOURS ×{count}': 'TURNÊS ×{count}', 'Q / B PASS // HOLD: LOCK BUILD': 'Q / B PASSAR // SEGURE: TRAVAR BUILD', 'LOCK BUILD {percent}%': 'TRAVAR BUILD {percent}%',
    'BUILD LOCKED': 'BUILD TRAVADA', 'Current upgrades kept. Future Drafts disabled for this run.': 'Melhorias atuais mantidas. Próximos Drafts desativados nesta partida.', 'BUILD LOCKED // NO MORE DRAFTS': 'BUILD TRAVADA // SEM MAIS DRAFTS',
    'HOLOGRAM TARGETS // CONTACT SAFE': 'ALVOS HOLOGRÁFICOS // CONTATO SEGURO', 'SKILL FLIGHT: {pattern}\nBREAK HOLOGRAM TARGETS // CONTACT SAFE': 'VOO DE HABILIDADE: {pattern}\nQUEBRE ALVOS HOLOGRÁFICOS // CONTATO SEGURO', 'CPU RIVAL': 'RIVAL CPU', 'STEAM PILOTS + CPU RIVALS': 'PILOTOS STEAM + RIVAIS CPU', 'PAGE {page}/{pages}': 'PÁGINA {page}/{pages}',
    'TOP 50 BREACHED': 'TOP 50 ROMPIDO', 'TOP 50 GATE': 'PORTA DO TOP 50', 'TOP 50 GATE: #{rank} {name} // {score} MORE': 'PORTA DO TOP 50: #{rank} {name} // MAIS {score}'
  }),
  ko: Object.freeze({
    'TOURS': '투어', 'TOURS ×{count}': '투어 ×{count}', 'Q / B PASS // HOLD: LOCK BUILD': 'Q / B 패스 // 길게: 빌드 잠금', 'LOCK BUILD {percent}%': '빌드 잠금 {percent}%',
    'BUILD LOCKED': '빌드 잠금', 'Current upgrades kept. Future Drafts disabled for this run.': '현재 업그레이드를 유지합니다. 이번 런의 이후 드래프트는 비활성화됩니다.', 'BUILD LOCKED // NO MORE DRAFTS': '빌드 잠금 // 이후 드래프트 없음',
    'HOLOGRAM TARGETS // CONTACT SAFE': '홀로그램 표적 // 접촉 안전', 'SKILL FLIGHT: {pattern}\nBREAK HOLOGRAM TARGETS // CONTACT SAFE': '스킬 플라이트: {pattern}\n홀로그램 표적 파괴 // 접촉 안전', 'CPU RIVAL': 'CPU 라이벌', 'STEAM PILOTS + CPU RIVALS': 'STEAM 파일럿 + CPU 라이벌', 'PAGE {page}/{pages}': '페이지 {page}/{pages}',
    'TOP 50 BREACHED': 'TOP 50 돌파', 'TOP 50 GATE': 'TOP 50 관문', 'TOP 50 GATE: #{rank} {name} // {score} MORE': 'TOP 50 관문: #{rank} {name} // {score} 더'
  }),
  ja: Object.freeze({
    'TOURS': 'ツアー', 'TOURS ×{count}': 'ツアー ×{count}', 'Q / B PASS // HOLD: LOCK BUILD': 'Q / B パス // 長押し：ビルド固定', 'LOCK BUILD {percent}%': 'ビルド固定 {percent}%',
    'BUILD LOCKED': 'ビルド固定', 'Current upgrades kept. Future Drafts disabled for this run.': '現在のアップグレードを維持し、このランの以降のドラフトを無効にします。', 'BUILD LOCKED // NO MORE DRAFTS': 'ビルド固定 // 以降ドラフトなし',
    'HOLOGRAM TARGETS // CONTACT SAFE': 'ホログラム標的 // 接触安全', 'SKILL FLIGHT: {pattern}\nBREAK HOLOGRAM TARGETS // CONTACT SAFE': 'スキルフライト：{pattern}\nホログラム標的を破壊 // 接触安全', 'CPU RIVAL': 'CPUライバル', 'STEAM PILOTS + CPU RIVALS': 'STEAMパイロット + CPUライバル', 'PAGE {page}/{pages}': 'ページ {page}/{pages}',
    'TOP 50 BREACHED': 'トップ50突破', 'TOP 50 GATE': 'トップ50ゲート', 'TOP 50 GATE: #{rank} {name} // {score} MORE': 'トップ50ゲート: #{rank} {name} // あと {score}'
  })
});

const EXTRA_COPY = Object.freeze({
  de: Object.freeze({
    'STEAM SCORE DECK': 'STEAM-PUNKTETAFEL', 'STEAM RANK SIGNAL // VERIFIED PILOTS': 'STEAM-RANGSIGNAL // VERIFIZIERTE PILOTEN', 'HOLOGRAM TARGETS {kills}/{total} // CONTACT SAFE': 'HOLOGRAMM-ZIELE {kills}/{total} // KONTAKT SICHER',
    'RANKED MEDALS': 'RANGLISTEN-MEDAILLEN', 'PASS // HOLD: LOCK BUILD': 'PASS // HALTEN: BUILD SPERREN', 'LOCKING BUILD {percent}%': 'BUILD WIRD GESPERRT {percent}%',
    'NO MORE DRAFTS THIS RUN': 'KEINE WEITEREN DRAFTS IN DIESEM RUN', 'LOCK BUILD = NO MORE DRAFTS THIS RUN': 'BUILD SPERREN = KEINE WEITEREN DRAFTS', 'CPU RIVALS // NOT STEAM RANKS': 'CPU-RIVALEN // KEINE STEAM-RÄNGE',
    'Rescan once, hold one card for the next boss, tap Pass to skip one Draft, or hold Pass to lock your current build and stop later Drafts.': 'Scanne einmal neu, halte eine Karte für den nächsten Boss, tippe Pass zum Überspringen oder halte Pass, um dein Build zu sperren und spätere Drafts zu stoppen.',
    'Harmless hologram targets test aim during a live run. Break them before they exit for a grade and bounded bonus; touching or missing them cannot damage the ship or break no-hit status.': 'Harmlose Hologramm-Ziele testen dein Zielen im Run. Zerstöre sie vor dem Ausgang für Note und begrenzten Bonus; Berühren oder Verfehlen verursacht keinen Schaden und bricht keinen No-Hit-Status.',
    'Ranked Mayhem earns Bronze, Silver, and Gold ship medals. Tours count legitimate ten-sector flights in Mayhem, Overrun, or Sector Run without changing ranked mastery.': 'Ranglisten-Mayhem vergibt Bronze-, Silber- und Goldmedaillen. Touren zählen echte Zehn-Sektoren-Flüge in Mayhem, Overrun oder Sector Run, ohne die Ranglisten-Meisterschaft zu ändern.',
    'A Skill Flight temporarily introduces harmless one-hit hologram targets. They never shoot, deal contact damage, or compromise no-hit integrity. Read the choreography, lead your shots, and clear as many as possible before they exit for a PERFECT, A, B, C, or MISS grade and a bounded score bonus.': 'Ein Skill-Flug zeigt kurz harmlose Hologramm-Ziele mit einem Trefferpunkt. Sie schießen nie, verursachen keinen Kontaktschaden und gefährden keinen No-Hit-Status. Lies ihre Bewegung und zerstöre möglichst viele für PERFECT, A, B, C oder MISS und einen begrenzten Punktebonus.',
    'The Hangar is the roster and career desk. Each hull has ranked Mayhem medals: Sector 3 for Bronze, Sector 6 for Silver, and a clear for Gold. Tours are separate veteran marks: one legitimate ten-sector flight in Mayhem, Overrun, or Sector Run. Scout and Daily do not award Tours.': 'Der Hangar ist Flotten- und Karrierezentrale. Jede Hülle hat eigene Ranglisten-Mayhem-Medaillen: Sektor 3 für Bronze, Sektor 6 für Silber und ein Abschluss für Gold. Touren sind getrennte Veteranenzeichen: ein echter Zehn-Sektoren-Flug in Mayhem, Overrun oder Sector Run. Scout und Daily vergeben keine Touren.'
  }),
  es: Object.freeze({
    'STEAM SCORE DECK': 'TABLERO STEAM', 'STEAM RANK SIGNAL // VERIFIED PILOTS': 'SEÑAL DE RANGO STEAM // PILOTOS VERIFICADOS', 'HOLOGRAM TARGETS {kills}/{total} // CONTACT SAFE': 'BLANCOS HOLOGRÁFICOS {kills}/{total} // CONTACTO SEGURO',
    'RANKED MEDALS': 'MEDALLAS RANKED', 'PASS // HOLD: LOCK BUILD': 'PASAR // MANTÉN: BLOQUEAR BUILD', 'LOCKING BUILD {percent}%': 'BLOQUEANDO BUILD {percent}%',
    'NO MORE DRAFTS THIS RUN': 'SIN MÁS DRAFTS EN ESTA PARTIDA', 'LOCK BUILD = NO MORE DRAFTS THIS RUN': 'BLOQUEAR BUILD = SIN MÁS DRAFTS', 'CPU RIVALS // NOT STEAM RANKS': 'RIVALES CPU // NO SON RANGOS STEAM',
    'Rescan once, hold one card for the next boss, tap Pass to skip one Draft, or hold Pass to lock your current build and stop later Drafts.': 'Reescanea una vez, guarda una carta para el siguiente jefe, toca Pasar para omitir un Draft o mantén Pasar para bloquear tu build y detener los Drafts posteriores.',
    'Harmless hologram targets test aim during a live run. Break them before they exit for a grade and bounded bonus; touching or missing them cannot damage the ship or break no-hit status.': 'Los blancos holográficos inofensivos prueban tu puntería. Rómpelos antes de que salgan para obtener nota y bono limitado; tocarlos o fallarlos no daña la nave ni rompe el estado sin golpes.',
    'Ranked Mayhem earns Bronze, Silver, and Gold ship medals. Tours count legitimate ten-sector flights in Mayhem, Overrun, or Sector Run without changing ranked mastery.': 'Mayhem ranked otorga medallas de Bronce, Plata y Oro. Las Giras cuentan vuelos legítimos de diez sectores en Mayhem, Overrun o Sector Run sin cambiar la maestría ranked.',
    'A Skill Flight temporarily introduces harmless one-hit hologram targets. They never shoot, deal contact damage, or compromise no-hit integrity. Read the choreography, lead your shots, and clear as many as possible before they exit for a PERFECT, A, B, C, or MISS grade and a bounded score bonus.': 'Un Vuelo de habilidad añade temporalmente blancos holográficos inofensivos de un golpe. Nunca disparan, dañan por contacto ni rompen el estado sin golpes. Lee su movimiento y destruye tantos como puedas para una nota PERFECT, A, B, C o MISS y un bono limitado.',
    'The Hangar is the roster and career desk. Each hull has ranked Mayhem medals: Sector 3 for Bronze, Sector 6 for Silver, and a clear for Gold. Tours are separate veteran marks: one legitimate ten-sector flight in Mayhem, Overrun, or Sector Run. Scout and Daily do not award Tours.': 'El Hangar es la flota y la carrera. Cada casco tiene medallas de Mayhem ranked: Sector 3 para Bronce, Sector 6 para Plata y una victoria para Oro. Las Giras son marcas veteranas separadas: un vuelo legítimo de diez sectores en Mayhem, Overrun o Sector Run. Scout y Daily no otorgan Giras.'
  }),
  ru: Object.freeze({
    'STEAM SCORE DECK': 'ТАБЛИЦА STEAM', 'STEAM RANK SIGNAL // VERIFIED PILOTS': 'РАНГОВЫЙ СИГНАЛ STEAM // ПРОВЕРЕННЫЕ ПИЛОТЫ', 'HOLOGRAM TARGETS {kills}/{total} // CONTACT SAFE': 'ГОЛОЦЕЛИ {kills}/{total} // КОНТАКТ БЕЗОПАСЕН',
    'RANKED MEDALS': 'РЕЙТИНГОВЫЕ МЕДАЛИ', 'PASS // HOLD: LOCK BUILD': 'ПАС // УДЕРЖ.: ЗАКРЕПИТЬ БИЛД', 'LOCKING BUILD {percent}%': 'ЗАКРЕПЛЕНИЕ БИЛДА {percent}%',
    'NO MORE DRAFTS THIS RUN': 'БЕЗ ДАЛЬНЕЙШИХ ДРАФТОВ', 'LOCK BUILD = NO MORE DRAFTS THIS RUN': 'ЗАКРЕПИТЬ БИЛД = БЕЗ ДРАФТОВ', 'CPU RIVALS // NOT STEAM RANKS': 'CPU-СОПЕРНИКИ // НЕ РАНГИ STEAM',
    'Rescan once, hold one card for the next boss, tap Pass to skip one Draft, or hold Pass to lock your current build and stop later Drafts.': 'Один раз обновите выбор, сохраните карту для следующего босса, нажмите Пас для пропуска или удерживайте Пас, чтобы закрепить билд и отключить следующие драфты.',
    'Harmless hologram targets test aim during a live run. Break them before they exit for a grade and bounded bonus; touching or missing them cannot damage the ship or break no-hit status.': 'Безопасные голографические цели проверяют меткость. Разбейте их до ухода ради оценки и ограниченного бонуса; касание или промах не повреждает корабль и не нарушает статус без попаданий.',
    'Ranked Mayhem earns Bronze, Silver, and Gold ship medals. Tours count legitimate ten-sector flights in Mayhem, Overrun, or Sector Run without changing ranked mastery.': 'Рейтинговый Mayhem дает бронзовые, серебряные и золотые медали. Туры считают честные полеты по десять секторов в Mayhem, Overrun или Sector Run, не меняя рейтинговое мастерство.',
    'A Skill Flight temporarily introduces harmless one-hit hologram targets. They never shoot, deal contact damage, or compromise no-hit integrity. Read the choreography, lead your shots, and clear as many as possible before they exit for a PERFECT, A, B, C, or MISS grade and a bounded score bonus.': 'Полет мастерства временно добавляет безопасные голографические цели на один выстрел. Они не стреляют, не наносят контактный урон и не нарушают статус без попаданий. Читайте движение и уничтожьте максимум целей ради оценки PERFECT, A, B, C или MISS и ограниченного бонуса.',
    'The Hangar is the roster and career desk. Each hull has ranked Mayhem medals: Sector 3 for Bronze, Sector 6 for Silver, and a clear for Gold. Tours are separate veteran marks: one legitimate ten-sector flight in Mayhem, Overrun, or Sector Run. Scout and Daily do not award Tours.': 'Ангар — центр флота и карьеры. У каждого корпуса есть медали рейтингового Mayhem: сектор 3 — бронза, сектор 6 — серебро, завершение — золото. Туры — отдельная отметка ветерана: один честный полет по десяти секторам в Mayhem, Overrun или Sector Run. Scout и Daily не дают Туры.'
  }),
  'zh-CN': Object.freeze({
    'STEAM SCORE DECK': 'STEAM 得分榜', 'STEAM RANK SIGNAL // VERIFIED PILOTS': 'STEAM 排名信号 // 已验证飞行员', 'HOLOGRAM TARGETS {kills}/{total} // CONTACT SAFE': '全息目标 {kills}/{total} // 接触安全',
    'RANKED MEDALS': '排位奖章', 'PASS // HOLD: LOCK BUILD': '跳过 // 长按：锁定配置', 'LOCKING BUILD {percent}%': '正在锁定配置 {percent}%', 'NO MORE DRAFTS THIS RUN': '本局不再选秀', 'LOCK BUILD = NO MORE DRAFTS THIS RUN': '锁定配置 = 本局不再选秀', 'CPU RIVALS // NOT STEAM RANKS': 'CPU 对手 // 非 STEAM 排名',
    'Rescan once, hold one card for the next boss, tap Pass to skip one Draft, or hold Pass to lock your current build and stop later Drafts.': '可重抽一次，为下个首领保留一张卡；点按跳过本次选秀，或长按跳过以锁定当前配置并停止后续选秀。',
    'Harmless hologram targets test aim during a live run. Break them before they exit for a grade and bounded bonus; touching or missing them cannot damage the ship or break no-hit status.': '无害的全息目标会在实战中测试瞄准。离场前击破可获得评级和有限奖励；接触或漏掉不会伤害飞船，也不会破坏无伤状态。',
    'Ranked Mayhem earns Bronze, Silver, and Gold ship medals. Tours count legitimate ten-sector flights in Mayhem, Overrun, or Sector Run without changing ranked mastery.': '排位 Mayhem 可获得铜、银、金飞船奖章。巡航统计在 Mayhem、Overrun 或 Sector Run 中完成的正规十扇区飞行，不影响排位精通。',
    'A Skill Flight temporarily introduces harmless one-hit hologram targets. They never shoot, deal contact damage, or compromise no-hit integrity. Read the choreography, lead your shots, and clear as many as possible before they exit for a PERFECT, A, B, C, or MISS grade and a bounded score bonus.': '技巧飞行会暂时加入一击即破的无害全息目标。它们不会射击、造成接触伤害或破坏无伤状态。观察移动、提前射击，在离场前尽量击破，以获得 PERFECT、A、B、C 或 MISS 评级和有限分数奖励。',
    'The Hangar is the roster and career desk. Each hull has ranked Mayhem medals: Sector 3 for Bronze, Sector 6 for Silver, and a clear for Gold. Tours are separate veteran marks: one legitimate ten-sector flight in Mayhem, Overrun, or Sector Run. Scout and Daily do not award Tours.': '机库是舰队与生涯中心。每种船体都有独立的排位 Mayhem 奖章：到达扇区 3 获铜牌、扇区 6 获银牌、通关获金牌。巡航是独立的老兵标记：在 Mayhem、Overrun 或 Sector Run 中完成一次正规十扇区飞行。Scout 与 Daily 不奖励巡航。'
  }),
  'pt-BR': Object.freeze({
    'STEAM SCORE DECK': 'PLACAR STEAM', 'STEAM RANK SIGNAL // VERIFIED PILOTS': 'SINAL DE RANK STEAM // PILOTOS VERIFICADOS', 'HOLOGRAM TARGETS {kills}/{total} // CONTACT SAFE': 'ALVOS HOLOGRÁFICOS {kills}/{total} // CONTATO SEGURO',
    'RANKED MEDALS': 'MEDALHAS RANKED', 'PASS // HOLD: LOCK BUILD': 'PASSAR // SEGURE: TRAVAR BUILD', 'LOCKING BUILD {percent}%': 'TRAVANDO BUILD {percent}%', 'NO MORE DRAFTS THIS RUN': 'SEM MAIS DRAFTS NESTA PARTIDA', 'LOCK BUILD = NO MORE DRAFTS THIS RUN': 'TRAVAR BUILD = SEM MAIS DRAFTS', 'CPU RIVALS // NOT STEAM RANKS': 'RIVAIS CPU // NÃO SÃO RANKS STEAM',
    'Rescan once, hold one card for the next boss, tap Pass to skip one Draft, or hold Pass to lock your current build and stop later Drafts.': 'Reescaneie uma vez, guarde uma carta para o próximo chefe, toque Passar para pular um Draft ou segure Passar para travar sua build e impedir Drafts posteriores.',
    'Harmless hologram targets test aim during a live run. Break them before they exit for a grade and bounded bonus; touching or missing them cannot damage the ship or break no-hit status.': 'Alvos holográficos inofensivos testam sua mira. Quebre-os antes da saída para obter nota e bônus limitado; tocar ou errar não danifica a nave nem quebra o estado sem dano.',
    'Ranked Mayhem earns Bronze, Silver, and Gold ship medals. Tours count legitimate ten-sector flights in Mayhem, Overrun, or Sector Run without changing ranked mastery.': 'Mayhem ranked concede medalhas de Bronze, Prata e Ouro. Turnês contam voos legítimos de dez setores em Mayhem, Overrun ou Sector Run sem alterar a maestria ranked.',
    'A Skill Flight temporarily introduces harmless one-hit hologram targets. They never shoot, deal contact damage, or compromise no-hit integrity. Read the choreography, lead your shots, and clear as many as possible before they exit for a PERFECT, A, B, C, or MISS grade and a bounded score bonus.': 'Um Voo de Habilidade adiciona temporariamente alvos holográficos inofensivos de um golpe. Eles nunca atiram, causam dano de contato ou quebram o estado sem dano. Leia o movimento e destrua o máximo possível para nota PERFECT, A, B, C ou MISS e um bônus limitado.',
    'The Hangar is the roster and career desk. Each hull has ranked Mayhem medals: Sector 3 for Bronze, Sector 6 for Silver, and a clear for Gold. Tours are separate veteran marks: one legitimate ten-sector flight in Mayhem, Overrun, or Sector Run. Scout and Daily do not award Tours.': 'O Hangar é a central da frota e da carreira. Cada casco tem medalhas de Mayhem ranked: Setor 3 para Bronze, Setor 6 para Prata e uma conclusão para Ouro. Turnês são marcas veteranas separadas: um voo legítimo de dez setores em Mayhem, Overrun ou Sector Run. Scout e Daily não concedem Turnês.'
  }),
  ko: Object.freeze({
    'STEAM SCORE DECK': 'STEAM 스코어 덱', 'STEAM RANK SIGNAL // VERIFIED PILOTS': 'STEAM 랭크 신호 // 인증 파일럿', 'HOLOGRAM TARGETS {kills}/{total} // CONTACT SAFE': '홀로그램 표적 {kills}/{total} // 접촉 안전',
    'RANKED MEDALS': '랭크 메달', 'PASS // HOLD: LOCK BUILD': '패스 // 길게: 빌드 잠금', 'LOCKING BUILD {percent}%': '빌드 잠금 중 {percent}%', 'NO MORE DRAFTS THIS RUN': '이번 런에 더 이상 드래프트 없음', 'LOCK BUILD = NO MORE DRAFTS THIS RUN': '빌드 잠금 = 이후 드래프트 없음', 'CPU RIVALS // NOT STEAM RANKS': 'CPU 라이벌 // STEAM 순위 아님',
    'Rescan once, hold one card for the next boss, tap Pass to skip one Draft, or hold Pass to lock your current build and stop later Drafts.': '한 번 재탐색하고 다음 보스를 위해 카드 한 장을 보관하세요. 패스를 누르면 한 번 건너뛰고, 길게 누르면 현재 빌드를 잠그고 이후 드래프트를 중단합니다.',
    'Harmless hologram targets test aim during a live run. Break them before they exit for a grade and bounded bonus; touching or missing them cannot damage the ship or break no-hit status.': '무해한 홀로그램 표적이 실전에서 조준을 시험합니다. 퇴장 전에 파괴하면 등급과 제한 보너스를 받으며, 접촉하거나 놓쳐도 함선 피해나 노히트 상태 손실이 없습니다.',
    'Ranked Mayhem earns Bronze, Silver, and Gold ship medals. Tours count legitimate ten-sector flights in Mayhem, Overrun, or Sector Run without changing ranked mastery.': '랭크 Mayhem은 동, 은, 금 함선 메달을 제공합니다. 투어는 Mayhem, Overrun 또는 Sector Run의 정상적인 10개 섹터 비행을 세며 랭크 숙련도에는 영향을 주지 않습니다.',
    'A Skill Flight temporarily introduces harmless one-hit hologram targets. They never shoot, deal contact damage, or compromise no-hit integrity. Read the choreography, lead your shots, and clear as many as possible before they exit for a PERFECT, A, B, C, or MISS grade and a bounded score bonus.': '스킬 플라이트는 한 번에 파괴되는 무해한 홀로그램 표적을 잠시 추가합니다. 사격이나 접촉 피해가 없고 노히트 상태를 해치지 않습니다. 움직임을 읽고 퇴장 전에 최대한 파괴해 PERFECT, A, B, C 또는 MISS 등급과 제한 점수 보너스를 받으세요.',
    'The Hangar is the roster and career desk. Each hull has ranked Mayhem medals: Sector 3 for Bronze, Sector 6 for Silver, and a clear for Gold. Tours are separate veteran marks: one legitimate ten-sector flight in Mayhem, Overrun, or Sector Run. Scout and Daily do not award Tours.': '격납고는 함선 명단과 커리어 공간입니다. 각 선체에는 랭크 Mayhem 메달이 있습니다. 섹터 3은 동, 섹터 6은 은, 클리어는 금입니다. 투어는 별도의 베테랑 표시로 Mayhem, Overrun 또는 Sector Run에서 정상적으로 10개 섹터를 비행하면 1회입니다. Scout와 Daily는 투어를 주지 않습니다.'
  }),
  ja: Object.freeze({
    'STEAM SCORE DECK': 'STEAMスコアデッキ', 'STEAM RANK SIGNAL // VERIFIED PILOTS': 'STEAMランク信号 // 確認済みパイロット', 'HOLOGRAM TARGETS {kills}/{total} // CONTACT SAFE': 'ホログラム標的 {kills}/{total} // 接触安全',
    'RANKED MEDALS': 'ランクメダル', 'PASS // HOLD: LOCK BUILD': 'パス // 長押し：ビルド固定', 'LOCKING BUILD {percent}%': 'ビルド固定中 {percent}%', 'NO MORE DRAFTS THIS RUN': 'このランでは以降ドラフトなし', 'LOCK BUILD = NO MORE DRAFTS THIS RUN': 'ビルド固定 = 以降ドラフトなし', 'CPU RIVALS // NOT STEAM RANKS': 'CPUライバル // STEAM順位ではありません',
    'Rescan once, hold one card for the next boss, tap Pass to skip one Draft, or hold Pass to lock your current build and stop later Drafts.': '1回再スキャンし、次のボス用にカードを1枚保留できます。パスを押すと1回スキップし、長押しすると現在のビルドを固定して以降のドラフトを停止します。',
    'Harmless hologram targets test aim during a live run. Break them before they exit for a grade and bounded bonus; touching or missing them cannot damage the ship or break no-hit status.': '無害なホログラム標的が実戦中の照準を試します。退場前に破壊すると評価と限定ボーナスを獲得。接触や見逃しで機体が損傷したりノーヒット状態が崩れたりしません。',
    'Ranked Mayhem earns Bronze, Silver, and Gold ship medals. Tours count legitimate ten-sector flights in Mayhem, Overrun, or Sector Run without changing ranked mastery.': 'ランクMayhemでは銅・銀・金の機体メダルを獲得できます。ツアーはMayhem、Overrun、Sector Runでの正規の10セクター飛行を数え、ランク熟練度には影響しません。',
    'A Skill Flight temporarily introduces harmless one-hit hologram targets. They never shoot, deal contact damage, or compromise no-hit integrity. Read the choreography, lead your shots, and clear as many as possible before they exit for a PERFECT, A, B, C, or MISS grade and a bounded score bonus.': 'スキルフライトでは一撃で壊れる無害なホログラム標的が一時的に出現します。射撃も接触ダメージもなく、ノーヒット状態を損ないません。動きを読み、退場前にできるだけ多く破壊してPERFECT、A、B、C、MISSの評価と限定スコアボーナスを獲得します。',
    'The Hangar is the roster and career desk. Each hull has ranked Mayhem medals: Sector 3 for Bronze, Sector 6 for Silver, and a clear for Gold. Tours are separate veteran marks: one legitimate ten-sector flight in Mayhem, Overrun, or Sector Run. Scout and Daily do not award Tours.': 'ハンガーは機体名簿とキャリアの拠点です。各機体にはランクMayhemメダルがあり、セクター3で銅、セクター6で銀、クリアで金です。ツアーは別のベテラン記録で、Mayhem、Overrun、Sector Runの正規の10セクター飛行1回を数えます。ScoutとDailyではツアーを獲得できません。'
  })
});

export function getTyrian125SourceText(locale = 'en') {
  return { ...(COPY[locale] || {}), ...(EXTRA_COPY[locale] || {}) };
}
