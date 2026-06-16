const state = {
  imageDataUrl: "",
  fileName: "",
};

const els = {
  input: document.querySelector("#imageInput"),
  dropZone: document.querySelector("#dropZone"),
  previewWrap: document.querySelector("#previewWrap"),
  previewImage: document.querySelector("#previewImage"),
  apiStatus: document.querySelector("#apiStatus"),
  apiKeyField: document.querySelector("#apiKeyField"),
  apiKeyInput: document.querySelector("#apiKeyInput"),
  modelInput: document.querySelector("#modelInput"),
  generateButton: document.querySelector("#generateButton"),
  generateCopyButton: document.querySelector("#generateCopyButton"),
  apiHint: document.querySelector("#apiHint"),
  chatgptCnOutput: document.querySelector("#chatgptCnOutput"),
  chatgptEnOutput: document.querySelector("#chatgptEnOutput"),
  hypicCaptionOutput: document.querySelector("#hypicCaptionOutput"),
  capcutCaptionOutput: document.querySelector("#capcutCaptionOutput"),
  capcutReactivationCaptionOutput: document.querySelector("#capcutReactivationCaptionOutput"),
  copyAllButton: document.querySelector("#copyAllButton"),
  copyCaptionsButton: document.querySelector("#copyCaptionsButton"),
  subjectInput: document.querySelector("#subjectInput"),
  goalSelect: document.querySelector("#goalSelect"),
  sceneSelect: document.querySelector("#sceneSelect"),
  focusSelect: document.querySelector("#focusSelect"),
  copyLanguageInput: document.querySelector("#copyLanguageInput"),
  copyTypeSelect: document.querySelector("#copyTypeSelect"),
};

let serverKeyConfigured = false;
const FIXED_MODEL = "gpt-5.4";
const FIXED_MODEL_LABEL = "GPT5.4";

function setStatus(text, tone = "idle") {
  els.apiStatus.textContent = text;
  els.apiStatus.dataset.tone = tone;
}

async function loadServerConfig() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    serverKeyConfigured = Boolean(config.serverKeyConfigured);
    els.modelInput.value = FIXED_MODEL;
    if (serverKeyConfigured) {
      els.apiKeyInput.value = "";
      els.apiKeyInput.placeholder = "已由站点服务器配置";
      els.apiKeyInput.disabled = true;
      els.apiKeyField.classList.add("hidden-field");
      els.apiKeyField.hidden = true;
      els.apiKeyField.style.display = "none";
      els.apiHint.textContent = `站点已配置提示词 Key，提示词固定使用 ${FIXED_MODEL_LABEL}。`;
      setStatus("站点已配置", "ok");
    }
  } catch {
    setStatus("等待配置", "idle");
  }
}

function buildInstruction() {
  return `Analyze the uploaded image as if you are reconstructing the original text-to-image prompt.

Generate a concise but accurate prompt that could recreate an image extremely close to the reference. Keep the wording compact; quality and key visual consistency matter more than long descriptions.

Focus on: subject, pose, facial expression, clothing, environment, composition, camera angle, lens, lighting, color palette, texture, material, artistic style, rendering style, mood, depth of field, background details, realism level, and image quality.

Do not mention that you are looking at an image.
Do not invent elements that are not visible.
Use precise visual language.
If the image looks AI-generated, infer the likely prompt style and parameters.

用户补充：
- 你的照片主体：${els.subjectInput.value.trim() || "我上传的人物照片"}
- 输出用途：${els.goalSelect.value}
- 替换策略：${els.sceneSelect.value}
- 保留重点：${els.focusSelect.value}

Additional reconstruction rules:
1. Output two complete bundled prompt blocks: one in Chinese and one in English.
2. Each bundled prompt block must include Main Prompt, Negative Prompt, Suggested Model / Style, and Suggested Parameters together in one text. Do not split them into separate UI fields.
3. Chinese is the source of truth. First write the complete Chinese block according to the user's meaning, then translate that Chinese block into English. The English block must be a faithful translation of the Chinese block, with no added, removed, or changed details.
4. The section order and meaning must match exactly in both languages: Main Prompt, Negative Prompt, Suggested Model / Style, Suggested Parameters.
5. Keep the Main Prompt compact: English about 90-160 words, Chinese about 120-220 Chinese characters. If the image has many important signs, people, or props, you may be slightly longer, but remove repeated adjectives and generic filler.
6. Preserve only the visual details that affect similarity: subject identity replacement, exact pose/action, facial expression, gaze direction, outfit, key props, scene, camera angle, lighting, color tone, material/texture, and visible text/signs.
7. Only one thing may change: the selected person's identity/face from the user's selfie. Everything else visible should match the effect image: expression, eye gaze direction, head angle, body pose, hands, legs, clothing, outfit colors, hairstyle silhouette, accessories, lighting, camera angle, composition, background, props, text, and atmosphere.
8. The Main Prompt must state exact gaze direction and eye target in a short phrase, such as eyes looking left, looking down, looking at camera, or looking at the woman beside him.
9. The Main Prompt must mention camera/composition and lighting in short phrases, such as vertical full-body low angle, eye-level close-up, soft left side light, strong rim light, wet ground reflections, smoky backlight.
10. Do not rely on long lists of generic quality words. Use at most a few quality/style words, tied to visible details.
11. For the selected subject in “你的照片主体”, do not describe old facial identity or exact old facial features. Write that the face/identity comes from the uploaded selfie/photo while expression, gaze, pose, outfit, styling, and scene remain the same as the effect image.
12. Everything outside the selected subject's identity must be locked but concise. For AI-generated companions, include age/ethnicity vibe, hair color/style, outfit, pose, expression, gaze, and interaction only if visible.
13. If visible text, plaques, lanterns, signs, usernames, screens, posters, storefronts, or interface elements appear, describe only the important readable/approximate text, position, and color/material.
14. Negative Prompt must be one compact line, image-specific, including wrong face identity, changed expression, wrong gaze direction, wrong pose, changed clothing, wrong camera angle, wrong lighting, missing details, unreadable text, watermark, low quality.
15. Suggested Model / Style must be one short line and must have the same meaning in both languages.
16. Suggested Parameters must be one short line with aspect ratio, quality/detail, style strength, image-reference strength, and seed consistency when useful, and must have the same meaning in both languages.
17. Return JSON only. No Markdown, no code block.

输出必须是 JSON，不要 Markdown，不要代码块：
{
  "cn_full_prompt": "中文完整版本，包含：主提示词、负面提示词、建议模型/风格、建议参数",
  "en_full_prompt": "English full version including: Main Prompt, Negative Prompt, Suggested Model / Style, Suggested Parameters"
}`;
}

