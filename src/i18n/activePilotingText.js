const keys = [
  "Phase: next volley +50% damage (1.8s)",
  "Phase instantly reloads your weapon and charges your next normal volley for 1.8 seconds. That volley deals 50% more damage. Bombs do not consume the charge.",
  "Up to five rift shards; damage scales with your weapon and sector.",
  "PHASE REACTOR + PHASE WAKE. The first five shots cleared by your dodge pulse return as shards. Damage scales with weapon power and sector depth, up to Sector 200. Shards target nearby threats and grant no bonus score.",
  "Graze distinct bullets while vulnerable to build your streak. Phase and other invulnerability limit graze counting. Three grazes arm Graze Break."
];
const rows = {
  "en": [
    "Phase: next volley +50% damage (1.8s)",
    "Phase instantly reloads your weapon and charges your next normal volley for 1.8 seconds. That volley deals 50% more damage. Bombs do not consume the charge.",
    "Up to five rift shards; damage scales with your weapon and sector.",
    "PHASE REACTOR + PHASE WAKE. The first five shots cleared by your dodge pulse return as shards. Damage scales with weapon power and sector depth, up to Sector 200. Shards target nearby threats and grant no bonus score.",
    "Graze distinct bullets while vulnerable to build your streak. Phase and other invulnerability limit graze counting. Three grazes arm Graze Break."
  ],
  "de": [
    "Phase: nächste Salve +50 % Schaden (1,8 s)",
    "Phase lädt deine Waffe sofort nach und verstärkt deine nächste normale Salve für 1,8 Sekunden. Diese Salve verursacht 50 % mehr Schaden. Bomben verbrauchen die Ladung nicht.",
    "Bis zu fünf Risssplitter; ihr Schaden steigt mit Waffe und Sektor.",
    "PHASE REACTOR + PHASE WAKE. Die ersten fünf vom Ausweichimpuls gelöschten Geschosse kehren als Splitter zurück. Ihr Schaden steigt mit Waffenstärke und Sektortiefe bis Sektor 200. Splitter zielen auf nahe Gegner und gewähren keine Bonuspunkte.",
    "Streife unterschiedliche Geschosse, während du verwundbar bist, um deine Serie aufzubauen. Phase und andere Unverwundbarkeit begrenzen die Zählung. Drei Streifer laden Graze Break."
  ],
  "es": [
    "Fase: próxima descarga +50 % de daño (1,8 s)",
    "Fase recarga tu arma al instante y potencia tu próxima descarga normal durante 1,8 segundos. Esa descarga inflige un 50 % más de daño. Las bombas no consumen la carga.",
    "Hasta cinco fragmentos de grieta; el daño aumenta con tu arma y sector.",
    "PHASE REACTOR + PHASE WAKE. Los primeros cinco proyectiles eliminados por tu pulso de esquiva regresan como fragmentos. El daño aumenta con la potencia del arma y el sector, hasta el sector 200. Los fragmentos apuntan a amenazas cercanas y no otorgan puntos extra.",
    "Roza proyectiles distintos mientras eres vulnerable para aumentar tu racha. Fase y otras formas de invulnerabilidad limitan el recuento. Tres roces preparan Graze Break."
  ],
  "pt-BR": [
    "Fase: próxima rajada +50% de dano (1,8 s)",
    "A Fase recarrega sua arma imediatamente e fortalece sua próxima rajada normal por 1,8 segundos. Essa rajada causa 50% mais dano. Bombas não consomem a carga.",
    "Até cinco fragmentos de fenda; o dano aumenta com sua arma e setor.",
    "PHASE REACTOR + PHASE WAKE. Os primeiros cinco projéteis eliminados pelo pulso de esquiva voltam como fragmentos. O dano aumenta com a força da arma e o setor, até o setor 200. Os fragmentos miram ameaças próximas e não concedem pontos extras.",
    "Passe rente a projéteis diferentes enquanto estiver vulnerável para aumentar sua sequência. A Fase e outras formas de invulnerabilidade limitam a contagem. Três raspões preparam Graze Break."
  ],
  "ru": [
    "Фаза: следующий залп наносит +50% урона (1,8 с)",
    "Фаза мгновенно перезаряжает оружие и на 1,8 секунды усиливает следующий обычный залп. Он наносит на 50% больше урона. Бомбы не расходуют заряд.",
    "До пяти осколков разлома; урон растёт с мощностью оружия и сектором.",
    "PHASE REACTOR + PHASE WAKE. Первые пять пуль, уничтоженных импульсом уклонения, возвращаются осколками. Урон растёт с мощностью оружия и глубиной сектора вплоть до сектора 200. Осколки нацеливаются на ближайшие угрозы и не дают дополнительных очков.",
    "Проходите рядом с разными пулями, оставаясь уязвимым, чтобы наращивать серию. Фаза и другие виды неуязвимости ограничивают подсчёт. Три опасных сближения заряжают Graze Break."
  ],
  "zh-CN": [
    "相位：下次齐射伤害 +50%（1.8秒）",
    "相位立即装填武器，并为下次普通齐射充能，充能持续1.8秒。该次齐射伤害提高50%。炸弹不会消耗充能。",
    "最多五枚裂隙碎片；伤害随武器强度和区域提升。",
    "PHASE REACTOR + PHASE WAKE。闪避脉冲清除的前五枚子弹会化为碎片反击。伤害随武器强度和区域深度提升，区域加成上限为第200区。碎片瞄准附近威胁，不提供额外分数。",
    "在可受伤状态下擦过不同子弹可累积连段。相位及其他无敌状态会限制擦弹计数。三次擦弹即可准备Graze Break。"
  ],
  "ja": [
    "Phase：次の斉射ダメージ+50%（1.8秒）",
    "Phaseは武器を即座に装填し、次の通常斉射を強化します。強化の有効時間は1.8秒で、その斉射のダメージが50%増加します。ボムは強化を消費しません。",
    "最大5発のリフトシャード。武器とセクターに応じて威力が上昇。",
    "PHASE REACTOR + PHASE WAKE。回避パルスで消した最初の5発がシャードとなって反撃します。威力は武器性能とセクター進行に応じて上がり、セクター加算は200で上限に達します。近くの敵を狙い、追加スコアは発生しません。",
    "無敵でない間に異なる弾をかすると連続グレイズになります。Phaseなどの無敵中はカウントが制限されます。3回でGraze Breakが準備されます。"
  ],
  "ko": [
    "페이즈: 다음 일제 사격 피해 +50% (1.8초)",
    "페이즈가 무기를 즉시 재장전하고 다음 일반 일제 사격을 강화합니다. 강화는 1.8초 동안 유지되며 해당 사격의 피해가 50% 증가합니다. 폭탄은 강화를 소모하지 않습니다.",
    "균열 파편 최대 5개. 무기와 섹터에 따라 피해가 증가합니다.",
    "PHASE REACTOR + PHASE WAKE. 회피 펄스로 지운 첫 5발이 파편으로 돌아와 반격합니다. 피해는 무기 위력과 섹터 진행도에 따라 증가하며 섹터 보너스는 200에서 최대가 됩니다. 파편은 가까운 적을 노리며 추가 점수를 주지 않습니다.",
    "무적이 아닐 때 서로 다른 탄환을 스치면 연속 그레이즈가 쌓입니다. 페이즈 등 무적 상태에서는 집계가 제한됩니다. 3회 스치면 Graze Break가 준비됩니다."
  ]
};
export function getActivePilotingText(locale='en'){return Object.fromEntries(keys.map((key,i)=>[key,(rows[locale]||rows.en)[i]]));}
