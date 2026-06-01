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
  apiHint: document.querySelector("#apiHint"),
  chatgptCnOutput: document.querySelector("#chatgptCnOutput"),
  chatgptEnOutput: document.querySelector("#chatgptEnOutput"),
  hypicCnOutput: document.querySelector("#hypicCnOutput"),
  hypicEnOutput: document.querySelector("#hypicEnOutput"),
  copyAllButton: document.querySelector("#copyAllButton"),
  subjectInput: document.querySelector("#subjectInput"),
  goalSelect: document.querySelector("#goalSelect"),
  sceneSelect: document.querySelector("#sceneSelect"),
  focusSelect: document.querySelector("#focusSelect"),
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
  return `你是一个“同款效果提示词反推器”。用户上传的图片不是要被描述的普通图片，而是一张已经由“原图 + 生图提示词”生成出来的成品效果图。你的任务是反推出一段可复用的同款提示词：用户以后只需要上传自己的照片，再粘贴你输出的提示词，就能把自己的照片做成和参考效果图一样的视觉效果。

核心目标：输出必须像原始生图 prompt 一样短、直接、好用。提示词要以“我上传的照片中的人物/主体”为唯一主角，保留本人的五官、发型、肤色、脸型、身份一致性，然后把这个人放进参考图的同款场景、动作、构图、特效、光影、色调和氛围里。

用户补充：
- 你的照片主体：${els.subjectInput.value.trim() || "我上传的人物照片"}
- 输出用途：${els.goalSelect.value}
- 替换策略：${els.sceneSelect.value}
- 保留重点：${els.focusSelect.value}

生成规则：
1. 输出的是“上传自己的照片 + 这段提示词即可做同款”的提示词，不是图片描述、不是画面分析、不是复述参考图。
2. 每条提示词只写一段，不要分点，不要解释，不要写“参考图中/这张图/画面里可以看到”。
3. 中文控制在 60-130 个汉字；英文控制在 45-95 个词，越接近原始 prompt 越好。
4. 必须写清楚：使用我上传的照片作为人物/主体参考，保留真实脸部、发型、肤色、体型和身份一致。
5. 必须把参考图最关键的同款效果提炼出来：人物动作、主体与场景关系、关键道具或背景、构图机位、破碎/烟雾/光效等特效、色调和电影感。
6. 不能把参考图里的具体人物身份、性别、年龄、服装细节硬编码成固定内容，除非这是同款效果必需的造型元素；优先写“上传照片中的人物 / the person from my uploaded photo”。
7. 如果有 logo、用户名、水印、文字，只写可替换结构，例如“社交媒体主页界面 / social profile interface”，不要复制真实平台名和真实文字。
8. ChatGPT 版本要明确适合“上传一张本人照片后使用”；Hypic 版本要更短、更像关键词生图 prompt。
9. 只输出能直接粘贴使用的提示词，禁止输出负面提示词、同款变体、解释说明。

参考写法风格：
中文：使用我上传的人物照片作为主角，保持本人五官和身份一致，让他/她……，同款……效果，……飞溅/环绕，电影感写实光影。
英文：use the person from my uploaded photo as the main subject, keep the same face and identity, ... same-style ..., cinematic realistic lighting, dynamic ...

输出必须是 JSON，不要 Markdown，不要代码块：
{
  "chatgpt_cn": "上传自己的照片后可直接使用的中文同款提示词",
  "chatgpt_en": "English same-style prompt to use with the user's own uploaded photo",
  "hypic_cn": "更短的 Hypic 中文同款提示词",
  "hypic_en": "shorter Hypic English same-style prompt"
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

const outputMap = {
  chatgptCn: els.chatgptCnOutput,
  chatgptEn: els.chatgptEnOutput,
  hypicCn: els.hypicCnOutput,
  hypicEn: els.hypicEnOutput,
};

document.querySelectorAll(".copy-one").forEach((button) => {
  button.addEventListener("click", () => {
    const target = outputMap[button.dataset.copy];
    copyText(target.value, button, "复制");
  });
});