function buildCaptionInstruction(forcedLanguages = null) {
  const languages = forcedLanguages ? [...forcedLanguages] : getSelectedCaptionLanguages();
  if (!languages.length) languages.push("印尼语");
  const languageText = languages.join("、");
  const languageCount = languages.length;
  const totalCaptionBudget = forcedLanguages ? 1800 : 1200;
  const perLanguageBudget = Math.max(120, Math.floor(totalCaptionBudget / languageCount));
  const type = els.copyTypeSelect.value;
  const subject = els.subjectInput.value.trim() || "按图片主体判断";
  const selectedLanguageRules = languages.map((language, index) => {
    const spec = CAPTION_LANGUAGE_SPECS[language] || { nativeName: language, outputRule: `只使用${language}` };
    return `${index + 1}. ${language}：${spec.nativeName}；${spec.outputRule}；目标长度约 ${perLanguageBudget} 个字符`;
  }).join("\n");
  const unselectedLanguages = Object.keys(CAPTION_LANGUAGE_SPECS).filter((language) => !languages.includes(language));
  const unselectedLanguageText = unselectedLanguages.join("、") || "无";
  const forbiddenNames = getForbiddenCaptionNames(languages).join("、");
  const englishSelected = languages.includes("英语");
  const englishRule = englishSelected
    ? `英语已被选择，所以英语只能占全部正文约 1 / ${languageCount}，不能超过其他语言。`
    : "英语没有被选择时，主体情绪文案必须用已选语言写；但允许保留 TikTok SEO 常用英文短语和品牌词，例如 chatgpt photo editing tutorial、chatgpt photo prompt、gemini ai photo prompt trend tutorial、gemini ai photo editing tutorial、AI、ChatGPT、Gemini、CapCut、Hypic。";
  const captionJsonShape = languages
    .map((language) => `    "${language}": "这一段只用${language}写，不要写语言名或标题"`)
    .join(",\n");

  return `你是一个 TikTok 短视频文案生成器。请根据用户上传的图片，生成适合 TikTok 发布的长文案。文案语言必须严格只使用这些已选语言：${languageText}。只生成一条可直接发布的混合语言文案，不要按语言拆成多个版本。

用户补充：
- 图片主体：${subject}
- 文案类型：${type === "all" ? "全部生成" : type}
- 选中的文案语言：${languageText}
- 语言数量：${languageCount}
- 每个非空文案字段总长度目标：约 ${totalCaptionBudget} 个字符，不要因为语言数量增加而整体变长
- 每种语言在同一条文案里的长度目标：约 ${perLanguageBudget} 个字符，所有语言占比必须尽量平均；如果只选 1 个语言，就只写这一种语言。

语言执行表（必须严格执行，每个非空字段都要覆盖全部已选语言）：
${selectedLanguageRules}

禁止使用的未选语言：${unselectedLanguageText}
禁止在输出文案里出现的国家名、地区名、语言名、标题名：${forbiddenNames}
英语限制：${englishRule}

文案必须模仿这种结构：
1. 平台标签必须放在最开头，尤其是 Hypic 文案要像：#hypic #hypiccreator 后面直接接本地语言正文。
2. 开头不是普通广告句，而是一大段本地达人口吻的情绪化画面描述：根据图片细节写人物、衣服、道具、屏幕/手机/界面、破碎玻璃、光线、背景、氛围、动作、超现实效果、故事感，多用 ✨📸🤖💖😳❤️✍️🤳🌟🖼️ 这类符号，但不要乱用。
3. 接一段本地语言搜索关键词堆叠：像真实 TikTok SEO 标题一样连续写短句，不要太规整，不要列表标题。关键词要围绕图片里的具体元素，例如手机屏幕、社交媒体主页、人物从屏幕走出来、虚拟维度墙破裂、从线上到现实、玻璃碎片、超现实 AI 照片、AI 修图、同款效果、教程。
4. 接一段教程/提示词搜索词：告诉用户用 ChatGPT/Gemini/Hypic/CapCut 做同款，必须写具体图片效果。可以保留英文 SEO 词，例如 how to create surreal AI images, break the virtual dimensional wall, online to reality, AI generates cross-dimensional surreal photos, chatgpt photo editing tutorial、chatgpt photo prompt、chatgpt photo trend tutorial、gemini ai photo prompt trend tutorial、gemini ai photo editing tutorial。
5. Hypic 文案结尾可以带 @hypic_global、@HypicVietnam 这类账号；不要编造真人账号。CapCut 文案可以少量带 CapCut 相关账号/话题。
6. 整体要像用户给的样例：长段自然文案 + 很多本地搜索短句 + 少量英文 AI/tutorial SEO 词 + 平台话题，而不是分点说明、广告标语、短摘要。

参考样例风格（必须学习结构，不要逐字照抄）：
How to create surreal AI images that break the virtual dimensional wall and move from online to reality📸｜AI generates cross-dimensional surreal photos🤖｜Image generation artificial intelligence✨｜Use AI to create surreal photos with dimensional wall breaking effect💖 I also wanted to make surreal photos that break the virtual dimensional wall, never expected AI to create such amazing effects😳｜Many people have posted surreal photos with dimensional wall breaking effects❤️ AI tutorial for creating surreal images breaking the virtual dimensional wall✍️｜AI selfie tutorial with cross-dimensional wall breaking effect🤳 Take selfies with virtual dimensional wall breaking effect via AI✍️🤳｜Create cross-dimensional surreal photos with AI💖 Hypic redefines photo editing ChatGPT prompts for surreal AI images breaking the virtual dimensional wall💬｜Use AI to create atmospheric surreal photos that break the virtual dimensional wall from online to reality❤️✍️

如果图片主题类似“手机屏幕/社交媒体主页破裂，人物从线上界面走到现实世界”，必须高频覆盖这些搜索词变体：surreal AI images, virtual dimensional wall, breaking dimensional wall, cross-dimensional surreal photos, online to reality, AI photo editing tutorial, AI selfie tutorial, ChatGPT photo prompt, Gemini AI photo prompt, Hypic photo editing, phone screen breaking effect, social media profile coming to life, character stepping out of phone screen。

分类规则：
- hypic_caption 是 Hypic 文案，必须包含这些话题且不能漏：#hypic #hypiccreator #hypicATETHAT #Godpic
- capcut_caption 是 CapCut 文案，必须包含这些话题且不能漏：#capcut #capcutpioneer
- capcut_reactivation_caption 是 CapCut 拉失活文案，必须包含这些话题且不能漏：#capcut #capcutpioneer #capcutnow，并且语气要更像召回老用户/让用户重新打开 CapCut 做同款，例如“还没试过这个模板就亏了”“现在打开 CapCut 做同款”。

写作要求：
- 如果文案类型是全部生成，就三个字段都输出完整文案。
- 如果只选择某一种类型，仍然输出 JSON 三个字段，但未选择的字段填空字符串。
- 每个非空文案字段都必须先在对应的 *_by_language 对象里为每一个已选语言各写一段。对象 key 必须完整包含：${languageText}。不能少任何一个 key，不能把 5 种语言合并到 1 个 key 里。
- hypic_caption、capcut_caption、capcut_reactivation_caption 三个最终字段必须由对应 *_by_language 里的所有语言段按已选顺序拼接而成。最终字段里不要出现语言名或标题。
- 长度控制是最高优先级之一：选择 1 个语言和选择 5 个语言时，每个非空字段的总字符数必须接近，不要按语言数量成倍增长。
- 如果只选择 1 个语言，该语言可以写得完整一些；如果选择多个语言，必须只生成一条混合语言文案，把所有选中语言写在同一条发布文案里，不要输出多个语言版本。
- 如果选择了多种语言，每一个非空字段都必须让所有选中语言交替出现。必须按“语言 1 一句、语言 2 一句、语言 3 一句……”的循环方式写，直到每种语言篇幅接近。不能只写其中几种语言，不能让某一种语言明显更多，不能混入任何未选语言。
- 不要用 [Indonesian]、[Thai]、[English]、Indonesian:、Malay: 这类语言标题分段，不要按语言拆成独立段落，也不要出现任何国家名、地区名、语言名、国家/语言标题。
- 多语言占比是最高优先级：每种语言的字符量必须接近 1 / ${languageCount}，允许最多约 10% 偏差；所有 SEO 关键词、教程句、自然句都必须分配给各个已选语言，不能把 SEO 部分默认写成英语或任何其他未选语言。
- 推荐混合方式：按所有选中语言各写一句短钩子，再按所有选中语言各写一组本语言 SEO/search keywords，再按所有选中语言各写一句同款效果或极短教程。整体看起来是一条自然的 TikTok 文案，而不是多个翻译版本。
- 不要重复翻译同一句太多次；每种语言表达同一个卖点即可，句子短、节奏快、适合 TikTok。
- 每个非空字段必须是可直接复制到 TikTok 的完整发布文案，但总长度必须控制在约 ${totalCaptionBudget} 字符。
- 文案整体要像 TikTok 达人主页里的爆款 SEO 长文案，不要像普通广告文案；允许关键词重复、短语堆叠、教程句反复变体。
- 根据所有所选语言共同输出主体内容；未选择英语时，主体情绪文案不要整段写英文，但允许保留英文 AI/tutorial SEO 关键词和品牌词。
- CapCut 拉失活文案要更直接地召回用户打开 CapCut，例如强调“现在就打开 CapCut”“这个模板别错过”“用旧照片也能做同款”。
- hashtag 要少而准。Hypic 文案必须以 #hypic #hypiccreator 开头，并保留 #hypicATETHAT #Godpic；CapCut 文案必须包含 #capcut #capcutpioneer；CapCut 拉失活文案必须包含 #capcut #capcutpioneer #capcutnow。
- 不要为了凑字数写太长。多语言时优先压缩 SEO 关键词堆叠和教程句，保证总字符长度稳定。
- 不要 Markdown，不要解释，不要分代码块。
- 绝对不要输出中文汉字。当前文案语言选项不包含中文，所以 hypic_caption、capcut_caption、capcut_reactivation_caption 三个字段里都不能出现中文标题、中文解释、中文小节名或中文标签。
- 不要输出语言标题、国家标题或分隔标签，例如 [Indonesian]、[Malay]、[Arabic]、[English]、[Nepali]、Indonesian:、Malay:。正文直接开始写钩子和内容。
- 正文里不要出现国家名、地区名或语言名，例如 Indonesia、Indonesian、Thailand、Thai、Malaysia、Malay、Cambodia、Khmer、Pakistan、Urdu、Sri Lanka、Sinhala 等；只写对应语言的真实文案内容。
- 不要编造真实姓名，图片里看不清身份时用通用称呼。
- 图片提示词要具体到这张图的视觉元素，不能只写“生成同款图片”。
- 如果是阿拉伯语、乌尔都语等 RTL 语言，正文必须自然流畅，像本地用户真实发布，不要翻译腔。

输出必须是 JSON：
{
  "hypic_caption": "Hypic 完整文案",
  "capcut_caption": "CapCut 完整文案",
  "capcut_reactivation_caption": "CapCut 拉失活完整文案",
  "hypic_caption_by_language": {
${captionJsonShape}
  },
  "capcut_caption_by_language": {
${captionJsonShape}
  },
  "capcut_reactivation_caption_by_language": {
${captionJsonShape}
  }
}`;
}

