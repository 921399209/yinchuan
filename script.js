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
  return `你是一个“参考效果图转同款模板提示词”的生成器。用户上传的图片是一张由“原图 + 提示词”生成出来的效果图。你的任务不是普通描述图片，而是反推出一个可复用模板，让用户之后上传自己的真人照片或主体照片，也能生成同款效果。

核心目标：输出的提示词必须能直接配合用户自己的照片使用。提示词里必须明确写：以我上传的人物照片/主体照片为主角，保持五官、发型、肤色、脸部特征、身份一致，只把这个人套进参考图的同款场景、动作、构图、特效、光影和风格里。

用户补充：
- 你的照片主体：${els.subjectInput.value.trim() || "我上传的人物照片"}
- 输出用途：${els.goalSelect.value}
- 替换策略：${els.sceneSelect.value}
- 保留重点：${els.focusSelect.value}

生成规则：
1. 输出的是“可复用同款模板”，不是对参考图的普通描述。
2. 每条提示词只写一段，不要分点，不要解释。
3. 中文控制在 120-220 个汉字；英文控制在 70-130 个词。
4. 必须包含身份一致性指令：保留上传照片中人物的五官、发型、肤色、脸型和真实身份。
5. 必须抽取参考图的同款结构：主体动作、场景设定、构图、镜头、光影、色调、材质、特效、氛围。
6. 不要固定参考图中人物的具体身份，不要写死“这个男生/这个女生”，要写“上传照片中的人物 / the person from the uploaded photo”。
7. 如果参考图有水印、用户名、平台 logo 或文字，不要要求复刻真实文字，只保留“社交媒体界面 / profile interface / graphic layout”等可替换结构。
8. 风格要短、直接、效果导向，像原始生图 prompt，而不是长篇分析报告。
9. ChatGPT 版本可以稍微更明确地告诉 ChatGPT 使用上传照片做身份参考；Hypic 版本要更像直接生图 prompt，短一点、更关键词化。

输出必须是 JSON，不要 Markdown，不要代码块：
{
  "chatgpt_cn": "用于 ChatGPT 的中文同款模板提示词",
  "chatgpt_en": "English reusable template prompt for ChatGPT",
  "hypic_cn": "用于 Hypic 的中文同款模板提示词",
  "hypic_en": "English reusable template prompt for Hypic"
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


