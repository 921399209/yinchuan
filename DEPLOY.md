# 快速部署

## 本地打开

双击 `start.bat`，然后打开：

```text
http://127.0.0.1:8787/
```

## 发给用户使用

部署到服务器时，设置环境变量：

```bash
LXC_API_KEY=提示词和文案使用的 lxc API Key
PROMPT_API_BASE_URL=https://weibo.com.de/v1
LXC_MODEL=gpt5.5
HOST=0.0.0.0
PORT=8787
```

启动命令：

```bash
python server.py
```

配置 `LXC_API_KEY` 后，用户页面不会显示 API Key 输入框，只需要上传参考图并点击生成。旧的 `CCCJIN_API_KEY` 仍可作为提示词功能的备用兼容。