function buildCaptionTranslationInstruction(language, englishDraft) {
  const spec = CAPTION_LANGUAGE_SPECS[language] || { nativeName: language, outputRule: `只使用${language}` };
  const type = els.copyTypeSelect.value;
  const sourceJson = JSON.stringify(englishDraft, null, 2);

  return `你是 TikTok 爆款文案本地化翻译器。请把下面的英文母稿翻译并本地化成 ${language}（${spec.nativeName}）。

核心流程：
1. 英文母稿是唯一内容来源。不要重新创作新主题，不要换图片细节，不要少翻译段落。
2. 翻译后必须保持英文母稿的结构、情绪、画面细节、SEO 关键词堆叠、教程搜索词、emoji、账号和话题。
3. 主体情绪文案必须使用 ${language}，表达要像本地 TikTok 用户真实发布，不要翻译腔。
4. 必须保留一部分英文 SEO 短语和品牌词，不要全部翻译掉，例如 how to create surreal AI images、break the virtual dimensional wall、online to reality、cross-dimensional surreal photos、chatgpt photo editing tutorial、chatgpt photo prompt、chatgpt photo trend tutorial、gemini ai photo prompt trend tutorial、gemini ai photo editing tutorial、AI、ChatGPT、Gemini、CapCut、Hypic。
5. 不要出现语言名、国家名、地区名或标题名；不要写 [${language}] 这种分隔标题。
6. 不要输出中文汉字。
7. ${spec.outputRule}
8. 如果某个英文母稿字段是空字符串，对应字段也输出空字符串。
9. 文案类型：${type === "all" ? "全部生成" : type}

英文母稿 JSON：
${sourceJson}

输出必须是 JSON，不要 Markdown，不要解释：
{
  "hypic_caption": "翻译后的 Hypic 完整文案",
  "capcut_caption": "翻译后的 CapCut 完整文案",
  "capcut_reactivation_caption": "翻译后的 CapCut 拉失活完整文案",
  "hypic_caption_by_language": {
    "${language}": "翻译后的 Hypic 完整文案"
  },
  "capcut_caption_by_language": {
    "${language}": "翻译后的 CapCut 完整文案"
  },
  "capcut_reactivation_caption_by_language": {
    "${language}": "翻译后的 CapCut 拉失活完整文案"
  }
}`;
}

