#!/bin/bash

# Kubernetes 和 Workflow 配置批量修改脚本
# 根据应用名称直接替换模板中的应用名

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
    echo "用法: $0 <old_app_name> <new_app_name> <public=yes|no> <port>"
    echo ""
    echo "示例:"
    echo "  $0 mytestapp myapp no 80      # 内网应用"
    echo "  $0 mytestapp myapp yes 8080   # 公网应用 + HTTPS"
    echo ""
    echo "提示: 如果不确定旧应用名，可以查看 singapore/base-dev/deployment.yml 中的 name 字段"
}

# 替换文件中的应用名称
# 自动处理 testapp 和 mytestapp 两种情况，包括带环境后缀的情况
# 使用精确匹配，避免重复替换
replace_app_name() {
    local old_name="$1"
    local new_name="$2"
    local file="$3"
    
    # 转义特殊字符，用于 sed（但保留 - 和 . 用于匹配）
    local old_escaped=$(printf '%s\n' "$old_name" | sed 's/[[\*^$()+?{|]/\\&/g')
    local new_escaped=$(printf '%s\n' "$new_name" | sed 's/[[\*^$()+?{|]/\\&/g')
    
    # 如果旧应用名是 testapp，同时替换 testapp 和 mytestapp
    # 如果旧应用名是 mytestapp，同时替换 mytestapp 和 testapp
    if [[ "$old_name" == "testapp" ]]; then
        # 先替换 mytestapp（避免 mytestapp 被替换成 mytestapp）
        # 使用精确匹配，只替换 mytestapp 本身
        sed -i '' "s/\bmytestapp\b/${new_escaped}/g" "$file"
        sed -i '' "s/mytestapp-dev/${new_escaped}-dev/g" "$file"
        sed -i '' "s/mytestapp-pre/${new_escaped}-pre/g" "$file"
        sed -i '' "s/mytestapp-prod/${new_escaped}-prod/g" "$file"
        sed -i '' "s/mytestapp-prod-canary/${new_escaped}-prod-canary/g" "$file"
        sed -i '' "s/mytestapp\.atominnolab\.com/${new_escaped}.atominnolab.com/g" "$file"
        sed -i '' "s/mytestapp\.dev\.atominnolab\.com/${new_escaped}.dev.atominnolab.com/g" "$file"
        sed -i '' "s/mytestapp-pre\.atominnolab\.com/${new_escaped}-pre.atominnolab.com/g" "$file"
        # 再替换 testapp（包括独立的和带后缀的）
        sed -i '' "s/testapp-prod-canary/${new_escaped}-prod-canary/g" "$file"
        sed -i '' "s/testapp-dev/${new_escaped}-dev/g" "$file"
        sed -i '' "s/testapp-pre/${new_escaped}-pre/g" "$file"
        sed -i '' "s/testapp-prod/${new_escaped}-prod/g" "$file"
        sed -i '' "s/testapp\.atominnolab\.com/${new_escaped}.atominnolab.com/g" "$file"
        sed -i '' "s/\btestapp\b/${new_escaped}/g" "$file"
    elif [[ "$old_name" == "mytestapp" ]]; then
        # 先替换 mytestapp，使用精确匹配避免重复替换
        # 按顺序替换：从长到短，避免部分匹配
        sed -i '' "s/mytestapp-prod-canary/${new_escaped}-prod-canary/g" "$file"
        sed -i '' "s/mytestapp\.dev\.atominnolab\.com/${new_escaped}.dev.atominnolab.com/g" "$file"
        sed -i '' "s/mytestapp-pre\.atominnolab\.com/${new_escaped}-pre.atominnolab.com/g" "$file"
        sed -i '' "s/mytestapp\.atominnolab\.com/${new_escaped}.atominnolab.com/g" "$file"
        sed -i '' "s/mytestapp-dev/${new_escaped}-dev/g" "$file"
        sed -i '' "s/mytestapp-pre/${new_escaped}-pre/g" "$file"
        sed -i '' "s/mytestapp-prod/${new_escaped}-prod/g" "$file"
        sed -i '' "s/\bmytestapp\b/${new_escaped}/g" "$file"
        
        # 再替换 testapp，需要按顺序处理：先替换带后缀的（从长到短），最后替换独立的
        sed -i '' "s/testapp-prod-canary/${new_escaped}-prod-canary/g" "$file"
        sed -i '' "s/testapp-dev/${new_escaped}-dev/g" "$file"
        sed -i '' "s/testapp-pre/${new_escaped}-pre/g" "$file"
        sed -i '' "s/testapp-prod/${new_escaped}-prod/g" "$file"
        sed -i '' "s/testapp\.atominnolab\.com/${new_escaped}.atominnolab.com/g" "$file"
        sed -i '' "s/\btestapp\b/${new_escaped}/g" "$file"
    else
        # 其他情况，使用精确匹配避免重复替换
        # 先匹配带后缀的情况（从长到短）
        sed -i '' "s/${old_escaped}-prod-canary/${new_escaped}-prod-canary/g" "$file"
        sed -i '' "s/${old_escaped}\.dev\.atominnolab\.com/${new_escaped}.dev.atominnolab.com/g" "$file"
        sed -i '' "s/${old_escaped}-pre\.atominnolab\.com/${new_escaped}-pre.atominnolab.com/g" "$file"
        sed -i '' "s/${old_escaped}\.atominnolab\.com/${new_escaped}.atominnolab.com/g" "$file"
        sed -i '' "s/${old_escaped}-dev/${new_escaped}-dev/g" "$file"
        sed -i '' "s/${old_escaped}-pre/${new_escaped}-pre/g" "$file"
        sed -i '' "s/${old_escaped}-prod/${new_escaped}-prod/g" "$file"
        # 再匹配独立的（使用单词边界）
        sed -i '' "s/\b${old_escaped}\b/${new_escaped}/g" "$file"
    fi
}

