(function () {
  "use strict";

  window.CQ_QUIZ_DATA = {
    version: 2,
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
          { id: "d", label: "飞叉叉" }
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
          { id: "l", label: "打番天印_儿" }
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
      },
      {
        id: "easy-6",
        level: "简单",
        type: "single",
        prompt: "哪一个词表示「加油、振作」？",
        options: [
          { id: "a", label: "撇脱" },
          { id: "b", label: "雄起" },
          { id: "c", label: "搂实" },
          { id: "d", label: "理抹" }
        ],
        correct: ["b"]
      },
      {
        id: "easy-7",
        level: "简单",
        type: "match",
        prompt: "把左边的词和右边的词搭配起。",
        pairs: [
          { id: "a", left: "黢 qu1 / quu2", right: "黑 he2" },
          { id: "b", left: "抿 min1", right: "甜 tian2" },
          { id: "c", left: "浇 jiao1", right: "湿 si2" },
          { id: "d", left: "稀 xi1", right: "孬 pie4" }
        ]
      },
      {
        id: "easy-8",
        level: "简单",
        type: "single",
        prompt: "下列哪一个不属于动物？",
        options: [
          { id: "a", label: "癞疙宝" },
          { id: "b", label: "猪儿虫" },
          { id: "c", label: "涨水蛾_儿（war2）" },
          { id: "d", label: "蠚（ho2）麻" }
        ],
        correct: ["d"]
      },
      {
        id: "easy-9",
        level: "简单",
        type: "single",
        prompt: "下列用于夸人的词汇是？",
        options: [
          { id: "a", label: "金宝卵" },
          { id: "b", label: "古嗔（cen4）" },
          { id: "c", label: "敦笃（den1 du2）" },
          { id: "d", label: "打滚_儿匠" }
        ],
        correct: ["c"]
      },
      {
        id: "easy-10",
        level: "简单",
        type: "single",
        prompt: "说一个人 cai2 mi2 ho1 yan3，是指他／她？",
        options: [
          { id: "a", label: "吝啬小气" },
          { id: "b", label: "贼眉鼠眼" },
          { id: "c", label: "火眼金睛" },
          { id: "d", label: "平淡朴实" }
        ],
        correct: ["a"]
      },
      {
        id: "medium-6",
        level: "中等",
        type: "match",
        prompt: "把句子的前后两部分搭配起。",
        pairs: [
          { id: "a", left: "把子扯不", right: "圆范" },
          { id: "b", left: "脸貌_儿长得", right: "周正" },
          { id: "c", left: "问题没整", right: "醒豁" },
          { id: "d", left: "毛肚_儿分量", right: "汪实" }
        ]
      },
      {
        id: "medium-7",
        level: "中等",
        type: "single",
        prompt: "下列哪个词不能表示「花样、名堂、手段」？",
        options: [
          { id: "a", label: "抖（tou3）摆" },
          { id: "b", label: "板眼_儿" },
          { id: "c", label: "过场" },
          { id: "d", label: "仆爬" }
        ],
        correct: ["d"]
      },
      {
        id: "medium-8",
        level: "中等",
        type: "single",
        prompt: "「XX客」「XX匠」「XX婆」是重庆话中常用的给人取调侃、侮辱性外号的构词方法。下面哪个不属于给人的外号？",
        options: [
          { id: "a", label: "打滚_儿匠" },
          { id: "b", label: "儿麻婆" },
          { id: "c", label: "弯酸客" },
          { id: "d", label: "偷油婆" }
        ],
        correct: ["d"]
      },
      {
        id: "medium-9",
        level: "中等",
        type: "match",
        prompt: "把左边的动作和右边的事物搭配起。",
        pairs: [
          { id: "a", left: "坌（ben4）", right: "酱油" },
          { id: "b", left: "逮（dai2）", right: "耗子" },
          { id: "c", left: "㩟（zai4）", right: "扣子" },
          { id: "d", left: "扚（dia1）", right: "水果" }
        ]
      },
      {
        id: "medium-10",
        level: "中等",
        type: "match",
        prompt: "把 ABB 式词语的前后部分搭配起。",
        pairs: [
          { id: "a", left: "神", right: "浊浊（co2 co2）" },
          { id: "b", left: "水", right: "垮垮" },
          { id: "c", left: "粗", right: "疙疙（ge4 ge4）" },
          { id: "d", left: "油", right: "济济" }
        ]
      },
      {
        id: "hard-6",
        level: "困难",
        type: "single",
        prompt: "下列哪个词不能表示「共同、一起」？",
        options: [
          { id: "a", label: "带携（xi2 / xie2）" },
          { id: "b", label: "一火色" },
          { id: "c", label: "打伙" },
          { id: "d", label: "一路" }
        ],
        correct: ["b"]
      },
      {
        id: "hard-7",
        level: "困难",
        type: "single",
        prompt: "下列哪一句话不是夏天的场景？",
        options: [
          { id: "a", label: "这个天热登了，少出门_儿。" },
          { id: "b", label: "在落偏涷（dong1）雨了，把衣服收了。" },
          { id: "c", label: "烘笼_儿里头熋（lai4）人，莫摛（ci1）进去。" },
          { id: "d", label: "在扯霍闪了，快点_儿藏（qiang2）到起。" }
        ],
        correct: ["c"]
      },
      {
        id: "hard-8",
        level: "困难",
        type: "match",
        prompt: "把汉字和重庆话读音搭配起。",
        pairs: [
          { id: "a", left: "雀", right: "qio2" },
          { id: "b", left: "捷", right: "qie2" },
          { id: "c", left: "族", right: "quu2" },
          { id: "d", left: "茄", right: "que2" }
        ]
      },
      {
        id: "hard-9",
        level: "困难",
        type: "single",
        prompt: "哪个词不是指小孩调皮、脸皮厚、不听话？",
        options: [
          { id: "a", label: "迁翻_儿" },
          { id: "b", label: "装狗_儿" },
          { id: "c", label: "涎（xuan2）脸" },
          { id: "d", label: "搞豪" }
        ],
        correct: ["b"]
      },
      {
        id: "hard-10",
        level: "困难",
        type: "single",
        prompt: "下列属于名词的是？",
        options: [
          { id: "a", label: "打王逛" },
          { id: "b", label: "打巴壁" },
          { id: "c", label: "打包票" },
          { id: "d", label: "打门锤" }
        ],
        correct: ["d"]
      },
      {
        id: "expert-4",
        level: "专家",
        type: "multi",
        prompt: "戏曲是传统社会人们重要的娱乐方式。下列哪些词汇源于戏曲相关术语？",
        options: [
          { id: "a", label: "板眼_儿" },
          { id: "b", label: "吆台" },
          { id: "c", label: "舵把子" },
          { id: "d", label: "吃跑堂" },
          { id: "e", label: "架墨" },
          { id: "f", label: "麻广广" },
          { id: "g", label: "唱对台戏" },
          { id: "h", label: "煞角" }
        ],
        correct: ["a", "b", "g"]
      },
      {
        id: "expert-5",
        level: "专家",
        type: "multi",
        prompt: "「A子」「A儿」是汉语常见的名词构词方式，而川渝方言还流行叠词「AA_(儿)」形式构词。下列哪几组词的意思明显不同？",
        options: [
          { id: "a", label: "面－面面" },
          { id: "b", label: "幺儿－幺幺" },
          { id: "c", label: "米－米米" },
          { id: "d", label: "包子－包包_儿" },
          { id: "e", label: "盖子－盖盖_儿" },
          { id: "f", label: "傻(ha3)儿－傻子" },
          { id: "g", label: "绳子－绳绳_儿" },
          { id: "h", label: "舅子－舅舅" }
        ],
        correct: ["a", "c", "d", "h"]
      },
      {
        id: "expert-6",
        level: "专家",
        type: "multi",
        prompt: "重庆地名中，很多名称都以山城的地形地貌、水文状况等结尾描述地点。下列哪些地名不包含地貌或水文特征？",
        options: [
          { id: "a", label: "朝天门" },
          { id: "b", label: "唐家沱" },
          { id: "c", label: "解放碑" },
          { id: "d", label: "南坪" },
          { id: "e", label: "菜园坝" },
          { id: "f", label: "鹅公岩" },
          { id: "g", label: "北碚" },
          { id: "h", label: "石桥铺" },
          { id: "i", label: "蚂蝗梁" },
          { id: "j", label: "铜罐驿" }
        ],
        correct: ["a", "c", "h", "j"]
      }
    ]
  };
}());