const CAPTION_LANGUAGE_SPECS = {
  "印尼语": {
    nativeName: "Bahasa Indonesia",
    outputRule: "全部正文用自然印尼语写，不要夹英语普通词",
    forbiddenNames: ["Indonesia", "Indonesian", "Indonesian language", "Bahasa Indonesia", "印尼", "印度尼西亚", "印尼语"],
  },
  "泰语": {
    nativeName: "ภาษาไทย",
    outputRule: "全部正文用自然泰语和泰文书写",
    forbiddenNames: ["Thailand", "Thai", "Thai language", "ประเทศไทย", "ภาษาไทย", "泰国", "泰语"],
  },
  "缅甸语": {
    nativeName: "မြန်မာဘာသာ",
    outputRule: "全部正文用自然缅甸语和缅文书写",
    forbiddenNames: ["Myanmar", "Burma", "Burmese", "Burmese language", "မြန်မာ", "缅甸", "缅甸语"],
  },
  "马来语": {
    nativeName: "Bahasa Melayu",
    outputRule: "全部正文用自然马来语写，不要夹英语普通词",
    forbiddenNames: ["Malaysia", "Malay", "Malay language", "Bahasa Melayu", "马来西亚", "马来语"],
  },
  "越南语": {
    nativeName: "Tiếng Việt",
    outputRule: "全部正文用自然越南语书写",
    forbiddenNames: ["Vietnam", "Vietnamese", "Vietnamese language", "Tiếng Việt", "越南", "越南语"],
  },
  "高棉语": {
    nativeName: "ភាសាខ្មែរ",
    outputRule: "全部正文用自然高棉语和高棉文书写",
    forbiddenNames: ["Cambodia", "Cambodian", "Khmer", "Khmer language", "ភាសាខ្មែរ", "柬埔寨", "高棉语"],
  },
  "乌尔都语": {
    nativeName: "اردو",
    outputRule: "全部正文用自然乌尔都语和乌尔都文书写",
    forbiddenNames: ["Pakistan", "Pakistani", "Urdu", "Urdu language", "اردو", "巴基斯坦", "乌尔都语"],
  },
  "普什图语": {
    nativeName: "پښتو",
    outputRule: "全部正文用自然普什图语和普什图文书写",
    forbiddenNames: ["Afghanistan", "Afghan", "Pashto", "Pashto language", "پښتو", "阿富汗", "普什图语"],
  },
  "波斯语": {
    nativeName: "فارسی",
    outputRule: "全部正文用自然波斯语和波斯文书写",
    forbiddenNames: ["Iran", "Iranian", "Persian", "Farsi", "Persian language", "Farsi language", "فارسی", "伊朗", "波斯语"],
  },
  "达里语": {
    nativeName: "دری",
    outputRule: "全部正文用自然达里语和达里文书写",
    forbiddenNames: ["Afghanistan", "Afghan", "Dari", "Dari language", "دری", "阿富汗", "达里语"],
  },
  "阿拉伯语": {
    nativeName: "العربية",
    outputRule: "全部正文用自然阿拉伯语和阿拉伯文书写",
    forbiddenNames: ["Arab", "Arabic", "Arabic language", "العربية", "阿拉伯", "阿拉伯语"],
  },
  "泰米尔语": {
    nativeName: "தமிழ்",
    outputRule: "全部正文用自然泰米尔语和泰米尔文书写",
    forbiddenNames: ["Tamil", "Tamil language", "தமிழ்", "泰米尔语"],
  },
  "英语": {
    nativeName: "English",
    outputRule: "全部正文用自然英语写，但只占平均份额",
    forbiddenNames: ["English:", "[English]", "英语"],
  },
  "俄语": {
    nativeName: "Русский",
    outputRule: "全部正文用自然俄语和西里尔字母书写",
    forbiddenNames: ["Russia", "Russian", "Russian language", "Русский", "俄罗斯", "俄语"],
  },
  "尼泊尔语": {
    nativeName: "नेपाली",
    outputRule: "全部正文用自然尼泊尔语和天城文书写",
    forbiddenNames: ["Nepal", "Nepali", "Nepali language", "नेपाली", "尼泊尔", "尼泊尔语"],
  },
  "孟加拉语": {
    nativeName: "বাংলা",
    outputRule: "全部正文用自然孟加拉语和孟加拉文书写",
    forbiddenNames: ["Bangladesh", "Bengali", "Bangla", "Bengali language", "বাংলা", "孟加拉", "孟加拉语"],
  },
  "僧伽罗语": {
    nativeName: "සිංහල",
    outputRule: "全部正文用自然僧伽罗语和僧伽罗文书写",
    forbiddenNames: ["Sri Lanka", "Sri Lankan", "Sinhala", "Sinhala language", "සිංහල", "斯里兰卡", "僧伽罗语"],
  },
  "印地语": {
    nativeName: "हिन्दी",
    outputRule: "全部正文用自然印地语和天城文书写",
    forbiddenNames: ["India", "Indian", "Hindi", "Hindi language", "हिन्दी", "印度", "印地语"],
  },
  "菲律宾语": {
    nativeName: "Filipino",
    outputRule: "全部正文用自然菲律宾语写，不要夹英语普通词",
    forbiddenNames: ["Philippines", "Filipino", "Tagalog", "Filipino language", "菲律宾", "菲律宾语"],
  },
  "法语": {
    nativeName: "Français",
    outputRule: "全部正文用自然法语书写",
    forbiddenNames: ["France", "French", "French language", "Français", "法国", "法语"],
  },
  "日语": {
    nativeName: "日本語",
    outputRule: "全部正文用自然日语书写",
    forbiddenNames: ["Japan", "Japanese", "Japanese language", "日本語", "日本", "日语"],
  },
  "韩语": {
    nativeName: "한국어",
    outputRule: "全部正文用自然韩语和韩文书写",
    forbiddenNames: ["Korea", "Korean", "Korean language", "한국어", "韩国", "韩语"],
  },
  "德语": {
    nativeName: "Deutsch",
    outputRule: "全部正文用自然德语书写",
    forbiddenNames: ["Germany", "German", "German language", "Deutsch", "德国", "德语"],
  },
};

