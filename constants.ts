import { Config } from './types';

export const DEFAULT_CONFIG: Config = {
  apiProvider: 'gemini',
  userApiKey: '',
  steps: 8,
  timeShift: 3.0,
  categories: [
    {
      id: 'color',
      label: '毛衣颜色',
      items: ["奶油白", "焦糖橘", "莫兰迪绿", "燕麦色", "复古红"]
    },
    {
      id: 'material',
      label: '面料材质',
      items: ["山羊绒", "蓬松马海毛", "亲肤棉线", "粗旷羊毛"]
    },
    {
      id: 'collar',
      label: '领型选择',
      items: ["经典圆领", "优雅V领", "高领保暖", "Polo翻领"]
    },
    {
      id: 'fit',
      label: '剪裁风格',
      items: ["慵懒宽松", "修身款", "复古箱型"]
    },
    {
      id: 'style',
      label: '整体风格',
      items: [
        "温暖色调，8k超清细节，时尚摄影特写，柔和唯美光影",
        "自然清新，日系风格，明亮光线，生活感",
        "复古胶片，电影感，高对比度，颗粒质感",
        "极简主义，冷淡风，棚拍质感，干净背景"
      ]
    }
  ]
};

export const RESOLUTIONS = [
  { value: "1024x1024", label: "1024x1024 (1:1)" },
  { value: "864x1152", label: "864x1152 (3:4)" },
  { value: "1152x864", label: "1152x864 (4:3)" },
  { value: "1248x832", label: "1248x832 (3:2)" },
  { value: "832x1248", label: "832x1248 (2:3)" },
  { value: "1280x720", label: "1280x720 (16:9)" },
  { value: "720x1280", label: "720x1280 (9:16)" },
  { value: "1344x576", label: "1344x576 (21:9)" },
  { value: "576x1344", label: "576x1344 (9:21)" },
];

export const STATIC_PROMPT_SUFFIX = "";