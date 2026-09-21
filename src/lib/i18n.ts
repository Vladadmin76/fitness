import type { WgerMuscle } from '../types'

// wger's muscle list is fixed (15 entries) and equipment list is fixed (12
// entries) — hand-translated once here instead of machine-translating on
// every load, since exact ids/names are stable.
const MUSCLE_NAME_RU: Record<number, string> = {
  1: 'Бицепс',
  2: 'Плечи (передние дельты)',
  3: 'Зубчатая мышца',
  4: 'Грудь',
  5: 'Трицепс',
  6: 'Пресс',
  7: 'Икры',
  8: 'Ягодицы',
  9: 'Трапеции',
  10: 'Квадрицепсы',
  11: 'Задняя поверхность бедра',
  12: 'Широчайшие',
  13: 'Плечевая мышца',
  14: 'Косые мышцы живота',
  15: 'Камбаловидная мышца',
}

const EQUIPMENT_NAME_RU: Record<string, string> = {
  Barbell: 'Штанга',
  Bench: 'Скамья',
  'Cable machine': 'Блочный тренажёр',
  Dumbbell: 'Гантели',
  'Gym mat': 'Коврик',
  'Incline bench': 'Наклонная скамья',
  Kettlebell: 'Гиря',
  'Pull-up bar': 'Турник',
  'Resistance band': 'Резинка-эспандер',
  'SZ-Bar': 'EZ-гриф',
  'Swiss Ball': 'Фитбол',
  'none (bodyweight exercise)': 'Без инвентаря (свой вес)',
}

export function muscleNameRu(muscle: WgerMuscle): string {
  return MUSCLE_NAME_RU[muscle.id] ?? muscle.name_en ?? muscle.name
}

export function equipmentNameRu(englishName: string): string {
  return EQUIPMENT_NAME_RU[englishName] ?? englishName
}
