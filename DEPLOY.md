# 快速部署

## 本地打开

双击 `start.bat`，然后打开：

```text
http://127.0.0.1:8787/
```

## 发给用户使用

部署到服务器时，设置环境变量：

```bash
CCCJIN_API_KEY=你的聚策APIKey
CCCJIN_MODEL=gemini-2.5-flash
HOST=0.0.0.0
PORT=8787
```

启动命令：

```bash
python server.py
```

配置 `CCCJIN_API_KEY` 后，用户页面不会显示 API Key 输入框，只需要上传参考图并点击生成。