# 配置域名和证书
configure_domains() {
    local new_app_name="$1"
    local public="$2"

    if [[ "$public" == "yes" ]]; then
        echo -e "${BLUE}配置内外网域名和证书...${NC}"

        # 更新公网域名规则 - 同时处理 testapp 和 mytestapp
        sed -i '' "s/host: \(mytestapp\|testapp\)\.dev\.atominnolab\.com/host: ${new_app_name}.dev.atominnolab.com/g" singapore/base-dev/ingress.yaml
        sed -i '' "s/host: \(mytestapp-pre\|testapp-pre\)\.atominnolab\.com/host: ${new_app_name}-pre.atominnolab.com/g" singapore/base-pre/ingress.yaml
        sed -i '' "s/host: \(mytestapp\|testapp\)\.atominnolab\.com/host: ${new_app_name}.atominnolab.com/g" singapore/base-prod/ingress.yaml

        # 更新内网域名规则 - 同时处理 testapp 和 mytestapp
        sed -i '' "s/host: \(mytestapp\|testapp\)\.wispaperdev\.inner/host: ${new_app_name}.wispaperdev.inner/g" singapore/base-dev/ingress.yaml
        sed -i '' "s/host: \(mytestapp\|testapp\)\.wispaperpre\.inner/host: ${new_app_name}.wispaperpre.inner/g" singapore/base-pre/ingress.yaml
        sed -i '' "s/host: \(mytestapp\|testapp\)\.wispaper\.inner/host: ${new_app_name}.wispaper.inner/g" singapore/base-prod/ingress.yaml

        # 为所有环境添加 HTTPS 配置
        sed -i '' 's|alb.ingress.kubernetes.io/listen-ports: '\''\[{"HTTP": 80}\]'\''|alb.ingress.kubernetes.io/listen-ports: '\''\[{"HTTP": 80},{"HTTPS": 443}]'\''|' singapore/base-dev/ingress.yaml
        sed -i '' 's|alb.ingress.kubernetes.io/listen-ports: '\''\[{"HTTP": 80}\]'\''|alb.ingress.kubernetes.io/listen-ports: '\''\[{"HTTP": 80},{"HTTPS": 443}]'\''|' singapore/base-pre/ingress.yaml
        sed -i '' 's|alb.ingress.kubernetes.io/listen-ports: '\''\[{"HTTP": 80}\]'\''|alb.ingress.kubernetes.io/listen-ports: '\''\[{"HTTP": 80},{"HTTPS": 443}]'\''|' singapore/base-prod/ingress.yaml

        # 删除已存在的 TLS 配置（精确匹配，删除 tls 块及其后的空行）
        for env in dev pre prod; do
            # 使用 awk 删除 tls 块，包括前面的空行
            awk '
            BEGIN { in_tls = 0; prev_blank = 0 }
            /^  tls:/ { in_tls = 1; prev_blank = 0; next }
            in_tls && /^      secretName:/ { in_tls = 0; next }
            in_tls { next }
            /^$/ && !prev_blank { prev_blank = 1; print; next }
            /^$/ && prev_blank { next }
            { prev_blank = 0; print }
            ' "singapore/base-${env}/ingress.yaml" > "singapore/base-${env}/ingress.yaml.tmp" && mv "singapore/base-${env}/ingress.yaml.tmp" "singapore/base-${env}/ingress.yaml"
        done

        # 添加 TLS 配置到 dev 环境（仅公网域名需要证书）
        # 确保在 rules 后添加，先检查文件末尾是否有空行
        if ! tail -1 singapore/base-dev/ingress.yaml | grep -q '^$'; then
            echo "" >> singapore/base-dev/ingress.yaml
        fi
        echo "  tls:" >> singapore/base-dev/ingress.yaml
        echo "    - hosts:" >> singapore/base-dev/ingress.yaml
        echo "        - ${new_app_name}.dev.atominnolab.com" >> singapore/base-dev/ingress.yaml
        echo "      secretName: ssl-dev.atominnolab.com" >> singapore/base-dev/ingress.yaml

        # 添加 TLS 配置到 pre 环境（仅公网域名需要证书）
        if ! tail -1 singapore/base-pre/ingress.yaml | grep -q '^$'; then
            echo "" >> singapore/base-pre/ingress.yaml
        fi
        echo "  tls:" >> singapore/base-pre/ingress.yaml
        echo "    - hosts:" >> singapore/base-pre/ingress.yaml
        echo "        - ${new_app_name}-pre.atominnolab.com" >> singapore/base-pre/ingress.yaml
        echo "      secretName: ssl-atominnotab.com" >> singapore/base-pre/ingress.yaml

        # 添加 TLS 配置到 prod 环境（仅公网域名需要证书）
        if ! tail -1 singapore/base-prod/ingress.yaml | grep -q '^$'; then
            echo "" >> singapore/base-prod/ingress.yaml
        fi
        echo "  tls:" >> singapore/base-prod/ingress.yaml
        echo "    - hosts:" >> singapore/base-prod/ingress.yaml
        echo "        - ${new_app_name}.atominnolab.com" >> singapore/base-prod/ingress.yaml
        echo "      secretName: tls-atominnolab.com" >> singapore/base-prod/ingress.yaml

        echo -e "${GREEN}✓ 已配置内外网域名和 HTTPS（公网域名支持HTTPS，内网域名仅HTTP）${NC}"
    else
        echo -e "${BLUE}配置内网域名（仅HTTP）...${NC}"

        # 更新内网域名规则
        sed -i '' "s/host: mytestapp\.wispaperdev\.inner/host: ${new_app_name}.wispaperdev.inner/g" singapore/base-dev/ingress.yaml
        sed -i '' "s/host: mytestapp\.wispaperpre\.inner/host: ${new_app_name}.wispaperpre.inner/g" singapore/base-pre/ingress.yaml
        sed -i '' "s/host: mytestapp\.wispaper\.inner/host: ${new_app_name}.wispaper.inner/g" singapore/base-prod/ingress.yaml

        # 移除公网域名规则（删除第二个host规则）
        awk '
        BEGIN { in_second_host = 0; host_count = 0 }
        /^    - host:/ { host_count++ }
        host_count == 2 && /^    - host:/ { in_second_host = 1; next }
        in_second_host && /^    - host:/ && host_count > 2 { in_second_host = 0 }
        in_second_host { next }
        { print }
        ' singapore/base-dev/ingress.yaml > singapore/base-dev/ingress.yaml.tmp && mv singapore/base-dev/ingress.yaml.tmp singapore/base-dev/ingress.yaml

        awk '
        BEGIN { in_second_host = 0; host_count = 0 }
        /^    - host:/ { host_count++ }
        host_count == 2 && /^    - host:/ { in_second_host = 1; next }
        in_second_host && /^    - host:/ && host_count > 2 { in_second_host = 0 }
        in_second_host { next }
        { print }
        ' singapore/base-pre/ingress.yaml > singapore/base-pre/ingress.yaml.tmp && mv singapore/base-pre/ingress.yaml.tmp singapore/base-pre/ingress.yaml

        awk '
        BEGIN { in_second_host = 0; host_count = 0 }
        /^    - host:/ { host_count++ }
        host_count == 2 && /^    - host:/ { in_second_host = 1; next }
        in_second_host && /^    - host:/ && host_count > 2 { in_second_host = 0 }
        in_second_host { next }
        { print }
        ' singapore/base-prod/ingress.yaml > singapore/base-prod/ingress.yaml.tmp && mv singapore/base-prod/ingress.yaml.tmp singapore/base-prod/ingress.yaml

        # 移除HTTPS配置，保留HTTP
        sed -i '' 's|alb.ingress.kubernetes.io/listen-ports: '\''\[{"HTTP": 80},{"HTTPS": 443}]'\''|alb.ingress.kubernetes.io/listen-ports: '\''\[{"HTTP": 80}]'\''|' singapore/base-dev/ingress.yaml
        sed -i '' 's|alb.ingress.kubernetes.io/listen-ports: '\''\[{"HTTP": 80},{"HTTPS": 443}]'\''|alb.ingress.kubernetes.io/listen-ports: '\''\[{"HTTP": 80}]'\''|' singapore/base-pre/ingress.yaml
        sed -i '' 's|alb.ingress.kubernetes.io/listen-ports: '\''\[{"HTTP": 80},{"HTTPS": 443}]'\''|alb.ingress.kubernetes.io/listen-ports: '\''\[{"HTTP": 80}]'\''|' singapore/base-prod/ingress.yaml

        # 删除TLS配置（使用 awk 精确删除 tls 块）
        for env in dev pre prod; do
            awk '
            BEGIN { in_tls = 0; prev_blank = 0 }
            /^  tls:/ { in_tls = 1; prev_blank = 0; next }
            in_tls && /^      secretName:/ { in_tls = 0; next }
            in_tls { next }
            /^$/ && !prev_blank { prev_blank = 1; print; next }
            /^$/ && prev_blank { next }
            { prev_blank = 0; print }
            ' "singapore/base-${env}/ingress.yaml" > "singapore/base-${env}/ingress.yaml.tmp" && mv "singapore/base-${env}/ingress.yaml.tmp" "singapore/base-${env}/ingress.yaml"
        done

        echo -e "${GREEN}✓ 已配置内网域名（仅HTTP）${NC}"
    fi
}

