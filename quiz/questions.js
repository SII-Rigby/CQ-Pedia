(function () {
  "use strict";

  window.CQ_QUIZ_DATA = {
    version: 1,
    questions: [
      {
        id: "easy-1",
        level: "简单",
        type: "single",
        prompt: "下列哪个词表示「舒服、满意」？",
        options: [
          { id: "a", label: "亮绍" },
          { id: "b", label: "安逸" },
          { id: "c", label: "灯_儿晃" },
          { id: "d", label: "日白" }
        ],
        correct: ["b"]
      },
      {
        id: "easy-2",
        level: "简单",
        type: "single",
        prompt: "he2 qu1 ma1 kong3 表示？",
        options: [
          { id: "a", label: "很黑" },
          { id: "b", label: "很亮" },
          { id: "c", label: "很恐怖" },
          { id: "d", label: "很多斑点" }
        ],
        correct: ["a"]
      },
      {
        id: "easy-3",
        level: "简单",
        type: "single",
        prompt: "下列哪一个是名词？",
        options: [
          { id: "a", label: "白之之" },
          { id: "b", label: "纸飞飞_儿" },
          { id: "c", label: "麻鲊鲊（za3）" },
          { id: "d", label: "飞奓奓（ca3 / ca1）" }
        ],
        correct: ["b"]
      },
      {
        id: "easy-4",
        level: "简单",
        type: "single",
        prompt: "下列跟 ci1 jio2 dong4 sou3 近义的是？",
        options: [
          { id: "a", label: "手舞足蹈" },
          { id: "b", label: "动手动脚" },
          { id: "c", label: "痴心妄想" },
          { id: "d", label: "手脚冰凉" }
        ],
        correct: ["b"]
      },
      {
        id: "easy-5",
        level: "简单",
        type: "match",
        prompt: "把左边的词和右边的词搭配起。",
        pairs: [
          { id: "a", left: "青 qin1", right: "痛 tong4" },
          { id: "b", left: "冰 bin1", right: "凊 qin4" },
          { id: "c", left: "梆 bang1", right: "硬 ngen4" },
          { id: "d", left: "膖 pang1", right: "臭 cou4" }
        ]
      },
      {
        id: "medium-1",
        level: "中等",
        type: "single",
        prompt: "下列哪个词常形容小孩调皮？",
        options: [
          { id: "a", label: "汪实" },
          { id: "b", label: "伸抖" },
          { id: "c", label: "敦笃" },
          { id: "d", label: "迁翻_儿" }
        ],
        correct: ["d"]
      },
      {
        id: "medium-2",
        level: "中等",
        type: "single",
        prompt: "下列哪一个词汇不能表示「拳头」？",
        options: [
          { id: "a", label: "砣_儿" },
          { id: "b", label: "锭子" },
          { id: "c", label: "皮砣" },
          { id: "d", label: "皮款" }
        ],
        correct: ["d"]
      },
      {
        id: "medium-3",
        level: "中等",
        type: "single",
        prompt: "下列哪一个词汇不属于昆虫？",
        options: [
          { id: "a", label: "虰虰猫_儿 din1 din1 mar1" },
          { id: "b", label: "鼁蟆_儿 que2 mar1" },
          { id: "c", label: "蚱蜢_儿 zua2 mer3" },
          { id: "d", label: "灶鸡_儿 zao4 jier1" }
        ],
        correct: ["b"]
      },
      {
        id: "medium-4",
        level: "中等",
        type: "single",
        prompt: "下列哪一个不属于身体部位？",
        options: [
          { id: "a", label: "手倒拐_儿 sou3 dao4 guar3" },
          { id: "b", label: "磕膝头_儿 ke2 xi1 ter2" },
          { id: "c", label: "䠍尿三_儿 ka2 liao4 sar1" },
          { id: "d", label: "胁孔 xia2 kong3" }
        ],
        correct: ["c"]
      },
      {
        id: "medium-5",
        level: "中等",
        type: "matrix",
        prompt: "「国营企业」的重庆老派读法是？",
        segments: [
          { id: "s1", label: "国", options: [{ id: "a", label: "go2" }, { id: "b", label: "gue2" }], correct: "b" },
          { id: "s2", label: "营", options: [{ id: "a", label: "yin2" }, { id: "b", label: "yun2" }], correct: "b" },
          { id: "s3", label: "企", options: [{ id: "a", label: "qi4" }, { id: "b", label: "qi3" }], correct: "a" },
          { id: "s4", label: "业", options: [{ id: "a", label: "lie2" }, { id: "b", label: "ye2" }], correct: "a" }
        ]
      },
      {
        id: "hard-1",
        level: "困难",
        type: "single",
        prompt: "下列哪个词意思跟其他三个明显不同？",
        options: [
          { id: "a", label: "花里鼓兮" },
          { id: "b", label: "花啷旗鼓" },
          { id: "c", label: "花鼓零当" },
          { id: "d", label: "花尔麻遢" }
        ],
        correct: ["d"]
      },
      {
        id: "hard-2",
        level: "困难",
        type: "single",
        prompt: "下列哪个词与神态表情无关？",
        options: [
          { id: "a", label: "鬼眉日眼" },
          { id: "b", label: "贼眉呵眼" },
          { id: "c", label: "冷眉秋眼" },
          { id: "d", label: "诧眉诧眼" }
        ],
        correct: ["c"]
      },
      {
        id: "hard-3",
        level: "困难",
        type: "single",
        prompt: "下列哪个词不可以形容食物？",
        options: [
          { id: "a", label: "酽搅搅 lian4 gao2 gao2" },
          { id: "b", label: "𤆵噜噜 pa1 lu1 lu1" },
          { id: "c", label: "淡啪啪 dan4 pia3 pia3" },
          { id: "d", label: "悬吊吊 xuan2 diao4 diao4" }
        ],
        correct: ["d"]
      },
      {
        id: "hard-4",
        level: "困难",
        type: "single",
        prompt: "下列形容人没精神、缺乏生气的是？",
        options: [
          { id: "a", label: "懒阴磨阳" },
          { id: "b", label: "阴尸倒阳" },
          { id: "c", label: "阴梭阳梭" },
          { id: "d", label: "一抹平阳" }
        ],
        correct: ["b"]
      },
      {
        id: "hard-5",
        level: "困难",
        type: "match",
        prompt: "把量词和后面的事物搭配起。",
        pairs: [
          { id: "a", left: "一茏", right: "猪草" },
          { id: "b", left: "一磴（ten4）", right: "梯坎_儿" },
          { id: "c", left: "一𣲩（pa1）", right: "口香糖" },
          { id: "d", left: "一撮（zua3 / cua3）", right: "葡萄_儿" }
        ]
      },
      {
        id: "expert-1",
        level: "专家",
        type: "multi",
        prompt: "不属于二〇〇〇年后才出现的新词汇的是？",
        options: [
          { id: "a", label: "棒棒军" },
          { id: "b", label: "傻_儿果" },
          { id: "c", label: "轻轨" },
          { id: "d", label: "拓_儿车" },
          { id: "e", label: "630" },
          { id: "f", label: "嘣嚓嚓" }
        ],
        correct: ["a", "d", "f"]
      },
      {
        id: "expert-2",
        level: "专家",
        type: "multi",
        prompt: "下列哪些行为是褒义正向的？",
        options: [
          { id: "a", label: "落教" },
          { id: "b", label: "吃跑堂" },
          { id: "c", label: "打烂仗" },
          { id: "d", label: "踩假水_儿" },
          { id: "e", label: "夹毛锥（ju1）" },
          { id: "f", label: "拃（za3）场子" },
          { id: "g", label: "打横爬" },
          { id: "h", label: "闪色子" },
          { id: "i", label: "打得𰍻（cua3）" },
          { id: "j", label: "扮灯_儿" },
          { id: "k", label: "敲棒棒" },
          { id: "l", label: "挼包包散" }
        ],
        correct: ["a", "f", "i"]
      },
      {
        id: "expert-3",
        level: "专家",
        type: "multi",
        prompt: "下列各组字在老重庆话中读音相同的是？",
        options: [
          { id: "a", label: "微－威" },
          { id: "b", label: "跃－耀" },
          { id: "c", label: "玉－欲" },
          { id: "d", label: "择－窄" },
          { id: "e", label: "年－严" },
          { id: "f", label: "岩－崖" },
          { id: "g", label: "耍－厦" },
          { id: "h", label: "械－借" }
        ],
        correct: ["b", "e", "f", "g"]
      }
    ]
  };
}());
