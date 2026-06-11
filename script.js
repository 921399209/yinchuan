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
const FIXED_MODEL = "gpt-5.5";
const FIXED_MODEL_LABEL = "GPT-5.5";
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
        ? `站点已配置提示词 Key 和作图 Key，接口统一走 www.lxc.lt/v1，提示词固定使用 ${FIXED_MODEL_LABEL}，作图固定使用 ${IMAGE_MODEL}。`
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

  return `你是一个 TikTok 短视频文案生成器。请根据用户上传的图片，生成适合 TikTok 发布的长文案。文案语言必须是：${languageText}。

用户补充：
- 图片主体：${subject}
- 文案类型：${type === "all" ? "全部生成" : type}
- 选中的文案语言：${languageText}
- 语言数量：${languageCount}
- 每个非空文案字段总长度目标：约 ${totalCaptionBudget} 个字符，不要因为语言数量增加而整体变长
- 每个语言段长度目标：约 ${perLanguageBudget} 个字符，语言越多每段越短

文案必须模仿这种结构：
1. 平台标签可放在开头，尤其是 CapCut/Hypic 类文案，像 TikTok 爆款文案一样先吃平台流量。
2. 开头一句强钩子：类似“我教你怎么用 AI 做这个 trend，很简单”，要贴合图片效果。
3. 一大段用户搜索关键词堆叠：不要太规整，要像真实 TikTok SEO 文案，连续重复不同搜索写法，包含 tutorial、trend、prompt、AI、ChatGPT、Gemini、CapCut/Hypic、图片风格词、用户可能搜索的长尾词。
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
- 如果只选择 1 个语言，该语言可以写得完整一些；如果选择多个语言，每个语言段必须明显缩短，只保留钩子、核心 SEO 关键词、同款效果描述、极短教程。
- 如果选择了多种语言，每一个非空字段都必须按照所有选中语言分别生成短文案。格式用英文语言标签分隔，例如：
  [Indonesian]
  短印尼语文案

  [Thai]
  短泰语文案
  选择几种语言就输出几段，不要漏掉任何一种语言。
- 每个非空字段必须是可直接复制到 TikTok 的完整发布文案，但总长度必须控制在约 ${totalCaptionBudget} 字符。
- 文案整体要像 TikTok 达人主页里的爆款 SEO 长文案，不要像普通广告文案；允许关键词重复、短语堆叠、教程句反复变体。
- 根据每个所选语言分别输出主体内容；如果图片风格适合跨区流量，可以少量混入 English AI/search keywords，但每段主体语言必须保持为该段对应语言。
- CapCut 拉失活文案要更直接地召回用户打开 CapCut，例如强调“现在就打开 CapCut”“这个模板别错过”“用旧照片也能做同款”。
- hashtag 要少而准，并且每个字段只在最后统一放一组 hashtag，不要在每个语言段重复放标签。Hypic 文案固定 4 个强制标签后最多再加 1 个；CapCut 文案固定 2 个强制标签后最多再加 3 个；CapCut 拉失活文案固定 3 个强制标签后最多再加 2 个。
- 不要为了凑字数写太长。多语言时优先压缩 SEO 关键词堆叠和教程句，保证总字符长度稳定。
- 不要 Markdown，不要解释，不要分代码块。
- 绝对不要输出中文汉字。当前文案语言选项不包含中文，所以 hypic_caption、capcut_caption、capcut_reactivation_caption 三个字段里都不能出现中文标题、中文解释、中文小节名或中文标签。语言分隔标题也必须用英文，例如 [Indonesian]、[Thai]、[Russian]。
- 不要编造真实姓名，图片里看不清身份时用通用称呼。
- 图片提示词要具体到这张图的视觉元素，不能只写“生成同款图片”。

输出必须是 JSON：
{
  "hypic_caption": "Hypic 完整文案",
  "capcut_caption": "CapCut 完整文案",
  "capcut_reactivation_caption": "CapCut 拉失活完整文案"
}`;
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
    return "API Key 无效或没有权限，请检查 www.lxc.lt 后台生成的 Key。";
  }
  if (/forbidden|access denied|permission|no access|没有权限|拒绝访问/i.test(text)) {
    return "LXC 上游通道拒绝访问图片输入，请检查 www.lxc.lt 后台的 Key、令牌分组、模型通道权限或联系接口平台管理员。";
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
      stripChineseText(parsed.hypic_caption),
      ["#hypic", "#hypiccreator", "#hypicATETHAT", "#Godpic"],
      5,
    );
    els.capcutCaptionOutput.value = ensureHashtags(
      stripChineseText(parsed.capcut_caption),
      ["#capcut", "#capcutpioneer"],
      5,
    );
    els.capcutReactivationCaptionOutput.value = ensureHashtags(
      stripChineseText(parsed.capcut_reactivation_caption),
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