# 配置端口
configure_ports() {
    local port="$1"
    echo -e "${BLUE}配置服务端口: $port${NC}"

    # 更新所有 deployment 中的容器端口（使用正则匹配任意端口号）
    for env in dev pre prod; do
        # 更新 containerPort
        sed -i '' "s/containerPort: [0-9][0-9]*/containerPort: $port/g" "singapore/base-${env}/deployment.yml"
        # 更新健康检查探针端口（只替换 tcpSocket 和 httpGet 中的 port，避免替换其他 port 字段）
        # 使用更精确的匹配，只替换在 tcpSocket/httpGet 下的 port
        sed -i '' "/tcpSocket:/,/timeoutSeconds:/ s/port: [0-9][0-9]*/port: $port/g" "singapore/base-${env}/deployment.yml"
        sed -i '' "/httpGet:/,/timeoutSeconds:/ s/port: [0-9][0-9]*/port: $port/g" "singapore/base-${env}/deployment.yml"
    done
    sed -i '' "s/containerPort: [0-9][0-9]*/containerPort: $port/g" singapore/canary/deployment-canary.yml
    sed -i '' "/tcpSocket:/,/timeoutSeconds:/ s/port: [0-9][0-9]*/port: $port/g" singapore/canary/deployment-canary.yml
    sed -i '' "/httpGet:/,/timeoutSeconds:/ s/port: [0-9][0-9]*/port: $port/g" singapore/canary/deployment-canary.yml

    # 更新所有 service 中的端口（使用正则匹配任意端口号）
    for env in dev pre prod; do
        # 更新端口的 name 字段（从 tcp80 改为 tcp{port}）
        sed -i '' "s/name: tcp[0-9][0-9]*/name: tcp${port}/g" "singapore/base-${env}/service.yaml"
        # 更新 port 和 targetPort
        sed -i '' "s/port: [0-9][0-9]*/port: $port/g" "singapore/base-${env}/service.yaml"
        sed -i '' "s/targetPort: [0-9][0-9]*/targetPort: $port/g" "singapore/base-${env}/service.yaml"
    done
    sed -i '' "s/name: tcp[0-9][0-9]*/name: tcp${port}/g" singapore/canary/service-canary.yml
    sed -i '' "s/port: [0-9][0-9]*/port: $port/g" singapore/canary/service-canary.yml
    sed -i '' "s/targetPort: [0-9][0-9]*/targetPort: $port/g" singapore/canary/service-canary.yml

    # 更新所有 ingress 中的端口引用（使用正则匹配任意端口号）
    for env in dev pre prod; do
        sed -i '' "s/number: [0-9][0-9]*/number: $port/g" "singapore/base-${env}/ingress.yaml"
    done
    sed -i '' "s/number: [0-9][0-9]*/number: $port/g" singapore/canary/ingress-canary.yaml

    echo -e "${GREEN}✓ 已配置端口: $port${NC}"
}

