# 参考图反推提示词网站

上传参考图后，通过 `https://weibo.com.de/v1/chat/completions` 调用外部接口生成：

- ChatGPT 中文提示词
- ChatGPT English Prompt
- TikTok 多语言文案

## 本地运行

```bash
python server.py
```

打开：

```text
http://127.0.0.1:8787/
```

## 环境变量

```bash
LXC_API_KEY=提示词和文案使用的 lxc API Key
PROMPT_API_BASE_URL=https://weibo.com.de/v1
LXC_MODEL=gpt5.5
HOST=0.0.0.0
PORT=8787
```

`PROMPT_API_BASE_URL` 用于参考图反推提示词和 TikTok 文案接口。`LXC_API_KEY` 是提示词/文案 Key。

配置服务器 Key 后，网页会自动隐藏 API Key 输入框，用户只需要上传图片并点击生成。旧环境变量 `CCCJIN_API_KEY` 仍可作为提示词功能的备用兼容。

## Render 部署

1. 把项目推送到 GitHub 仓库。
2. 登录 Render，选择当前 Web Service。
3. 打开 `Environment` 页面。
4. 添加或修改：

```bash
LXC_API_KEY=提示词和文案 Key
PROMPT_API_BASE_URL=https://weibo.com.de/v1
LXC_MODEL=gpt5.5
```

5. 保存环境变量后，在 `Deploys` 页面选择部署最新提交。

部署完成后，Render 会提供长期网址，例如：

```text
https://prompt-reverse-site.onrender.com
```

## 注意

- 不要把真实 API Key 写进前端代码或公开仓库。
- 如果提示 `Service temporarily unavailable`，通常是上游模型通道临时不可用。
