import { MYSTERIES } from '../config/Mysteries.js';
import text0 from './mysteries/en.json' with { type: 'json' };
import text1 from './mysteries/de.json' with { type: 'json' };
import text2 from './mysteries/es.json' with { type: 'json' };
import text3 from './mysteries/pt-BR.json' with { type: 'json' };
import text4 from './mysteries/ru.json' with { type: 'json' };
import text5 from './mysteries/zh-CN.json' with { type: 'json' };
import text6 from './mysteries/ko.json' with { type: 'json' };
import text7 from './mysteries/ja.json' with { type: 'json' };
const texts = {"en": text0,"de": text1,"es": text2,"pt-BR": text3,"ru": text4,"zh-CN": text5,"ko": text6,"ja": text7};
const ui = {
  "en": [
    "Veilborn",
    "VEILBORN CONTACT: {name}",
    "DEFEAT BONUS +{score}",
    "VEILBORN DEFEATED +{score}",
    "VEILBORN TEST COMPLETE",
    "RESTART THE GAME TO RETRY",
    "Defeat this Veilborn to unlock counterplay.",
    "Predators",
    "Spatial anomalies",
    "Living ecosystems",
    "War machines",
    "Deceivers",
    "Field sculptors",
    "Temptations",
    "Deep-space legends",
    "THE VEILBORN",
    "Entities emerging from regions where normal space loses coherence. Their origins, motives, and technology remain unknown. Each encounter reveals another fragment of a larger pattern."
  ],
  "de": [
    "Veilborn",
    "VEILBORN-KONTAKT: {name}",
    "SIEGBONUS +{score}",
    "VEILBORN BESIEGT +{score}",
    "VEILBORN-TEST ABGESCHLOSSEN",
    "ZUM WIEDERHOLEN DAS SPIEL NEU STARTEN",
    "Besiege diesen Veilborn, um die Gegentaktik freizuschalten.",
    "Jäger",
    "Raumanomalien",
    "Lebende Ökosysteme",
    "Kriegsmaschinen",
    "Täuscher",
    "Feldformer",
    "Versuchungen",
    "Legenden der Tiefen des Alls",
    "DIE VEILBORN",
    "Wesen aus Regionen, in denen der normale Raum seinen Zusammenhalt verliert. Herkunft, Absichten und Technologie bleiben unbekannt. Jede Begegnung enthüllt ein weiteres Fragment eines größeren Musters."
  ],
  "es": [
    "Veilborn",
    "CONTACTO VEILBORN: {name}",
    "BONIFICACIÓN POR DERROTA +{score}",
    "VEILBORN DERROTADO +{score}",
    "PRUEBA VEILBORN COMPLETADA",
    "REINICIA EL JUEGO PARA REPETIR",
    "Derrota a este Veilborn para revelar cómo contrarrestarlo.",
    "Depredadores",
    "Anomalías espaciales",
    "Ecosistemas vivos",
    "Máquinas de guerra",
    "Engañadores",
    "Escultores del campo",
    "Tentaciones",
    "Leyendas del espacio profundo",
    "LOS VEILBORN",
    "Entidades que emergen de regiones donde el espacio normal pierde coherencia. Su origen, sus motivos y su tecnología siguen siendo desconocidos. Cada encuentro revela otro fragmento de un patrón mayor."
  ],
  "pt-BR": [
    "Veilborn",
    "CONTATO VEILBORN: {name}",
    "BÔNUS POR DERROTA +{score}",
    "VEILBORN DERROTADO +{score}",
    "TESTE VEILBORN CONCLUÍDO",
    "REINICIE O JOGO PARA TENTAR NOVAMENTE",
    "Derrote este Veilborn para revelar como enfrentá-lo.",
    "Predadores",
    "Anomalias espaciais",
    "Ecossistemas vivos",
    "Máquinas de guerra",
    "Enganadores",
    "Escultores do campo",
    "Tentações",
    "Lendas do espaço profundo",
    "OS VEILBORN",
    "Entidades que emergem de regiões onde o espaço normal perde a coerência. Suas origens, intenções e tecnologia permanecem desconhecidas. Cada encontro revela outro fragmento de um padrão maior."
  ],
  "ru": [
    "Veilborn",
    "КОНТАКТ VEILBORN: {name}",
    "БОНУС ЗА ПОБЕДУ +{score}",
    "VEILBORN ПОВЕРЖЕН +{score}",
    "ИСПЫТАНИЕ VEILBORN ЗАВЕРШЕНО",
    "ПЕРЕЗАПУСТИТЕ ИГРУ ДЛЯ ПОВТОРА",
    "Победите этого Veilborn, чтобы открыть тактику противодействия.",
    "Хищники",
    "Пространственные аномалии",
    "Живые экосистемы",
    "Боевые машины",
    "Обманщики",
    "Скульпторы поля",
    "Искушения",
    "Легенды глубокого космоса",
    "VEILBORN",
    "Сущности из областей, где привычное пространство теряет связность. Их происхождение, цели и технологии остаются неизвестными. Каждая встреча открывает ещё один фрагмент более масштабного узора."
  ],
  "zh-CN": [
    "Veilborn",
    "发现 VEILBORN：{name}",
    "击败奖励 +{score}",
    "已击败 VEILBORN +{score}",
    "VEILBORN 测试完成",
    "重新启动游戏即可重试",
    "击败此 Veilborn 以解锁应对策略。",
    "掠食者",
    "空间异常",
    "活体生态",
    "战争机器",
    "欺诈者",
    "战场塑造者",
    "诱惑",
    "深空传说",
    "VEILBORN",
    "这些实体来自常规空间失去连贯性的区域。它们的起源、动机和技术仍然未知。每次遭遇都会揭开某个更大图景的一角。"
  ],
  "ko": [
    "Veilborn",
    "VEILBORN 접촉: {name}",
    "처치 보너스 +{score}",
    "VEILBORN 처치 +{score}",
    "VEILBORN 테스트 완료",
    "다시 시도하려면 게임을 재시작하세요",
    "이 Veilborn을 쓰러뜨리면 대응법이 공개됩니다.",
    "포식자",
    "공간 변칙",
    "살아 있는 생태계",
    "전쟁 기계",
    "기만자",
    "전장 조형자",
    "유혹",
    "심우주의 전설",
    "VEILBORN",
    "정상 공간의 일관성이 무너지는 영역에서 나타나는 존재들입니다. 그 기원과 목적, 기술은 아직 알려지지 않았습니다. 매번의 조우가 더 거대한 패턴의 조각을 드러냅니다."
  ],
  "ja": [
    "Veilborn",
    "VEILBORNを捕捉：{name}",
    "撃破ボーナス +{score}",
    "VEILBORNを撃破 +{score}",
    "VEILBORNテスト完了",
    "再挑戦するにはゲームを再起動",
    "このVeilbornを倒すと対処法が解放されます。",
    "捕食者",
    "空間異常",
    "生きた生態系",
    "戦争機械",
    "欺く者",
    "戦場の造形者",
    "誘惑",
    "深宇宙の伝説",
    "VEILBORN",
    "通常空間の整合性が失われる領域から現れる存在。その起源も目的も技術も、いまだ不明。遭遇するたびに、より大きな構図の断片が明らかになる。"
  ]
};
export const VEILBORN_INTRO = ui.en[16];
const families = ['predator', 'spatial', 'ecosystem', 'machine', 'deceiver', 'sculptor', 'temptation', 'legend'];
export function getMysteryText(profile, locale = 'en') {
  const index = MYSTERIES.findIndex(row => row.id === profile.id);
  const [description, tip] = (texts[locale] || texts.en)[index] || [];
  return { name: profile.name, description, tip, role: (ui[locale] || ui.en)[7 + families.indexOf(profile.family)] };
}
export function getMysterySourceText(locale = 'en') {
  const target = ui[locale] || ui.en, entries = ui.en.flatMap((key, i) => [[key, target[i]], [key.toUpperCase(), target[i].toUpperCase()]]);
  texts.en.forEach((pair, i) => pair.forEach((key, j) => entries.push([key, (texts[locale] || texts.en)[i][j]])));
  return Object.fromEntries(entries);
}
