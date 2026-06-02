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
const FIXED_MODEL = "gpt-5.5";
const FIXED_MODEL_LABEL = "GPT-5.5";

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
      els.apiHint.textContent = `站点已配置统一 API Key，固定使用 ${FIXED_MODEL_LABEL}。上传图片后直接生成即可。`;
      setStatus("站点已配置", "ok");
    }
  } catch {
    setStatus("等待配置", "idle");
  }
}

function buildInstruction() {
  return `你是一个“原始生图提示词反推器”。用户上传的图片是一张由“自拍/原图 + 一段英文生图 prompt”生成出来的成品效果图。你的任务不是优化提示词，不是写摄影分析，而是尽量反推出接近原始 prompt 写法的短提示词，让用户以后只需要上传自己的照片，再粘贴你输出的提示词，就能生成同款效果。

核心目标：反推“原始 prompt 的意图和句式”。输出要像用户真的会拿去生图的原句，直接、可复制、带一点关键词堆叠。可以比普通短 prompt 更长一点，用来还原主体以外的场景、文字、道具和新增人物细节；但不要改写成空泛的摄影分析。

用户补充：
- 你的照片主体：${els.subjectInput.value.trim() || "我上传的人物照片"}
- 输出用途：${els.goalSelect.value}
- 替换策略：${els.sceneSelect.value}
- 保留重点：${els.focusSelect.value}

生成规则：
1. 输出的是“自己的照片 + 这段 prompt 即可做同款”的原始风格提示词，不是图片描述、不是分析、不是润色后的摄影脚本。
2. 每条只写一段，不要分点，不要解释，不要写“参考图中/这张图/画面里可以看到”。
3. 英文通常控制在 70-150 个词，中文通常控制在 90-220 个汉字；如果主体以外的场景、牌匾、文字、建筑、道具、新增人物很多，允许更长一点。宁可稍长也要还原细节，但仍然只输出一段可直接生图的 prompt。
4. 英文要尽量使用这种原始句式：generate a realistic/photo realistic scene of this guy/girl/person from the first image..., add/generate..., standing beside him..., walking hand in hand..., in front of..., cinematic realistic filter。只有遇到手机破屏图时才使用 walking out of giant smartphone screen、TikTok profile、shattered glass 这一类句式。
5. 中文也要像直译的生图提示词，不要变成长篇专业描述。
6. “你的照片主体”是强控制条件，也是唯一可替换变量。只要用户在这个字段里确定了主体，例如“图片中的男性/女性/左边人物/中间人物/我的产品/我的宠物”，输出时就只能把这个主体写成 man/woman/person/product/pet from the first image / 上传照片里的主体；绝对不要描述这个可替换主体的脸、发型、肤色、年龄、身材、衣服、裤子、鞋子、配饰、文字 logo、颜色、材质等外观细节，因为用户会重新上传另一张主体照片，这些细节必须由新照片自己决定。
7. 对可替换主体只保留动作、姿势、站位和互动关系，例如 walking, standing on the left, holding hands, looking at the woman, sitting, leaning, holding an object, walking beside her。主体的动作可以写，主体的外貌、穿搭、材质和旧照片特征不要写。
8. 除了用户确定的主体以外，画面里的所有内容都要完整还原并写进 prompt：新增人物、女性/男性/儿童、宠物、道具、车辆、建筑、背景地标、灯光、天气、文字牌匾、树叶、地面、构图、滤镜、氛围等。非主体元素都要当作 AI 在 prompt 里新生成或固定复现的模板内容，不要写成第二张照片或原本合照。
9. 对于被 AI 新增的人物，必须像锁定角色设定一样还原她/他在参考图里的所有关键细节：性别、年龄段、肤色、人种/地域气质、脸型气质、发型、头发颜色、身材比例、上衣、外套、裤子/裙子、鞋子、包包、配饰、姿势、站位、表情、视线、和主体的互动关系。尤其是情侣感画面，如果主体是男性，女性通常是 prompt 生成出来的角色，要写“generate/add a beautiful young Southeast Asian woman beside him”，并保留她的年轻东南亚女孩气质、浅暖肤色、甜美脸型、长红色卷发、白色抹胸/短上衣、米色针织开衫、浅蓝刺绣宽松牛仔裤、白色鞋、斜挎包、微笑看向男性等细节。
10. 场景必须细写，尤其是参考图中后面的牌匾、招牌、门楼、柱子、可见文字和背景层次。能看清文字时要尽量写出文字内容和样式；看不准时也要写出“large cream/white Japanese/Chinese characters on a dark wooden plaque / 黑色木牌匾上的大号白色汉字/日文字符”。要描述牌匾在画面顶部、木质寺庙门框、两侧柱子、入口深处、台阶、长椅、树叶绿植、背景虚化游客、石板或浅色地面等可见元素。
11. 必须保留参考图最显眼、最可能来自原 prompt 的词：主体动作、人物互动、场景、背景地标、牌匾文字、关键道具、屏幕/海报/车辆/灯笼等元素、AI 新增角色的造型细节、真实电影感滤镜。不要描述可替换主体的旧照片穿搭，也不要忽略主体以外的任何重要细节。
12. 不要强行加入“low-angle、dust、smoke、dark gritty environment、high contrast、poster style”等泛化词，除非它们是画面核心且原 prompt 很可能会写。
13. 人物替换方式：ChatGPT 版可以写“photo from the first image / 上传的第一张照片”；Hypic 版可以写“uploaded photo subject / 上传照片人物”。重点是让用户上传自己的照片后能套用。
14. 如果画面有可识别平台样式，可以写 TikTok profile / 短视频主页；如果有真实用户名，不要复制具体用户名，写 with the username / 带用户名区域 即可。
15. 禁止输出负面提示词、同款变体、解释说明。

强参考示例，遇到类似“人物走出巨大手机屏幕、TikTok 主页、玻璃碎裂”的图时，英文应该接近这种，而不是专业改写：
generate a dramatic photo realistic scene of this guy in stylish jeans and green scarf clothes photo from the first image confidently walking out of a giant smartphone screen, the phone screen resembles a tiktok profile with the username, the glass of the phone is shattered with shards flying outward creating a dynamic cinematic filter

强参考示例，遇到类似“上传男性照片 + AI 生成女性站在旁边”的情侣旅行图时，不要写成情侣合照，要接近这种：
generate a realistic photo of the man from the first image walking hand in hand with a beautiful young Southeast Asian woman beside him, standing on the left and looking at her, the woman has warm light skin, sweet face, long wavy deep red hair with bangs, slim body, smiling and looking at the man, wearing a white cropped tube top, beige knitted cardigan, light blue wide jeans with subtle floral embroidery, white shoes and a brown crossbody bag, couple travel style in front of an old Japanese temple wooden gate, large dark wooden plaque at the top with big cream Japanese characters, side wooden pillars with vertical white characters, green trees, stone path, soft blurred tourists and stairs in the background, natural daylight, romantic cinematic realistic filter

如果用户确定“图片中的男性”为主体，错误写法是描述男性的卷发、肤色、白色 T 恤、黑色工装裤、球鞋；正确写法是只写 man from the first image walking hand in hand, standing on the left, looking at the woman，然后完整写女性和寺庙场景的细节。

如果图里有牌匾或可见文字，输出不能只写 temple gate / street background，必须写出牌匾的位置、底色、字的颜色、字的大致内容或“large Japanese characters”，以及周围木柱、门框、树叶、台阶、地面和背景人物。

输出必须是 JSON，不要 Markdown，不要代码块：
{
  "chatgpt_cn": "接近原始 prompt 写法的中文同款提示词",
  "chatgpt_en": "English prompt close to the original generation prompt style"
}`;
}