function getForbiddenCaptionNames(selectedLanguages = getSelectedCaptionLanguages()) {
  const genericNames = [
    "language", "languages", "country", "countries", "nation", "region",
    "语言", "国家", "地区",
    "[Indonesian]", "[Malay]", "[Arabic]", "[English]", "[Nepali]", "[Thai]",
    "[Burmese]", "[Vietnamese]", "[Khmer]", "[Urdu]", "[Russian]", "[Bengali]",
    "[Pashto]", "[Persian]", "[Farsi]", "[Dari]", "[Tamil]",
    "[Sinhala]", "[Hindi]", "[Filipino]", "[French]", "[Japanese]", "[Korean]", "[German]",
  ];
  const selected = new Set(selectedLanguages);
  const allCountryAndLanguageNames = Object.values(CAPTION_LANGUAGE_SPECS)
    .flatMap((spec) => spec.forbiddenNames || []);
  const unselectedLanguageNames = Object.keys(CAPTION_LANGUAGE_SPECS).filter((language) => !selected.has(language));
  return [...new Set([...genericNames, ...allCountryAndLanguageNames, ...unselectedLanguageNames])].filter(Boolean);
}

function getSelectedCaptionLanguages() {
  return [...els.copyLanguageInput.querySelectorAll('input[name="copyLanguage"]:checked')]
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("接口返回不是可解析的 JSON");
    return JSON.parse(match[0]);
  }
}

