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
  modelSelect: document.querySelector("#modelSelect"),
  modelSuggestions: document.querySelector("#modelSuggestions"),
  checkModelsButton: document.querySelector("#checkModelsButton"),
  generateButton: document.querySelector("#generateButton"),
  generateCopyButton: document.querySelector("#generateCopyButton"),
  apiHint: document.querySelector("#apiHint"),
  chatgptCnOutput: document.querySelector("#chatgptCnOutput"),
  chatgptEnOutput: document.querySelector("#chatgptEnOutput"),
  hypicCnOutput: document.querySelector("#hypicCnOutput"),
  hypicEnOutput: document.querySelector("#hypicEnOutput"),
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

function setStatus(text, tone = "idle") {
  els.apiStatus.textContent = text;
  els.apiStatus.dataset.tone = tone;
}

async function loadServerConfig() {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    serverKeyConfigured = Boolean(config.serverKeyConfigured);
    if (config.defaultModel && !localStorage.getItem("cccjin_model")) {
      els.modelInput.value = config.defaultModel;
    }
    if (serverKeyConfigured) {
      els.apiKeyInput.value = "";
      els.apiKeyInput.placeholder = "已由站点服务器配置";
      els.apiKeyInput.disabled = true;
      els.apiKeyField.classList.add("hidden-field");
      els.apiKeyField.hidden = true;
      els.apiKeyField.style.display = "none";
      els.apiHint.textContent = "站点已配置统一 API Key，用户无需填写。上传参考图后直接生成即可。";
      setStatus("站点已配置", "ok");
    }
  } catch {
    setStatus("等待配置", "idle");
  }
}

function buildInstruction() {
  return `你是一个“原始生图提示词反推器”。用户上传的图片是一张由“自拍/原图 + 一段英文生图 prompt”生成出来的成品效果图。你的任务不是优化提示词，不是写摄影分析，而是尽量反推出接近原始 prompt 写法的短提示词，让用户以后只需要上传自己的照片，再粘贴你输出的提示词，就能生成同款效果。

核心目标：反推“原始 prompt 的意图和句式”。输出要像用户真的会拿去生图的原句，短、直接、带一点不完美英文和关键词堆叠。不要改写成专业摄影说明，不要加入太多参考图没有明确要求的细节。

用户补充：
- 你的照片主体：${els.subjectInput.value.trim() || "我上传的人物照片"}
- 输出用途：${els.goalSelect.value}
- 替换策略：${els.sceneSelect.value}
- 保留重点：${els.focusSelect.value}

生成规则：
1. 输出的是“自己的照片 + 这段 prompt 即可做同款”的原始风格提示词，不是图片描述、不是分析、不是润色后的摄影脚本。
2. 每条只写一段，不要分点，不要解释，不要写“参考图中/这张图/画面里可以看到”。
3. 英文控制在 35-75 个词，中文控制在 45-110 个汉字；越接近原始 prompt 越好。
4. 英文要尽量使用这种原始句式：generate a dramatic photo realistic scene of this guy/girl/person from the first image..., confidently walking out of..., the screen resembles..., shattered glass..., shards flying outward..., dynamic cinematic filter。
5. 中文也要像直译的生图提示词，不要变成长篇专业描述。
6. 必须保留参考图最显眼、最可能来自原 prompt 的词：主体服装/造型、动作、巨大手机屏幕、短视频/TikTok profile 或社交主页、用户名/profile 区域、玻璃碎裂、碎片飞出、动态电影感滤镜。
7. 不要强行加入“low-angle、dust、smoke、dark gritty environment、high contrast、poster style”等泛化词，除非它们是画面核心且原 prompt 很可能会写。
8. 人物替换方式：ChatGPT 版可以写“photo from the first image / 上传的第一张照片”；Hypic 版可以写“uploaded photo subject / 上传照片人物”。重点是让用户上传自己的照片后能套用。
9. 如果画面有可识别平台样式，可以写 TikTok profile / 短视频主页；如果有真实用户名，不要复制具体用户名，写 with the username / 带用户名区域 即可。
10. 禁止输出负面提示词、同款变体、解释说明。

强参考示例，遇到类似“人物走出巨大手机屏幕、TikTok 主页、玻璃碎裂”的图时，英文应该接近这种，而不是专业改写：
generate a dramatic photo realistic scene of this guy in stylish jeans and green scarf clothes photo from the first image confidently walking out of a giant smartphone screen, the phone screen resembles a tiktok profile with the username, the glass of the phone is shattered with shards flying outward creating a dynamic cinematic filter

输出必须是 JSON，不要 Markdown，不要代码块：
{
  "chatgpt_cn": "接近原始 prompt 写法的中文同款提示词",
  "chatgpt_en": "English prompt close to the original generation prompt style",
  "hypic_cn": "更短的 Hypic 中文原始风格提示词",
  "hypic_en": "shorter Hypic English prompt close to the original style"
}`;
}

