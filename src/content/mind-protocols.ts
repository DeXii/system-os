export const SWOT_HINTS = {
  strengths: 'Внутренние сильные стороны в ситуации',
  weaknesses: 'Уязвимости, ограничения',
  opportunities: 'Внешние возможности',
  threats: 'Внешние риски и угрозы',
};

export const COGNITIVE_BIAS_HINTS = [
  'Подтверждение (confirmation bias)',
  'Якорение',
  'Эффект ореола',
  'Planning fallacy',
  'Sunk cost',
];

export const CHESS_PLATFORMS = [
  { id: 'lichess', label: 'Lichess' },
  { id: 'chesscom', label: 'Chess.com' },
  { id: 'ogs', label: 'OGS (Go)' },
  { id: 'otb', label: 'OTB' },
  { id: 'other', label: 'Другое' },
] as const;
