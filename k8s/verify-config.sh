#!/bin/bash

# 配置验证脚本 - 检查应用名和端口是否配置正确

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 开始验证配置...${NC}"
echo ""

EXPECTED_APP="mxq"
EXPECTED_PORT="3600"
ERRORS=0

check_file() {
    local file="$1"
    local pattern="$2"
    local description="$3"
    
    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $file - $description"
    else
        echo -e "${RED}✗${NC} $file - $description ${RED}未找到${NC}"
        ((ERRORS++))
    fi
}

echo -e "${YELLOW}检查应用名 (应该是: $EXPECTED_APP)${NC}"

# 检查 workflow 文件（新加坡地域）
check_file "../.github/workflows/dev.yml" "DEPLOYMENT: ${EXPECTED_APP}-dev" "Workflow dev 应用名"
check_file "../.github/workflows/pre.yml" "DEPLOYMENT: ${EXPECTED_APP}-pre" "Workflow pre 应用名"
check_file "../.github/workflows/prod-canary.yml" "DEPLOYMENT: ${EXPECTED_APP}-prod" "Workflow prod-canary 应用名"
check_file "../.github/workflows/prod-release.yml" "DEPLOYMENT: ${EXPECTED_APP}-prod" "Workflow prod-release 应用名"

# 检查 deployment
check_file "singapore/base-dev/deployment.yml" "name: ${EXPECTED_APP}-dev" "Dev deployment 名称"
check_file "singapore/base-pre/deployment.yml" "name: ${EXPECTED_APP}-pre" "Pre deployment 名称"
check_file "singapore/base-prod/deployment.yml" "name: ${EXPECTED_APP}-prod" "Prod deployment 名称"

echo ""
echo -e "${YELLOW}检查端口配置 (应该是: $EXPECTED_PORT)${NC}"

# 检查容器端口
check_file "singapore/base-dev/deployment.yml" "containerPort: ${EXPECTED_PORT}" "Dev 容器端口"
check_file "singapore/base-pre/deployment.yml" "containerPort: ${EXPECTED_PORT}" "Pre 容器端口"
check_file "singapore/base-prod/deployment.yml" "containerPort: ${EXPECTED_PORT}" "Prod 容器端口"

# 检查 service 端口
check_file "singapore/base-dev/service.yaml" "port: ${EXPECTED_PORT}" "Dev service 端口"
check_file "singapore/base-pre/service.yaml" "port: ${EXPECTED_PORT}" "Pre service 端口"
check_file "singapore/base-prod/service.yaml" "port: ${EXPECTED_PORT}" "Prod service 端口"

# 检查 ingress 端口
check_file "singapore/base-dev/ingress.yaml" "number: ${EXPECTED_PORT}" "Dev ingress 端口"
check_file "singapore/base-pre/ingress.yaml" "number: ${EXPECTED_PORT}" "Pre ingress 端口"
check_file "singapore/base-prod/ingress.yaml" "number: ${EXPECTED_PORT}" "Prod ingress 端口"

echo ""
echo -e "${YELLOW}检查域名配置${NC}"

# 检查公网域名
check_file "singapore/base-dev/ingress.yaml" "host: ${EXPECTED_APP}.dev.atominnolab.com" "Dev 公网域名"
check_file "singapore/base-pre/ingress.yaml" "host: ${EXPECTED_APP}-pre.atominnolab.com" "Pre 公网域名"
check_file "singapore/base-prod/ingress.yaml" "host: ${EXPECTED_APP}.atominnolab.com" "Prod 公网域名"

# 检查 HTTPS 配置（公网模式下所有环境都应该有）
check_file "singapore/base-dev/ingress.yaml" "HTTPS.*443" "Dev HTTPS 配置"
check_file "singapore/base-dev/ingress.yaml" "tls:" "Dev TLS 配置"
check_file "singapore/base-dev/ingress.yaml" "ssl-dev.atominnolab.com" "Dev 证书名称"
check_file "singapore/base-pre/ingress.yaml" "HTTPS.*443" "Pre HTTPS 配置"
check_file "singapore/base-pre/ingress.yaml" "tls:" "Pre TLS 配置"
check_file "singapore/base-pre/ingress.yaml" "ssl-atominnotab.com" "Pre 证书名称"
check_file "singapore/base-prod/ingress.yaml" "HTTPS.*443" "Prod HTTPS 配置"
check_file "singapore/base-prod/ingress.yaml" "tls:" "Prod TLS 配置"
check_file "singapore/base-prod/ingress.yaml" "tls-atominnolab.com" "Prod 证书名称"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ 所有配置检查通过！${NC}"
    echo ""
    echo -e "应用名: ${BLUE}$EXPECTED_APP${NC}"
    echo -e "端口: ${BLUE}$EXPECTED_PORT${NC}"
    echo -e "域名模式: ${BLUE}公网 + HTTPS${NC}"
else
    echo -e "${RED}❌ 发现 $ERRORS 个配置错误${NC}"
    echo ""
    echo "请重新运行配置脚本："
    echo -e "${YELLOW}./operate.sh mytestapp mxq yes 3600${NC}"
fi

echo ""