function ensureHashtags(text, requiredTags, maxTags = 5, position = "end") {
  const source = String(text || "").trim();
  if (!source) return "";
  const tagPattern = /#[\p{L}\p{N}_]+/gu;
  const seen = new Set();
  const collected = [];

  requiredTags.forEach((tag) => {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      collected.push(tag);
    }
  });

  const bodyWithoutTags = source.replace(tagPattern, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const existingTags = source.match(tagPattern) || [];
  existingTags.forEach((tag) => {
    const key = tag.toLowerCase();
    if (!seen.has(key) && collected.length < maxTags) {
      seen.add(key);
      collected.push(tag);
    }
  });

  const hashtags = collected.slice(0, maxTags).join(" ");
  return position === "start"
    ? `${hashtags} ${bodyWithoutTags}`.trim()
    : `${bodyWithoutTags}\n\n${hashtags}`.trim();
}

function combineCaptionByLanguage(parsedCaption, byLanguage) {
  const languages = getSelectedCaptionLanguages();
  if (!byLanguage || typeof byLanguage !== "object" || Array.isArray(byLanguage)) {
    return String(parsedCaption || "");
  }

  const parts = languages
    .map((language) => String(byLanguage[language] || "").trim())
    .filter(Boolean);

  return parts.length ? parts.join("\n\n") : String(parsedCaption || "");
}

function cleanCaptionText(text) {
  return stripChineseText(stripForbiddenCaptionNames(stripLanguageHeadings(text)));
}

async function requestTikTokCaptionPayload(apiKey, model, languages) {
  const response = await fetch("/api/analyze-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      model,
      image: state.imageDataUrl,
      prompt: buildCaptionInstruction(languages),
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(readableError(payload.error || `接口调用失败：${response.status}`));
  }

  return extractJson(payload.content || "");
}

async function requestTikTokCaptionTranslation(apiKey, model, language, englishDraft) {
  const response = await fetch("/api/analyze-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      model,
      image: state.imageDataUrl,
      prompt: buildCaptionTranslationInstruction(language, englishDraft),
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(readableError(payload.error || `接口调用失败：${response.status}`));
  }

  return extractJson(payload.content || "");
}

function mergeCaptionPayloads(payloads) {
  const merged = {
    hypic_caption: "",
    capcut_caption: "",
    capcut_reactivation_caption: "",
  };

  ["hypic_caption", "capcut_caption", "capcut_reactivation_caption"].forEach((field) => {
    merged[field] = payloads
      .map(({ language, parsed }) => {
        const byLanguage = parsed[`${field}_by_language`];
        const languageText = byLanguage && typeof byLanguage === "object" ? byLanguage[language] : "";
        return cleanCaptionText(languageText || parsed[field] || "");
      })
      .filter(Boolean)
      .join("\n\n");
  });

  return merged;
}