main() {
    local old_app_name="$1"
    local new_app_name="$2"
    local public="$3"
    local port="$4"

    # 参数验证
    if [[ -z "$old_app_name" || -z "$new_app_name" || -z "$public" || -z "$port" ]]; then
        echo -e "${RED}错误: 需要提供完整的参数${NC}"
        show_help
        exit 1
    fi

    if [[ "$public" != "yes" && "$public" != "no" ]]; then
        echo -e "${RED}错误: public 参数必须是 yes 或 no${NC}"
        exit 1
    fi

    if ! [[ "$port" =~ ^[0-9]+$ ]] || [[ "$port" -lt 1 ]] || [[ "$port" -gt 65535 ]]; then
        echo -e "${RED}错误: 端口必须是 1-65535 之间的数字${NC}"
        exit 1
    fi

    echo -e "${BLUE}开始配置应用${NC}"
    echo "旧应用名: $old_app_name"
    echo "新应用名: $new_app_name"
    echo "公网模式: $public"
    echo "服务端口: $port"
    echo ""

    # 获取所有需要修改的文件
    local files=(
        "../.github/workflows/dev.yml"
        "../.github/workflows/pre.yml"
        "../.github/workflows/prod-canary.yml"
        "../.github/workflows/prod-release.yml"
        "singapore/base-dev/deployment.yml"
        "singapore/base-dev/service.yaml"
        "singapore/base-dev/ingress.yaml"
        "singapore/base-pre/deployment.yml"
        "singapore/base-pre/service.yaml"
        "singapore/base-pre/ingress.yaml"
        "singapore/base-prod/deployment.yml"
        "singapore/base-prod/service.yaml"
        "singapore/base-prod/ingress.yaml"
        "singapore/canary/deployment-canary.yml"
        "singapore/canary/service-canary.yml"
        "singapore/canary/ingress-canary.yaml"
    )

    # 检查文件是否存在
    for file in "${files[@]}"; do
        if [[ ! -f "$file" ]]; then
            echo -e "${RED}错误: 文件不存在 $file${NC}"
            exit 1
        fi
    done

    echo -e "${YELLOW}替换应用名称...${NC}"
    for file in "${files[@]}"; do
        replace_app_name "$old_app_name" "$new_app_name" "$file"
        echo "  ✓ $file"
    done

    echo ""
    configure_domains "$new_app_name" "$public"

    echo ""
    configure_ports "$port"

    echo ""
    echo -e "${GREEN}🎉 所有配置修改完成！${NC}"
    echo ""
    echo -e "${YELLOW}旧应用名: $old_app_name${NC}"
    echo -e "${YELLOW}新应用名: $new_app_name${NC}"
    echo -e "${YELLOW}域名模式: $public${NC}"
    echo -e "${YELLOW}服务端口: $port${NC}"
    echo ""
    echo -e "${YELLOW}请检查修改后的文件是否正确，然后提交更改。${NC}"
}

main "$@"
