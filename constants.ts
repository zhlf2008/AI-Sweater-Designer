import { Config } from './types';

export const DEFAULT_CONFIG: Config = {
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
];

export const STATIC_PROMPT_SUFFIX = "";