async function requestTikTokCaptionPayloadsByLanguage(apiKey, model, languages) {
  const payloads = [];
  setStatus("生成英文母稿中", "loading");
  const englishDraft = await requestTikTokCaptionPayload(apiKey, model, ["英语"]);

  for (const [index, language] of languages.entries()) {
    setStatus(`翻译文案中：${index + 1}/${languages.length}`, "loading");
    payloads.push({
      language,
      parsed: language === "英语"
        ? englishDraft
        : await requestTikTokCaptionTranslation(apiKey, model, language, englishDraft),
    });
  }
  return payloads;
}

function stripLanguageHeadings(text) {
  return String(text || "")
    .replace(/^\s*\[[^\]\r\n]{2,40}\]\s*$/gm, "")
    .replace(/^\s*(Indonesian|Malay|Arabic|English|Nepali|Thai|Burmese|Vietnamese|Khmer|Urdu|Pashto|Persian|Farsi|Dari|Tamil|Russian|Bengali|Sinhala|Hindi|Filipino|French|Japanese|Korean|German)\s*[:：]\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripForbiddenCaptionNames(text) {
  let cleaned = String(text || "");
  getForbiddenCaptionNames().forEach((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = /^[A-Za-z0-9 _-]+$/.test(name)
      ? new RegExp(`\\b${escaped}\\b`, "gi")
      : new RegExp(escaped, "g");
    cleaned = cleaned.replace(pattern, "");
  });
  return cleaned
    .replace(/\[\s*\]/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripUnselectedEnglish(text) {
  const selectedLanguages = getSelectedCaptionLanguages();
  if (selectedLanguages.includes("英语")) return String(text || "").trim();
  return String(text || "")
    .replace(/\b[A-Za-z][A-Za-z0-9'_-]*\b/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripChineseText(text) {
  const languages = getSelectedCaptionLanguages();
  const allowCjkText = languages.some((language) => ["日语", "韩语"].includes(language));
  if (allowCjkText) return String(text || "").trim();
  return String(text || "")
    .replace(/[\u3400-\u9fff]+/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function readableError(errorText) {
  let text = String(errorText || "未知错误");
  try {
    const parsed = JSON.parse(text);
    text = parsed?.error?.message || parsed?.message || text;
  } catch {}

  if (/Service temporarily unavailable/i.test(text)) {
    return `${FIXED_MODEL_LABEL} 或上游通道临时不可用，请稍后重试。`;
  }
  if (/Unauthorized|invalid api key|401/i.test(text)) {
    return "API Key 无效或没有权限，请检查第三方接口后台生成的 Key。";
  }
  if (/forbidden|access denied|permission|no access|没有权限|拒绝访问/i.test(text)) {
    return "第三方上游通道拒绝访问图片输入，请检查后台 Key、令牌分组、模型通道权限或联系接口平台管理员。";
  }
  if (/model|not found|unsupported/i.test(text)) {
    return "模型名不可用或不支持图片输入，请换用后台可用的视觉模型。";
  }
  if (/rate|limit|quota|balance/i.test(text)) {
    return "账号额度、余额或频率限制不足，请检查平台后台。";
  }
  return text;
}

async function callThirdPartyApi() {
  const apiKey = els.apiKeyInput.value.trim();
  const model = FIXED_MODEL;

  if (!apiKey && !serverKeyConfigured) {
    setStatus("缺少 API Key", "error");
    els.apiKeyInput.focus();
    return;
  }

  if (!state.imageDataUrl) {
    setStatus("请先上传图片", "error");
    return;
  }

  if (apiKey) localStorage.setItem("cccjin_api_key", apiKey);
  localStorage.setItem("cccjin_model", FIXED_MODEL);
  setStatus("调用中", "loading");
  els.generateButton.disabled = true;
  els.generateButton.textContent = "正在调用接口...";

  try {
    const response = await fetch("/api/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        model,
        image: state.imageDataUrl,
        prompt: buildInstruction(),
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(readableError(payload.error || `接口调用失败：${response.status}`));
    }

    const content = payload.content || "";
    const parsed = extractJson(content);
    const englishFallback = [
      parsed.main_prompt ? `Main Prompt:\n${parsed.main_prompt}` : "",
      parsed.negative_prompt ? `Negative Prompt:\n${parsed.negative_prompt}` : "",
      parsed.suggested_model_style ? `Suggested Model / Style:\n${parsed.suggested_model_style}` : "",
      parsed.suggested_parameters ? `Suggested Parameters:\n${parsed.suggested_parameters}` : "",
    ].filter(Boolean).join("\n\n");
    els.chatgptCnOutput.value = parsed.cn_full_prompt || parsed.chatgpt_cn || parsed.chatgpt || "";
    els.chatgptEnOutput.value = parsed.en_full_prompt || englishFallback || parsed.chatgpt_en || "";
    setStatus("生成完成", "ok");
  } catch (error) {
    setStatus("调用失败", "error");
    els.chatgptEnOutput.value = `调用失败：${readableError(error.message)}`;
    els.chatgptCnOutput.value = "";
  } finally {
    els.generateButton.disabled = false;
    els.generateButton.textContent = "生成同款模板";
  }
}

async function generateTikTokCaptions() {
  const apiKey = els.apiKeyInput.value.trim();
  const model = FIXED_MODEL;

  if (!apiKey && !serverKeyConfigured) {
    setStatus("缺少 API Key", "error");
    els.apiKeyInput.focus();
    return;
  }

  if (!state.imageDataUrl) {
    setStatus("请先上传图片", "error");
    return;
  }

  if (apiKey) localStorage.setItem("cccjin_api_key", apiKey);
  localStorage.setItem("cccjin_model", FIXED_MODEL);
  setStatus("生成文案中", "loading");
  els.generateCopyButton.disabled = true;
  els.generateCopyButton.textContent = "正在生成文案...";

  try {
    const selectedLanguages = getSelectedCaptionLanguages();
    const languages = selectedLanguages.length ? selectedLanguages : ["印尼语"];
    const parsed = languages.length > 1
      ? mergeCaptionPayloads(await requestTikTokCaptionPayloadsByLanguage(apiKey, model, languages))
      : mergeCaptionPayloads(await requestTikTokCaptionPayloadsByLanguage(apiKey, model, languages));

    els.hypicCaptionOutput.value = ensureHashtags(
      cleanCaptionText(
        combineCaptionByLanguage(parsed.hypic_caption, parsed.hypic_caption_by_language)
      ),
      ["#hypic", "#hypiccreator", "#hypicATETHAT", "#Godpic"],
      8,
      "start",
    );
    els.capcutCaptionOutput.value = ensureHashtags(
      cleanCaptionText(
        combineCaptionByLanguage(parsed.capcut_caption, parsed.capcut_caption_by_language)
      ),
      ["#capcut", "#capcutpioneer"],
      5,
    );
    els.capcutReactivationCaptionOutput.value = ensureHashtags(
      cleanCaptionText(
        combineCaptionByLanguage(parsed.capcut_reactivation_caption, parsed.capcut_reactivation_caption_by_language)
      ),
      ["#capcut", "#capcutpioneer", "#capcutnow"],
      5,
    );
    setStatus("文案完成", "ok");
  } catch (error) {
    setStatus("调用失败", "error");
    els.hypicCaptionOutput.value = `调用失败：${readableError(error.message)}`;
    els.capcutCaptionOutput.value = "";
    els.capcutReactivationCaptionOutput.value = "";
  } finally {
    els.generateCopyButton.disabled = false;
    els.generateCopyButton.textContent = "生成 TikTok 文案";
  }
}

function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.imageDataUrl = reader.result;
    state.fileName = file.name;
    els.previewImage.src = reader.result;
    els.previewWrap.classList.add("visible");
    setStatus("图片已就绪", "ok");
  };
  reader.readAsDataURL(file);
}

async function copyText(text, button, label) {
  await navigator.clipboard.writeText(text);
  button.textContent = "已复制";
  window.setTimeout(() => {
    button.textContent = label;
  }, 1300);
}

els.apiKeyInput.value = localStorage.getItem("cccjin_api_key") || "";
els.modelInput.value = FIXED_MODEL;
loadServerConfig();

els.input.addEventListener("change", (event) => {
  loadFile(event.target.files[0]);
});

["dragenter", "dragover"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("dragging");
  });
});

els.dropZone.addEventListener("drop", (event) => {
  loadFile(event.dataTransfer.files[0]);
});

document.addEventListener("paste", (event) => {
  const item = [...event.clipboardData.items].find((entry) => entry.type.startsWith("image/"));
  if (item) loadFile(item.getAsFile());
});

els.generateButton.addEventListener("click", callThirdPartyApi);
els.generateCopyButton.addEventListener("click", generateTikTokCaptions);

els.copyAllButton.addEventListener("click", () => {
  copyText(
    [
      `中文完整提示词：\n${els.chatgptCnOutput.value}`,
      `English Full Prompt:\n${els.chatgptEnOutput.value}`,
    ].join("\n\n"),
    els.copyAllButton,
    "复制全部",
  );
});

els.copyCaptionsButton.addEventListener("click", () => {
  copyText(
    [
      `Hypic Caption:\n${els.hypicCaptionOutput.value}`,
      `CapCut Caption:\n${els.capcutCaptionOutput.value}`,
      `CapCut Reactivation Caption:\n${els.capcutReactivationCaptionOutput.value}`,
    ].join("\n\n"),
    els.copyCaptionsButton,
    "复制文案",
  );
});

const outputMap = {
  chatgptCn: els.chatgptCnOutput,
  chatgptEn: els.chatgptEnOutput,
  hypicCaption: els.hypicCaptionOutput,
  capcutCaption: els.capcutCaptionOutput,
  capcutReactivationCaption: els.capcutReactivationCaptionOutput,
};

document.querySelectorAll(".copy-one").forEach((button) => {
  button.addEventListener("click", () => {
    const target = outputMap[button.dataset.copy];
    copyText(target.value, button, "复制");
  });
});

