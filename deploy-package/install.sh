#!/bin/bash
# Sprite Preview 一键部署脚本
# 在服务器上执行此脚本完成部署

set -e

DEPLOY_DIR="/home/sprite-preview"
PORT=3988
CONTAINER_NAME="sprite-preview"
IMAGE_NAME="sprite-preview"

echo "========================================"
echo "Sprite Preview 部署脚本"
echo "========================================"

# 1. 检查并安装 Docker
echo "[Step 1] 检查 Docker..."
if ! command -v docker &> /dev/null; then
    echo "Docker 未安装，正在安装..."
    yum install -y docker || apt install -y docker.io
    systemctl start docker
    systemctl enable docker
    echo "Docker 安装完成"
else
    echo "Docker 已安装"
fi

# 2. 创建部署目录
echo "[Step 2] 创建部署目录..."
mkdir -p "$DEPLOY_DIR"

# 3. 检查文件是否存在
echo "[Step 3] 检查项目文件..."
if [ ! -f "$DEPLOY_DIR/Dockerfile" ]; then
    echo "错误: 项目文件未上传，请先上传以下文件到 $DEPLOY_DIR:"
    echo "  - index.html"
    echo "  - css/"
    echo "  - js/"
    echo "  - assets/"
    echo "  - Dockerfile"
    echo "  - deploy/nginx.conf"
    echo "  - deploy/scripts/sprite-preview.sh"
    exit 1
fi

# 4. 复制管理脚本到系统目录
echo "[Step 4] 安装管理脚本..."
cp "$DEPLOY_DIR/deploy/scripts/sprite-preview.sh" "/usr/local/bin/sprite-preview.sh"
chmod +x "/usr/local/bin/sprite-preview.sh"

# 5. 构建 Docker 镜像
echo "[Step 5] 构建 Docker 镜像..."
cd "$DEPLOY_DIR"
docker build -t ${IMAGE_NAME}:latest .

# 6. 启动容器
echo "[Step 6] 启动容器..."
# 如果容器已存在，先删除
docker rm -f ${CONTAINER_NAME} 2>/dev/null || true

docker run -d \
    --name ${CONTAINER_NAME} \
    --restart unless-stopped \
    -p ${PORT}:80 \
    --health-cmd="wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1" \
    --health-interval=30s \
    --health-timeout=3s \
    --health-retries=3 \
    ${IMAGE_NAME}:latest

# 7. 检查防火墙
echo "[Step 7] 配置防火墙..."
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=${PORT}/tcp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    echo "防火墙已配置端口 ${PORT}"
fi

# 8. 验证部署
echo "[Step 8] 验证部署..."
sleep 3
if docker ps | grep -q ${CONTAINER_NAME}; then
    echo ""
    echo "========================================"
    echo "部署成功!"
    echo "========================================"
    echo "访问地址: http://47.122.123.229:${PORT}"
    echo ""
    echo "管理命令:"
    echo "  /usr/local/bin/sprite-preview.sh start   # 启动"
    echo "  /usr/local/bin/sprite-preview.sh stop    # 停止"
    echo "  /usr/local/bin/sprite-preview.sh restart # 重启"
    echo "  /usr/local/bin/sprite-preview.sh status  # 状态"
    echo "  /usr/local/bin/sprite-preview.sh logs    # 日志"
    echo "========================================"
else
    echo "部署失败，请检查日志"
    docker logs ${CONTAINER_NAME}
    exit 1
fi