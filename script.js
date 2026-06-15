const state = {
  imageDataUrl: "",
  fileName: "",
  generationImageDataUrl: "",
  generationFileName: "",
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
  imagePromptInput: document.querySelector("#imagePromptInput"),
  imageAspectRatioInput: document.querySelector("#imageAspectRatioInput"),
  generationImageInput: document.querySelector("#generationImageInput"),
  generationPreviewWrap: document.querySelector("#generationPreviewWrap"),
  generationPreviewImage: document.querySelector("#generationPreviewImage"),
  useEnglishPromptButton: document.querySelector("#useEnglishPromptButton"),
  generateImageButton: document.querySelector("#generateImageButton"),
  imageGenerationStatus: document.querySelector("#imageGenerationStatus"),
  generatedImageWrap: document.querySelector("#generatedImageWrap"),
  generatedImage: document.querySelector("#generatedImage"),
  generatedImageLink: document.querySelector("#generatedImageLink"),
  imageGenerationRawOutput: document.querySelector("#imageGenerationRawOutput"),
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
let imageKeyConfigured = false;
const FIXED_MODEL = "gpt-5.4";
const FIXED_MODEL_LABEL = "GPT5.4";
const IMAGE_MODEL = "gpt-image-2";

function setStatus(text, tone = "idle") {
  els.apiStatus.textContent = text;
  els.apiStatus.dataset.tone = tone;
}

async function loadServerConfig() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    serverKeyConfigured = Boolean(config.serverKeyConfigured);
    imageKeyConfigured = Boolean(config.imageKeyConfigured);
    els.modelInput.value = FIXED_MODEL;
    if (serverKeyConfigured) {
      els.apiKeyInput.value = "";
      els.apiKeyInput.placeholder = "已由站点服务器配置";
      els.apiKeyInput.disabled = true;
      els.apiKeyField.classList.add("hidden-field");
      els.apiKeyField.hidden = true;
      els.apiKeyField.style.display = "none";
      els.apiHint.textContent = imageKeyConfigured
        ? `站点已配置提示词 Key 和作图 Key，提示词固定使用 ${FIXED_MODEL_LABEL}，作图固定使用 ${IMAGE_MODEL}。`
        : `站点已配置提示词 Key。作图功能如需单独 Key，请在 Render 添加 LXC_IMAGE_API_KEY。`;
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

function buildCaptionInstruction() {
  const languages = getSelectedCaptionLanguages();
  if (!languages.length) languages.push("印尼语");
  const languageText = languages.join("、");
  const languageCount = languages.length;
  const totalCaptionBudget = 850;
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
    : "英语没有被选择，所以正文里禁止出现英语句子、英语 SEO 关键词、English hook、tutorial/trend/prompt/search keywords 等英文普通词；只允许保留 TikTok、AI、ChatGPT、Gemini、CapCut、Hypic 这类品牌/产品名和最后的强制 hashtag。";

  return `你是一个 TikTok 短视频文案生成器。请根据用户上传的图片，生成适合 TikTok 发布的长文案。文案语言必须只使用这些已选语言：${languageText}。只生成一条可直接发布的混合语言文案，不要按语言拆成多个版本。

用户补充：
- 图片主体：${subject}
- 文案类型：${type === "all" ? "全部生成" : type}
- 选中的文案语言：${languageText}
- 语言数量：${languageCount}
- 每个非空文案字段总长度目标：约 ${totalCaptionBudget} 个字符，不要因为语言数量增加而整体变长
- 每种语言在同一条文案里的长度目标：约 ${perLanguageBudget} 个字符，所有语言占比必须尽量平均

语言执行表（必须严格执行，每个非空字段都要覆盖全部已选语言）：
${selectedLanguageRules}

禁止使用的未选语言：${unselectedLanguageText}
禁止在输出文案里出现的国家名、地区名、语言名、标题名：${forbiddenNames}
英语限制：${englishRule}

文案必须模仿这种结构：
1. 平台标签可放在开头，尤其是 CapCut/Hypic 类文案，像 TikTok 爆款文案一样先吃平台流量。
2. 开头一句强钩子：类似“我教你怎么用 AI 做这个 trend，很简单”，要贴合图片效果。
3. 一大段用户搜索关键词堆叠：不要太规整，要像真实 TikTok SEO 文案，连续重复不同搜索写法。关键词必须翻译成已选语言；未选择英语时，不要写 tutorial、trend、prompt、search keywords 这类英文普通词。AI、ChatGPT、Gemini、CapCut、Hypic 作为品牌/产品名可以保留。
4. 一段自然文案：解释这个图片效果、画面风格、适合什么人、为什么容易火，可以多用 ✨📸🔥💖✍️ 等符号增强 TikTok 感。
5. 一段“图片提示词/教程”：告诉用户把自己的照片发给 ChatGPT/Gemini/Hypic/CapCut 后如何生成同款，必须根据图片内容写具体效果。
6. 一组相关词语：和图片内容、人物、场景、风格、教程、AI 生成有关，可以用 · 或 ｜ 连接。
7. 结尾 hashtags：必须包含指定强制话题，但每条文案 hashtag 总数不能超过 5 个。图片相关标签最多只补 1-3 个，不要堆标签。

分类规则：
- hypic_caption 是 Hypic 文案，必须包含这些话题且不能漏：#hypic #hypiccreator #hypicATETHAT #Godpic
- capcut_caption 是 CapCut 文案，必须包含这些话题且不能漏：#capcut #capcutpioneer
- capcut_reactivation_caption 是 CapCut 拉失活文案，必须包含这些话题且不能漏：#capcut #capcutpioneer #capcutnow，并且语气要更像召回老用户/让用户重新打开 CapCut 做同款，例如“还没试过这个模板就亏了”“现在打开 CapCut 做同款”。

写作要求：
- 如果文案类型是全部生成，就三个字段都输出完整文案。
- 如果只选择某一种类型，仍然输出 JSON 三个字段，但未选择的字段填空字符串。
- 长度控制是最高优先级之一：选择 1 个语言和选择 5 个语言时，每个非空字段的总字符数必须接近，不要按语言数量成倍增长。
- 如果只选择 1 个语言，该语言可以写得完整一些；如果选择多个语言，必须只生成一条混合语言文案，把所有选中语言写在同一条发布文案里，不要输出多个语言版本。
- 如果选择了多种语言，每一个非空字段都必须让所有选中语言交替出现。必须按“语言 1 一句、语言 2 一句、语言 3 一句……”的循环方式写，直到每种语言篇幅接近。不能只写其中几种语言，不能让某一种语言明显更多。
- 不要用 [Indonesian]、[Thai]、[English]、Indonesian:、Malay: 这类语言标题分段，不要按语言拆成独立段落，也不要出现任何国家名、地区名、语言名、国家/语言标题。
- 多语言占比是最高优先级：每种语言的字符量必须接近 1 / ${languageCount}，允许最多约 10% 偏差；所有 SEO 关键词、教程句、自然句都必须分配给各个已选语言，不能把 SEO 部分默认写成英语。
- 推荐混合方式：按所有选中语言各写一句短钩子，再按所有选中语言各写一组本语言 SEO/search keywords，再按所有选中语言各写一句同款效果或极短教程。整体看起来是一条自然的 TikTok 文案，而不是多个翻译版本。
- 不要重复翻译同一句太多次；每种语言表达同一个卖点即可，句子短、节奏快、适合 TikTok。
- 每个非空字段必须是可直接复制到 TikTok 的完整发布文案，但总长度必须控制在约 ${totalCaptionBudget} 字符。
- 文案整体要像 TikTok 达人主页里的爆款 SEO 长文案，不要像普通广告文案；允许关键词重复、短语堆叠、教程句反复变体。
- 根据所有所选语言共同输出主体内容；未选择英语时，禁止使用 English AI/search keywords 或英文长尾搜索词。选择英语时，英文也只能按平均份额出现。
- CapCut 拉失活文案要更直接地召回用户打开 CapCut，例如强调“现在就打开 CapCut”“这个模板别错过”“用旧照片也能做同款”。
- hashtag 要少而准，并且每个字段只在最后统一放一组 hashtag，不要在每个语言段重复放标签。Hypic 文案固定 4 个强制标签后最多再加 1 个；CapCut 文案固定 2 个强制标签后最多再加 3 个；CapCut 拉失活文案固定 3 个强制标签后最多再加 2 个。
- 不要为了凑字数写太长。多语言时优先压缩 SEO 关键词堆叠和教程句，保证总字符长度稳定。
- 不要 Markdown，不要解释，不要分代码块。
- 绝对不要输出中文汉字。当前文案语言选项不包含中文，所以 hypic_caption、capcut_caption、capcut_reactivation_caption 三个字段里都不能出现中文标题、中文解释、中文小节名或中文标签。
- 不要输出语言标题、国家标题或分隔标签，例如 [Indonesian]、[Malay]、[Arabic]、[English]、[Nepali]、Indonesian:、Malay:。正文直接开始写钩子和内容。
- 正文里不要出现国家名、地区名或语言名，例如 Indonesia、Indonesian、Thailand、Thai、Malaysia、Malay、Cambodia、Khmer、Pakistan、Urdu、Sri Lanka、Sinhala 等；只写对应语言的真实文案内容。
- 不要编造真实姓名，图片里看不清身份时用通用称呼。
- 图片提示词要具体到这张图的视觉元素，不能只写“生成同款图片”。

输出必须是 JSON：
{
  "hypic_caption": "Hypic 完整文案",
  "capcut_caption": "CapCut 完整文案",
  "capcut_reactivation_caption": "CapCut 拉失活完整文案"
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
  "阿拉伯语": {
    nativeName: "العربية",
    outputRule: "全部正文用自然阿拉伯语和阿拉伯文书写",
    forbiddenNames: ["Arab", "Arabic", "Arabic language", "العربية", "阿拉伯", "阿拉伯语"],
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

function ensureHashtags(text, requiredTags, maxTags = 5) {
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

  return `${bodyWithoutTags}\n\n${collected.slice(0, maxTags).join(" ")}`.trim();
}

function stripLanguageHeadings(text) {
  return String(text || "")
    .replace(/^\s*\[[^\]\r\n]{2,40}\]\s*$/gm, "")
    .replace(/^\s*(Indonesian|Malay|Arabic|English|Nepali|Thai|Burmese|Vietnamese|Khmer|Urdu|Russian|Bengali|Sinhala|Hindi|Filipino|French|Japanese|Korean|German)\s*[:：]\s*$/gim, "")
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

function extractImageFromText(text) {
  const source = String(text || "");
  const markdownMatch = source.match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (markdownMatch) return markdownMatch[1].trim();
  const urlMatch = source.match(/https?:\/\/[^\s)"']+/);
  if (urlMatch) return urlMatch[0];
  const dataMatch = source.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/);
  if (dataMatch) return dataMatch[0];
  return "";
}

function showGeneratedImage(src) {
  if (!src) {
    els.generatedImageWrap.classList.remove("visible");
    els.generatedImage.removeAttribute("src");
    els.generatedImageLink.href = "#";
    return;
  }
  els.generatedImage.src = src;
  els.generatedImageLink.href = src;
  els.generatedImageLink.download = "generated-image.png";
  els.generatedImageWrap.classList.add("visible");
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
    const response = await fetch("/api/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        model,
        image: state.imageDataUrl,
        prompt: buildCaptionInstruction(),
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(readableError(payload.error || `接口调用失败：${response.status}`));
    }

    const parsed = extractJson(payload.content || "");
    els.hypicCaptionOutput.value = ensureHashtags(
      stripChineseText(stripForbiddenCaptionNames(stripLanguageHeadings(parsed.hypic_caption))),
      ["#hypic", "#hypiccreator", "#hypicATETHAT", "#Godpic"],
      5,
    );
    els.capcutCaptionOutput.value = ensureHashtags(
      stripChineseText(stripForbiddenCaptionNames(stripLanguageHeadings(parsed.capcut_caption))),
      ["#capcut", "#capcutpioneer"],
      5,
    );
    els.capcutReactivationCaptionOutput.value = ensureHashtags(
      stripChineseText(stripForbiddenCaptionNames(stripLanguageHeadings(parsed.capcut_reactivation_caption))),
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

async function generateImageWithGptImage2() {
  const apiKey = els.apiKeyInput.value.trim();
  const prompt = els.imagePromptInput.value.trim() || els.chatgptEnOutput.value.trim();
  const aspectRatio = els.imageAspectRatioInput.value;

  if (!apiKey && !imageKeyConfigured) {
    setStatus("缺少 API Key", "error");
    els.apiKeyInput.focus();
    return;
  }

  if (!state.imageDataUrl) {
    setStatus("请先上传主体图或参考图", "error");
    return;
  }

  if (!state.generationImageDataUrl) {
    els.imageGenerationStatus.textContent = "请先在 gpt-image-2 区域上传自己的主体图。";
    els.generationImageInput.focus();
    return;
  }

  if (!prompt) {
    els.imageGenerationStatus.textContent = "请先填写生图提示词，或点击使用英文模板。";
    return;
  }

  if (apiKey) localStorage.setItem("cccjin_api_key", apiKey);
  els.imageGenerationStatus.textContent = "正在调用 gpt-image-2...";
  els.generateImageButton.disabled = true;
  els.generateImageButton.textContent = "正在生图...";
  showGeneratedImage("");
  if (els.imageGenerationRawOutput) els.imageGenerationRawOutput.value = "";

  try {
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey,
        model: IMAGE_MODEL,
        image: state.generationImageDataUrl,
        prompt: `${prompt}\n\nImage aspect ratio: ${aspectRatio}. Keep the composition optimized for ${aspectRatio}.`,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(readableError(payload.error || `接口调用失败：${response.status}`));
    }

    const image = payload.images?.[0] || extractImageFromText(payload.content);
    if (els.imageGenerationRawOutput) {
      els.imageGenerationRawOutput.value = payload.content || JSON.stringify(payload.raw || payload, null, 2);
    }
    if (image) {
      showGeneratedImage(image);
      els.imageGenerationStatus.textContent = "生图完成";
      setStatus("生图完成", "ok");
    } else {
      els.imageGenerationStatus.textContent = "接口已返回，但没有解析到图片。";
      setStatus("已返回文本", "ok");
    }
  } catch (error) {
    const message = readableError(error.message);
    els.imageGenerationStatus.textContent = `调用失败：${message}`;
    if (els.imageGenerationRawOutput) els.imageGenerationRawOutput.value = `调用失败：${message}`;
    setStatus("调用失败", "error");
  } finally {
    els.generateImageButton.disabled = false;
    els.generateImageButton.textContent = "调用 gpt-image-2 生图";
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

function loadGenerationFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.generationImageDataUrl = reader.result;
    state.generationFileName = file.name;
    els.generationPreviewImage.src = reader.result;
    els.generationPreviewWrap.classList.add("visible");
    els.imageGenerationStatus.textContent = "主体图已就绪，可以调用 gpt-image-2。";
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

els.generationImageInput.addEventListener("change", (event) => {
  loadGenerationFile(event.target.files[0]);
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
els.useEnglishPromptButton.addEventListener("click", () => {
  els.imagePromptInput.value = els.chatgptEnOutput.value.trim();
  els.imagePromptInput.focus();
});
els.generateImageButton.addEventListener("click", generateImageWithGptImage2);

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

