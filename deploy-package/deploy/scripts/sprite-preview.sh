#!/bin/bash
# Sprite Preview Docker Compose 管理脚本
# 使用方法: ./sprite-preview.sh {start|stop|restart|status|logs|build|update|ps}

set -e

# 配置变量
COMPOSE_FILE="/home/sprite-preview/docker-compose.yml"
DEPLOY_DIR="/home/sprite-preview"
SERVICE_NAME="sprite-preview"
PORT=3988

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_cmd() {
    echo -e "${BLUE}[CMD]${NC} $1"
}

# 检查 Docker Compose 是否安装
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
}

# 获取 compose 命令
get_compose_cmd() {
    if command -v docker-compose &> /dev/null; then
        echo "docker-compose"
    else
        echo "docker compose"
    fi
}

COMPOSE_CMD=$(get_compose_cmd)

# 启动服务
start() {
    check_docker_compose
    log_info "启动 Sprite Preview 服务..."
    cd "$DEPLOY_DIR"
    $COMPOSE_CMD -f $COMPOSE_FILE up -d
    log_info "服务启动成功!"
    log_info "访问地址: http://47.122.123.229:${PORT}"
}

# 停止服务
stop() {
    check_docker_compose
    log_info "停止 Sprite Preview 服务..."
    cd "$DEPLOY_DIR"
    $COMPOSE_CMD -f $COMPOSE_FILE down
    log_info "服务已停止"
}

# 重启服务
restart() {
    check_docker_compose
    log_info "重启 Sprite Preview 服务..."
    cd "$DEPLOY_DIR"
    $COMPOSE_CMD -f $COMPOSE_FILE restart
    log_info "服务重启完成"
}

# 查看状态
status() {
    check_docker_compose
    cd "$DEPLOY_DIR"

    echo "========================================"
    echo "       Sprite Preview 服务状态"
    echo "========================================"

    # 显示容器状态
    $COMPOSE_CMD -f $COMPOSE_FILE ps

    echo ""
    echo "服务详情:"
    echo "  - 服务端口: ${PORT}"
    echo "  - 访问地址: http://47.122.123.229:${PORT}"
    echo "  - 部署目录: ${DEPLOY_DIR}"
    echo "  - 配置文件: ${COMPOSE_FILE}"
    echo "========================================"
}

# 查看日志
logs() {
    check_docker_compose
    cd "$DEPLOY_DIR"
    $COMPOSE_CMD -f $COMPOSE_FILE logs -f --tail 100
}

# 构建镜像
build() {
    check_docker_compose
    log_info "构建 Docker 镜像..."
    cd "$DEPLOY_DIR"
    $COMPOSE_CMD -f $COMPOSE_FILE build --no-cache
    log_info "镜像构建完成"
}

# 更新部署（重新构建并启动）
update() {
    check_docker_compose
    log_info "更新部署..."

    cd "$DEPLOY_DIR"

    # 停止旧服务
    log_info "停止旧服务..."
    $COMPOSE_CMD -f $COMPOSE_FILE down

    # 重新构建
    log_info "构建新镜像..."
    $COMPOSE_CMD -f $COMPOSE_FILE build --no-cache

    # 启动新服务
    log_info "启动新服务..."
    $COMPOSE_CMD -f $COMPOSE_FILE up -d

    log_info "更新完成!"
    status
}

# 查看所有容器
ps() {
    check_docker_compose
    cd "$DEPLOY_DIR"
    $COMPOSE_CMD -f $COMPOSE_FILE ps -a
}

# 进入容器
shell() {
    check_docker_compose
    cd "$DEPLOY_DIR"
    $COMPOSE_CMD -f $COMPOSE_FILE exec $SERVICE_NAME sh
}

# 清理资源
cleanup() {
    check_docker_compose
    log_info "清理未使用的 Docker 资源..."
    cd "$DEPLOY_DIR"

    # 停止服务
    $COMPOSE_CMD -f $COMPOSE_FILE down --volumes --remove-orphans

    # 清理悬空镜像
    docker image prune -f

    log_info "清理完成"
}

# 帮助信息
help() {
    echo "Sprite Preview Docker Compose 管理脚本"
    echo ""
    echo "使用方法: $0 {命令}"
    echo ""
    echo "可用命令:"
    echo "  start     - 启动服务"
    echo "  stop      - 停止服务"
    echo "  restart   - 重启服务"
    echo "  status    - 查看服务状态"
    echo "  logs      - 查看服务日志 (实时)"
    echo "  build     - 构建 Docker 镜像"
    echo "  update    - 更新部署 (停止+构建+启动)"
    echo "  ps        - 查看所有容器状态"
    echo "  shell     - 进入容器终端"
    echo "  cleanup   - 清理 Docker 资源"
    echo "  help      - 显示帮助信息"
    echo ""
    echo "配置:"
    echo "  服务端口: ${PORT}"
    echo "  部署目录: ${DEPLOY_DIR}"
    echo "  配置文件: ${COMPOSE_FILE}"
    echo ""
    echo "Docker Compose 原生命令示例:"
    echo "  $COMPOSE_CMD -f $COMPOSE_FILE up -d        # 启动"
    echo "  $COMPOSE_CMD -f $COMPOSE_FILE down         # 停止"
    echo "  $COMPOSE_CMD -f $COMPOSE_FILE logs -f      # 查看日志"
    echo "  $COMPOSE_CMD -f $COMPOSE_FILE restart      # 重启"
    echo "  $COMPOSE_CMD -f $COMPOSE_FILE build        # 构建"
}

# 主入口
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    build)
        build
        ;;
    update)
        update
        ;;
    ps)
        ps
        ;;
    shell)
        shell
        ;;
    cleanup)
        cleanup
        ;;
    help|--help|-h)
        help
        ;;
    *)
        log_error "未知命令: $1"
        help
        exit 1
        ;;
esac