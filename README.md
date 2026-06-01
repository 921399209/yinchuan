# 参考图反推提示词网站

上传参考图后，通过 `https://apis.cccjin.cn/v1/chat/completions` 调用视觉模型，生成：

- ChatGPT 中文提示词
- ChatGPT English Prompt
- Hypic 中文提示词
- Hypic English Prompt

## 本地运行

```bash
python server.py
```

打开：

```text
http://127.0.0.1:8787/
```

## 给其他用户使用

推荐在服务器配置统一 API Key，不要让用户填写你的 Key。

环境变量：

```bash
CCCJIN_API_KEY=sk-your-api-key-here
CCCJIN_MODEL=gemini-2.5-flash
HOST=0.0.0.0
PORT=8787
```

配置后，网页会自动隐藏 API Key 输入框，用户只需要上传图片并点击生成。

## 部署说明

这是一个纯 Python 标准库小站，不需要安装依赖。支持 Render、Railway、VPS 等能运行 Python Web 进程的平台。

### Render 一键部署

1. 把本目录上传到 GitHub 仓库。
2. 登录 Render，选择 `New` -> `Blueprint`。
3. 选择这个仓库，Render 会读取 `render.yaml`。
4. 在环境变量里填入：

```bash
CCCJIN_API_KEY=你的聚策APIKey
```

5. 部署完成后，Render 会给你一个稳定网址，例如：

```text
https://prompt-reverse-site.onrender.com
```

启动命令：

```bash
python server.py
```

如果部署平台会注入 `PORT`，本服务会自动读取。

## 注意

- 需要选择支持图片输入的模型。
- 如果返回 `Service temporarily unavailable`，通常是模型通道不可用，换一个视觉模型再试。
- 不要把真实 API Key 写进前端代码或公开仓库。
