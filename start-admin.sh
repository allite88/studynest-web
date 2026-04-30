#!/bin/bash

# 启动 HTTP 服务器和 Cloudflare Tunnel

cd /Users/zr/sejarah-web

echo "🚀 启动 HTTP 服务器 (localhost:8899)..."
python3 -m http.server 8899 > /tmp/http-server.log 2>&1 &
HTTP_PID=$!
sleep 2

echo "🌐 启动 Cloudflare Tunnel..."
/Users/zr/.local/bin/cloudflared tunnel --url http://localhost:8899

# 清理：当用户按 Ctrl+C 时关闭服务器
trap "kill $HTTP_PID" EXIT