function buildCaptionInstruction() {
  const language = els.copyLanguageInput.value.trim() || "印尼语";
  const type = els.copyTypeSelect.value;
  const subject = els.subjectInput.value.trim() || "按图片主体判断";

  return `你是一个 TikTok 短视频文案生成器。请根据用户上传的图片，生成适合 TikTok 发布的长文案。文案语言必须是：${language}。

用户补充：
- 图片主体：${subject}
- 文案类型：${type === "all" ? "全部生成" : type}

文案必须模仿这种结构：
1. 开头一句强钩子：类似“我教你怎么用 AI 做这个 trend，很简单”，要贴合图片效果。
2. 一大段用户搜索关键词堆叠：包含教程词、trend 词、AI 词、ChatGPT/Gemini/CapCut/Hypic 词、图片风格词、用户可能搜索的长尾词。
3. 一段自然文案：解释这个图片效果、画面风格、适合什么人、为什么容易火。
4. 一段“图片提示词”：告诉用户把自己的照片发给 ChatGPT/Gemini/Hypic/CapCut 后如何生成同款，必须根据图片内容写具体效果。
5. 一组相关词语：和图片内容、人物、场景、风格、教程、AI 生成有关。
6. 结尾 hashtags：必须包含指定强制话题，同时补充和图片相关的话题。

分类规则：
- hypic_caption 是 Hypic 文案，必须包含这些话题且不能漏：#hypic #hypiccreator #hypicATETHAT #Godpic
- capcut_caption 是 CapCut 文案，必须包含这些话题且不能漏：#capcut #capcutpioneer
- capcut_reactivation_caption 是 CapCut 拉失活文案，必须包含这些话题且不能漏：#capcut #capcutpioneer #capcutnow，并且语气要更像召回老用户/让用户重新打开 CapCut 做同款，例如“还没试过这个模板就亏了”“现在打开 CapCut 做同款”。

写作要求：
- 如果文案类型是全部生成，就三个字段都输出完整文案。
- 如果只选择某一种类型，仍然输出 JSON 三个字段，但未选择的字段填空字符串。
- 每个文案必须是可直接复制到 TikTok 的完整发布文案。
- 不要 Markdown，不要解释，不要分代码块。
- 不要使用中文，除非文案语言选择中文。
- 不要编造真实姓名，图片里看不清身份时用通用称呼。
- 图片提示词要具体到这张图的视觉元素，不能只写“生成同款图片”。

输出必须是 JSON：
{
  "hypic_caption": "Hypic 完整文案",
  "capcut_caption": "CapCut 完整文案",
  "capcut_reactivation_caption": "CapCut 拉失活完整文案"
}`;
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

function ensureHashtags(text, requiredTags) {
  const source = String(text || "").trim();
  if (!source) return "";
  const missingTags = requiredTags.filter((tag) => !source.toLowerCase().includes(tag.toLowerCase()));
  return missingTags.length ? `${source}\n\n${missingTags.join(" ")}` : source;
}

function readableError(errorText) {
  let text = String(errorText || "未知错误");
  try {
    const parsed = JSON.parse(text);
    text = parsed?.error?.message || parsed?.message || text;
  } catch {}

  if (/Service temporarily unavailable/i.test(text)) {
    return "当前模型或上游通道临时不可用。请点“检测可用模型”，换一个支持图片输入的模型后重试。";
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

async function checkModels() {
  const apiKey = els.apiKeyInput.value.trim();
  if (!apiKey && !serverKeyConfigured) {
    setStatus("缺少 API Key", "error");
    els.apiKeyInput.focus();
    return;
  }

  setStatus("检测中", "loading");
  els.checkModelsButton.disabled = true;
  els.checkModelsButton.textContent = "正在检测...";

  try {
    const response = await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `检测失败：${response.status}`);

    const models = payload.models || [];
    els.modelSuggestions.innerHTML = "";
    els.modelSelect.innerHTML = "";
    models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model;
      els.modelSuggestions.appendChild(option);

      const selectOption = document.createElement("option");
      selectOption.value = model;
      selectOption.textContent = model;
      els.modelSelect.appendChild(selectOption);
    });

    const visualCandidates = models.filter((model) => /gemini|gpt-4o|vision|vl|qwen-vl|claude/i.test(model));
    const currentModel = els.modelInput.value.trim();
    if (visualCandidates.length && !visualCandidates.includes(currentModel)) {
      els.modelInput.value = visualCandidates[0];
      els.modelSelect.value = visualCandidates[0];
    } else if (models.includes(currentModel)) {
      els.modelSelect.value = currentModel;
    } else if (models.length) {
      els.modelSelect.value = models[0];
    }

    els.apiHint.textContent = visualCandidates.length
      ? `检测到 ${models.length} 个模型。已优先推荐可能支持图片的模型：${visualCandidates.slice(0, 5).join("、")}`
      : `检测到 ${models.length} 个模型：${models.join("、")}。未能自动识别视觉模型，请从列表中切换模型重试。`;
    setStatus("模型已更新", "ok");
  } catch (error) {
    setStatus("检测失败", "error");
    els.apiHint.textContent = readableError(error.message);
  } finally {
    els.checkModelsButton.disabled = false;
    els.checkModelsButton.textContent = "检测可用模型";
  }
}

