module.exports = {
  siteTitle: "黄文浩 | LLM · 机器学习 · 地理空间智能",
  siteDescription: "黄文浩的个人网站，展示 LLM、机器学习、多模态文档理解与地理空间智能方向。",
  name: "黄文浩",
  latinName: "",
  role: "LLM / 机器学习 / 地理空间智能",
  location: "西北农林科技大学 · 本科在读",
  availability: "开放 LLM、机器学习与地理空间智能交流",
  headline: "——观万物而不为，明心境而少言",
  summary: "西北农林科技大学本科在读，聚焦大语言模型、机器学习与地理空间智能方向。具备多模态训练数据构建、OCR 文档理解、数据质量校验与训练准备经验；以扎实的数理基础为底座，持续探索语言、视觉与空间信息的联合建模。",
  greeting: "你好，我是黄文浩的 AI 分身。你可以问我关于机器学习方向、DocLayLLM 项目、教育背景、技能能力或合作交流的问题。",
  guestbook: {
    enabled: true,
    adminPassword: ""
  },
  links: [
    {
      label: "邮箱",
      value: "wenhao_h2007@163.com",
      href: "mailto:wenhao_h2007@163.com"
    },
    {
      label: "微信",
      value: "h3435738857"
    },
    {
      label: "QQ",
      value: "3435738857"
    }
  ],
  facts: [
    {
      label: "方向",
      value: "LLM、机器学习、地理空间智能与多模态文档理解"
    },
    {
      label: "项目",
      value: "DocLayLLM 多模态文档理解训练数据工程"
    },
    {
      label: "能力",
      value: "训练数据构建、OCR 空间对齐与质量校验"
    },
    {
      label: "探索",
      value: "GIS、遥感智能分析与地理大模型"
    }
  ],
  modules: [
    {
      id: "about",
      eyebrow: "Profile",
      title: "关于我",
      summary: "以数理基础进入机器学习、多模态理解与地理空间智能方向。",
      accent: "#173c34",
      chips: ["机器学习", "多模态", "地理空间智能"],
      stats: [
        { label: "当前状态", value: "本科在读" },
        { label: "专业/学院", value: "资源环境学院 · 地理信息科学专业" },
        { label: "核心方向", value: "LLM / 机器学习" }
      ],
      sections: [
        {
          heading: "我关注什么",
          body: "我聚焦大语言模型、机器学习与地理空间智能，关注训练数据、模型输入与验证流程之间的关系；希望将语言、视觉与空间信息转化为可学习、可验证的模型能力。"
        },
        {
          heading: "我如何学习",
          body: "从数理训练和建模竞赛出发，我逐步进入多模态训练数据、OCR 文档理解和空间智能领域；先厘清数据与任务边界，再组织可复现的处理与验证流程。"
        },
        {
          heading: "长期方向",
          body: "地理空间智能与地理大模型是我的长期探索方向。我正在学习 GIS、地理空间数据处理与遥感智能分析，关注空间推理和地理信息理解的机器学习应用。"
        }
      ]
    },
    {
      id: "highlights",
      eyebrow: "Highlights",
      title: "技术方向",
      summary: "以多模态训练数据、机器学习与空间智能为主线持续积累。",
      accent: "#9a6a1f",
      chips: ["LLM", "机器学习", "GIS"],
      cards: [
        {
          label: "LLM",
          title: "大语言模型",
          description: "持续学习 LLM、监督微调数据组织与模型训练流程。",
          tags: ["SFT", "Training Data"]
        },
        {
          label: "Multimodal",
          title: "多模态文档理解",
          description: "围绕图像、OCR 文本与版面坐标开展训练数据构建实践。",
          tags: ["OCR", "Document AI"]
        },
        {
          label: "Data",
          title: "训练数据工程",
          description: "关注多源标注转换、样本组织、数据质量与训练前验证。",
          tags: ["JSONL", "Data Quality"]
        },
        {
          label: "GeoAI",
          title: "地理空间智能",
          description: "持续学习 GIS、遥感智能分析与空间推理方法。",
          tags: ["GIS", "Remote Sensing"]
        },
        {
          label: "Foundation",
          title: "数理建模基础",
          description: "数理训练与建模竞赛经验支撑机器学习中的结构化问题拆解。",
          tags: ["Modeling", "Reasoning"]
        },
        {
          label: "Learning",
          title: "持续探索",
          description: "围绕语言、视觉与空间信息的联合建模持续积累。",
          tags: ["Vision", "Spatial Intelligence"]
        }
      ]
    },
    {
      id: "projects",
      eyebrow: "Projects",
      title: "项目与作品",
      summary: "以 DocLayLLM 多模态训练数据工程为实践起点，向 LLM 与地理空间智能延伸。",
      accent: "#243c5a",
      chips: ["LLM", "SFT", "OCR", "Multimodal", "GeoAI"],
      projects: [
        {
          title: "DocLayLLM 多模态文档理解训练数据工程",
          role: "数据工程 / 训练准备 / 多模态 SFT",
          description: "面向图像、OCR 文本与版面空间坐标的联合建模，构建 DocLayLLM 的 OCR-grounded SFT 数据集，完成多源文档标注的规范化转换、训练样本构建与数据校验。",
          contributions: [
            "围绕 image、ocr、instruction、response 组织规范化训练样本。",
            "处理 OCR 文本与版面空间坐标，完成多模态训练数据对齐。",
            "构建 JSONL 数据集并完成训练前数据质量校验。"
          ],
          tags: ["DocLayLLM", "SFT", "OCR", "JSONL", "Multimodal"]
        },
        {
          title: "地理空间智能与地理大模型探索",
          role: "学习与研究方向",
          description: "以地理空间数据、遥感信息与空间推理为长期探索方向，持续学习 GIS、地理数据处理与地理大模型相关方法。",
          contributions: [
            "关注语言、视觉与空间信息的联合表示。",
            "学习地理空间数据处理与遥感智能分析方法。",
            "探索地理大模型在空间推理与地理信息理解中的应用。"
          ],
          tags: ["GIS", "GeoAI", "Remote Sensing", "Spatial Reasoning"]
        },
        {
          title: "数理建模基础",
          role: "队长 / 建模 / 协作",
          description: "参与美国大学生数学建模竞赛 MCM/ICM 与统计建模训练并担任队长，将数理训练形成的结构化思维迁移至机器学习任务。",
          contributions: [
            "推进问题拆解、变量组织与结果解释。",
            "组织模型表达、论文协作与任务推进。",
            "为机器学习任务积累数理建模与结构化分析基础。"
          ],
          tags: ["MCM/ICM", "Modeling", "Data Analysis", "Leadership"]
        }
      ],
      works: [
        {
          title: "交互作品与代码实验",
          role: "个人作品 / MATLAB / 前端代码实验",
          description: "整理本地交互页面、MATLAB 可视化尝试和代码实验作品，把零散练习沉淀成可以直接打开、浏览和复盘的作品入口。",
          contributions: [
            "粒子作品侧重动态视觉、页面交互和空间氛围表达。",
            "MATLAB 合集收纳数学建模、可视化和仿真实验相关页面。",
            "代码合集保留前端页面、创意实验和学习过程中的可运行成果。"
          ],
          tags: ["Particle", "MATLAB", "Code", "Interactive", "Visualization"],
          links: [
            {
              href: "/works/粒子.html",
              label: "粒子作品"
            },
            {
              href: "/works/matlab/index.html",
              label: "MATLAB 合集"
            },
            {
              href: "/works/code/index.html",
              label: "代码合集"
            }
          ]
        }
      ]
    },
    {
      id: "skills",
      eyebrow: "Skills",
      title: "能力栈",
      summary: "围绕训练数据、多模态理解与空间智能持续构建技术能力。",
      accent: "#173c34",
      chips: ["Python", "LLM", "OCR", "GIS"],
      skillGroups: [
        {
          title: "Machine Learning & Data",
          items: ["Python", "数据清洗", "JSONL 数据集构建", "数据质量校验", "训练前验证", "可追溯数据组织"]
        },
        {
          title: "LLM & Multimodal",
          items: ["LLM", "SFT 数据构建", "OCR", "文档理解", "图像文本空间坐标", "多模态训练数据"]
        },
        {
          title: "GeoAI",
          items: ["GIS", "地理空间数据", "遥感智能分析", "空间推理", "地理大模型", "持续学习"]
        },
        {
          title: "Modeling Foundation",
          items: ["数理建模", "统计建模", "问题拆解", "结果解释", "团队协同", "公开表达"]
        }
      ]
    },
    {
      id: "timeline",
      eyebrow: "Timeline",
      title: "经历时间线",
      summary: "以数理基础为起点，持续向 LLM、机器学习与空间智能拓展。",
      accent: "#44515a",
      chips: ["教育背景", "学生工作", "公共服务"],
      timeline: [
        {
          period: "2025.09 - 至今",
          title: "西北农林科技大学",
          meta: "本科在读 · 资源环境学院 · 地理信息科学专业",
          body: "本科在读，聚焦大语言模型、机器学习与地理空间智能方向；以地理信息科学专业背景为基础，持续学习多模态文档理解与空间智能。",
          tags: ["本科", "LLM", "机器学习", "GeoAI"]
        },
        {
          period: "2022.09 - 2025.06",
          title: "曲靖市第二中学",
          meta: "高中 · 团支书",
          body: "高中阶段数学多次年级第一，数学与物理长期保持年级前列。担任团支书，参与学习分享、组织协同与班级服务。",
          tags: ["团支书", "讲题分享", "数理基础"]
        },
        {
          period: "寒假",
          title: "曲靖市沾益区团委",
          meta: "政府实习 · 志愿者",
          body: "协助材料整理、信息录入与核对、基础政务流程支持，在文件流转、会议保障和群众服务等场景中提升行政执行、信息处理和责任意识。",
          tags: ["公共服务", "信息处理", "沟通协作"]
        },
        {
          period: "志愿服务",
          title: "杨马志愿服务",
          meta: "赛事服务 · 志愿者",
          body: "参与赛事服务、秩序维护、路线引导、物资发放等工作，在高强度公共活动中保持耐心、协同和执行力。",
          tags: ["志愿服务", "现场执行", "协同"]
        }
      ]
    },
    {
      id: "honors",
      eyebrow: "Honors",
      title: "荣誉成果",
      summary: "只保留公开展示中最有信息密度的事实，避免堆砌。",
      accent: "#9a6a1f",
      honors: [
        "第 41 届奥林匹克物理竞赛三等奖，云南赛区。",
        "高中数学多次年级第一，数学、物理长期保持年级前列。",
        "高数卷面满分。",
        "专业前 10.6%。",
        "专业二等奖学金。",
        "曾获优秀团员、优秀班干部、新时代好少年等荣誉。"
      ]
    },
    {
      id: "contact",
      eyebrow: "Contact",
      title: "联系我",
      summary: "适合围绕 LLM、机器学习、地理空间智能和学习交流展开沟通。",
      accent: "#173c34",
      contacts: [
        { label: "邮箱", value: "wenhao_h2007@163.com", href: "mailto:wenhao_h2007@163.com" },
        { label: "微信", value: "h3435738857" },
        { label: "QQ", value: "3435738857" },
        { label: "电话", value: "15608744434", href: "tel:15608744434" }
      ],
      sections: [
        {
          heading: "适合联系我的情况",
          body: "LLM 与多模态学习交流、机器学习项目协作、地理空间智能讨论、数据处理实践与技术作品交流。"
        },
        {
          heading: "联系时建议带上",
          body: "目标、时间节点、已有资料、预期产出和你希望我承担的部分。信息越具体，沟通越高效。"
        }
      ]
    },
    {
      id: "guestbook",
      eyebrow: "Guestbook",
      title: "留言板",
      summary: "访客可以在这里留下建议、想法或合作意向。留言会公开展示。",
      accent: "#173c34",
      chips: ["公开留言", "建议反馈", "合作意向"]
    },
    {
      id: "assistant",
      eyebrow: "Ask",
      title: "AI 分身",
      summary: "访客可以直接提问，回答会基于公开资料、机器学习项目与个人表达风格生成。",
      accent: "#44515a",
      chips: ["AI 问答", "公开资料", "互动介绍"]
    }
  ],
  knowledgeBase: [
    {
      topic: "个人背景",
      keywords: ["你是谁", "介绍", "背景", "个人简介", "学校", "专业"],
      answer: "我是黄文浩，西北农林科技大学资源环境学院地理信息科学专业本科在读，方向聚焦大语言模型、机器学习与地理空间智能；正在从数理建模延伸到多模态训练数据、OCR 文档理解和空间智能。"
    },
    {
      topic: "竞赛荣誉",
      keywords: ["荣誉", "奖项", "竞赛", "物理竞赛", "奖学金", "成绩"],
      answer: "我曾获第 41 届奥林匹克物理竞赛三等奖（云南赛区），高中阶段数学多次年级第一，数学和物理长期保持年级前列。大学阶段专业前 10.6%，曾获专业二等奖学金，高数卷面满分。"
    },
    {
      topic: "机器学习项目",
      keywords: ["机器学习", "LLM", "DocLayLLM", "OCR", "多模态", "项目", "做过什么"],
      answer: "我完成过 DocLayLLM 多模态文档理解训练数据工程：围绕图像、OCR 文本、空间坐标和指令问答构建 OCR-grounded SFT 数据集，完成多源标注转换、JSONL 样本组织和训练前数据校验。"
    },
    {
      topic: "地理空间智能",
      keywords: ["地理大模型", "地理空间", "GIS", "遥感", "GeoAI", "空间推理"],
      answer: "地理空间智能与地理大模型是我正在持续投入的学习方向。我关注 GIS、地理空间数据处理、遥感智能分析和空间推理，尚未将其表述为已完成的项目经历。"
    },
    {
      topic: "技能工具",
      keywords: ["技能", "工具", "Python", "AI", "会什么"],
      answer: "我的能力集中在 Python 数据处理、机器学习训练数据构建、OCR 与多模态文档理解、数据质量校验，以及 LLM 相关学习。地理空间智能和地理大模型是我正在持续投入的学习方向。"
    },
    {
      topic: "实践经历",
      keywords: ["实践", "志愿", "实习", "团委", "学生工作", "领导力"],
      answer: "我有寒假政府实习和志愿服务经历，曾在曲靖市沾益区团委协助材料整理、信息核对和基础政务流程支持，也参与过杨马志愿服务。学生工作方面担任过团支书，并在建模队伍中承担队长角色。"
    },
    {
      topic: "合作方式",
      keywords: ["合作", "联系", "邮箱", "微信", "QQ", "电话", "怎么联系"],
      answer: "可以通过邮箱 wenhao_h2007@163.com、微信 h3435738857、QQ 3435738857 或电话 15608744434 联系我。适合交流 LLM、机器学习、多模态文档理解、地理空间智能和学习实践。"
    }
  ],
  voice: {
    principles: [
      "表达克制，不夸张包装。",
      "强调事实、结构和可验证结果。",
      "把复杂问题拆成清楚步骤。",
      "回答时优先基于公开资料。",
      "语气稳重、真诚、有学生骨干气质。"
    ],
    sampleLines: [
      "我更希望用清楚的模型和可靠的解释说话。",
      "复杂问题先拆结构，再看变量、假设和可验证的结果。",
      "如果要合作，最好先把目标、时间和预期产出说清楚。"
    ],
    avoid: [
      "过度营销腔。",
      "没有事实支撑的夸大表达。",
      "空泛鸡汤。",
      "过度娱乐化或不正式的措辞。"
    ]
  },
  quickQuestions: [
    "你的机器学习方向是什么？",
    "你做过哪些 LLM 项目？",
    "你的竞赛和荣誉有哪些？",
    "如果想合作，应该怎么联系你？"
  ]
};