function buildCaptionInstruction() {
  const languages = getSelectedCaptionLanguages();
  if (!languages.length) languages.push("印尼语");
  const languageText = languages.join("、");
  const type = els.copyTypeSelect.value;
  const subject = els.subjectInput.value.trim() || "按图片主体判断";

  return `你是一个 TikTok 短视频文案生成器。请根据用户上传的图片，生成适合 TikTok 发布的长文案。文案语言必须是：${languageText}。

用户补充：
- 图片主体：${subject}
- 文案类型：${type === "all" ? "全部生成" : type}
- 选中的文案语言：${languageText}

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
- 如果选择了多种语言，每一个非空字段都必须按照所有选中语言分别生成完整文案。格式用英文语言标签分隔，例如：
  [Indonesian]
  完整印尼语文案

  [Thai]
  完整泰语文案
  选择几种语言就输出几段，不要漏掉任何一种语言。
- 每个文案必须是可直接复制到 TikTok 的完整发布文案。
- 文案整体要像 TikTok 达人主页里的爆款 SEO 长文案，不要像普通广告文案；允许关键词重复、短语堆叠、教程句反复变体。
- 根据每个所选语言分别输出主体内容；如果图片风格适合跨区流量，可以少量混入 English AI/search keywords，但每段主体语言必须保持为该段对应语言。
- CapCut 拉失活文案要更直接地召回用户打开 CapCut，例如强调“现在就打开 CapCut”“这个模板别错过”“用旧照片也能做同款”。
- hashtag 要少而准：Hypic 文案固定 4 个强制标签后最多再加 1 个；CapCut 文案固定 2 个强制标签后最多再加 3 个；CapCut 拉失活文案固定 3 个强制标签后最多再加 2 个。
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
    return "API Key 无效或没有权限，请检查 apis.cccjin.cn 后台生成的 Key。";
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
    els.chatgptCnOutput.value = parsed.chatgpt_cn || parsed.chatgpt || "";
    els.chatgptEnOutput.value = parsed.chatgpt_en || "";
    setStatus("生成完成", "ok");
  } catch (error) {
    setStatus("调用失败", "error");
    els.chatgptCnOutput.value = `调用失败：${readableError(error.message)}`;
    els.chatgptEnOutput.value = "";
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
      `ChatGPT 中文模板：\n${els.chatgptCnOutput.value}`,
      `ChatGPT English Template:\n${els.chatgptEnOutput.value}`,
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