async function callThirdPartyApi() {
  const apiKey = els.apiKeyInput.value.trim();
  const model = els.modelInput.value.trim();

  if (!apiKey && !serverKeyConfigured) {
    setStatus("缺少 API Key", "error");
    els.apiKeyInput.focus();
    return;
  }

  if (!model) {
    setStatus("缺少模型名", "error");
    els.modelInput.focus();
    return;
  }

  if (!state.imageDataUrl) {
    setStatus("请先上传图片", "error");
    return;
  }

  if (apiKey) localStorage.setItem("cccjin_api_key", apiKey);
  localStorage.setItem("cccjin_model", model);
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
    els.hypicCnOutput.value = parsed.hypic_cn || parsed.gemini_cn || parsed.gemini || "";
    els.hypicEnOutput.value = parsed.hypic_en || parsed.gemini_en || "";
    setStatus("生成完成", "ok");
  } catch (error) {
    setStatus("调用失败", "error");
    els.chatgptCnOutput.value = `调用失败：${readableError(error.message)}`;
    els.chatgptEnOutput.value = "";
    els.hypicCnOutput.value = "";
    els.hypicEnOutput.value = "";
  } finally {
    els.generateButton.disabled = false;
    els.generateButton.textContent = "生成同款模板";
  }
}

async function generateTikTokCaptions() {
  const apiKey = els.apiKeyInput.value.trim();
  const model = els.modelInput.value.trim();

  if (!apiKey && !serverKeyConfigured) {
    setStatus("缺少 API Key", "error");
    els.apiKeyInput.focus();
    return;
  }

  if (!model) {
    setStatus("缺少模型名", "error");
    els.modelInput.focus();
    return;
  }

  if (!state.imageDataUrl) {
    setStatus("请先上传图片", "error");
    return;
  }

  if (apiKey) localStorage.setItem("cccjin_api_key", apiKey);
  localStorage.setItem("cccjin_model", model);
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
    els.hypicCaptionOutput.value = ensureHashtags(parsed.hypic_caption, [
      "#hypic",
      "#hypiccreator",
      "#hypicATETHAT",
      "#Godpic",
    ]);
    els.capcutCaptionOutput.value = ensureHashtags(parsed.capcut_caption, ["#capcut", "#capcutpioneer"]);
    els.capcutReactivationCaptionOutput.value = ensureHashtags(parsed.capcut_reactivation_caption, [
      "#capcut",
      "#capcutpioneer",
      "#capcutnow",
    ]);
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
els.modelInput.value = localStorage.getItem("cccjin_model") || els.modelInput.value;
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
els.checkModelsButton.addEventListener("click", checkModels);
els.modelSelect.addEventListener("change", () => {
  if (els.modelSelect.value) {
    els.modelInput.value = els.modelSelect.value;
    localStorage.setItem("cccjin_model", els.modelSelect.value);
  }
});

els.copyAllButton.addEventListener("click", () => {
  copyText(
    [
      `ChatGPT 中文模板：\n${els.chatgptCnOutput.value}`,
      `ChatGPT English Template:\n${els.chatgptEnOutput.value}`,
      `Hypic 中文模板：\n${els.hypicCnOutput.value}`,
      `Hypic English Template:\n${els.hypicEnOutput.value}`,
    ].join("\n\n"),
    els.copyAllButton,
    "复制全部",
  );
});

els.copyCaptionsButton.addEventListener("click", () => {
  copyText(
    [
      `Hypic 文案：\n${els.hypicCaptionOutput.value}`,
      `CapCut 文案：\n${els.capcutCaptionOutput.value}`,
      `CapCut 拉失活文案：\n${els.capcutReactivationCaptionOutput.value}`,
    ].join("\n\n"),
    els.copyCaptionsButton,
    "复制文案",
  );
});

const outputMap = {
  chatgptCn: els.chatgptCnOutput,
  chatgptEn: els.chatgptEnOutput,
  hypicCn: els.hypicCnOutput,
  hypicEn: els.hypicEnOutput,
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


