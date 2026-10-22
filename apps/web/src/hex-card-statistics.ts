import type { CardId, RoundPlayerView } from '@hex/shared';

type Metric = { key: string; en: string; zh: string; boolean?: boolean };
const total = (en: string, zh: string): Metric => ({ key: 'total', en, zh });
const points: Metric = { key: 'points', en: 'Points collected', zh: '实际收取分数' };
const triggers: Metric = { key: 'triggers', en: 'Times triggered', zh: '触发次数' };
const copied = total('Tiles copied', '已复制牌数');
const removed = total('Tiles removed', '已移除牌数');
const turns = total('Extra turns awarded', '已获得额外回合');
const armed: Metric = { key: 'armed', en: 'Next-use effect pending', zh: '一次性效果待触发', boolean: true };

// Every card is reviewed here. New metrics require a server value and a localized
// descriptor; the popup renderer accepts any number of rows without card logic.
export const HEX_STATISTICS = {
 'precision-strike': [triggers, { key: 'remaining', en: 'Triggers remaining', zh: '剩余触发次数' }, points],
 'cheat': [armed],
 'machine-malfunction': [removed],
 'point-pong-kong': [triggers, points],
 'great-wall': [total('Points saved', '已减免分数')],
 'petty-theft': [turns],
 'bathroom-break': [{ key: 'exited', en: 'Left this round', zh: '已离开本轮', boolean: true }],
 'willing-victim': [triggers, points],
 'no-more': [armed, removed],
 'collateral-damage': [points],
 'colour-blind': [{ key: 'wins', en: 'Wins with this card', zh: '持卡期间胡牌次数' }],
 'loan-construction': [total('Tiles exchanged', '已交换牌数')],
 'fan-the-flames': [{ key: 'threshold', en: 'Current win threshold (fan)', zh: '当前胡牌门槛（番）' }],
 'jeweled-gauntlet': [{ key: 'rolls', en: 'Eligible settlements', zh: '可暴击结算次数' }, { key: 'criticals', en: 'Critical settlements', zh: '暴击次数' }],
 'sneaky-theft': [turns],
 'troublemaker': [copied],
 'echo': [copied],
 'liandrys-torment': [points, { key: 'pending', en: 'Pending 1-point payments (before reductions)', zh: '待追加的1分付款笔数（减免前）' }],
 'machine-wrath': [removed],
 'hard-work': [copied],
 'blood-river': [{ key: 'wins', en: 'Wins this round', zh: '本局胡牌次数' }, { key: 'locked', en: 'Hand locked / automatic play', zh: '锁手自动行动中', boolean: true }],
 'double-wield': [turns],
 'grand-theft': [turns],
 'radiant-echo': [copied],
} satisfies Record<CardId, readonly Metric[]>;

export function hexCardStatistics(id: CardId, player: RoundPlayerView, lang: 'en' | 'zh'): { key: string; label: string; value: string }[] {
 const values = player.cardStatistics?.[id];
 if (!values) return [];
 return (HEX_STATISTICS[id] as readonly Metric[]).map(metric => {
  const value = values[metric.key] ?? 0;
  return { key: metric.key, label: metric[lang], value: metric.boolean ? (lang === 'zh' ? (value ? '是' : '否') : (value ? 'Yes' : 'No')) : String(value) };
 });
}
