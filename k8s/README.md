# Kubernetes 配置管理工具

自动化配置 Kubernetes 部署文件和 GitHub Actions Workflows。

## 🚀 快速开始

```bash
# 1. 进入 k8s 目录
cd k8s

# 2. 执行配置脚本
./operate.sh <旧应用名> <新应用名> <public=yes|no> <端口>

# 3. 验证配置
./verify-config.sh

# 4. 提交更改
git add .
git commit -m "chore: 配置应用"
```

## 📖 使用示例

### 内网应用
```bash
# 配置内网应用，端口 8080
./operate.sh mytestapp myapp no 8080
```

域名配置：
- Dev: `myapp.wispaperdev.inner`
- Pre: `myapp.wispaperpre.inner`
- Prod: `myapp.wispaper.inner`

### 公网应用（带 HTTPS）
```bash
# 配置公网应用，端口 3600
./operate.sh mytestapp mxq yes 3600
```

域名配置：
- Dev: `mxq.dev.atominnolab.com` （HTTPS, 证书: `ssl-dev.atominnolab.com`）
- Pre: `mxq-pre.atominnolab.com` （HTTPS, 证书: `ssl-atominnotab.com`）
- Prod: `mxq.atominnolab.com` （HTTPS, 证书: `tls-atominnolab.com`）

## 🛠️ 工具说明

### operate.sh
主配置脚本，批量修改所有配置文件。

**参数说明**:
1. `旧应用名`: 模板中的应用名（如 `mytestapp`）
2. `新应用名`: 要改成的应用名（如 `mxq`）
3. `public`: `yes` 公网 + HTTPS，`no` 内网
4. `端口`: 1-65535 的服务端口

**修改内容**:
- ✅ 应用名称（15个文件）
- ✅ 服务端口（容器、服务、入口）
- ✅ 健康检查端口
- ✅ 域名配置
- ✅ HTTPS 证书（公网模式）

### verify-config.sh
验证配置是否正确应用。

**检查项目**:
- ✅ 应用名称是否正确
- ✅ 端口是否统一配置
- ✅ 域名是否正确
- ✅ HTTPS 配置是否完整

### fix-current-config.sh
快速修复脚本（针对当前配置）。

**功能**: 将 `mytestapp` 改为 `mxq`，端口改为 `3600`，公网模式。

## 📁 目录结构

```
k8s/
├── operate.sh              # 主配置脚本
├── verify-config.sh        # 验证脚本
├── fix-current-config.sh   # 快速修复脚本
├── README.md              # 本文件
├── USAGE.md               # 详细使用说明
├── CHANGELOG.md           # 更新日志
├── singapore/             # 新加坡地域配置
│   ├── base-dev/          # 开发环境配置
│   │   ├── deployment.yml
│   │   ├── service.yaml
│   │   └── ingress.yaml
│   ├── base-pre/          # 预发布环境配置
│   │   ├── deployment.yml
│   │   ├── service.yaml
│   │   └── ingress.yaml
│   ├── base-prod/         # 生产环境配置
│   │   ├── deployment.yml
│   │   ├── service.yaml
│   │   └── ingress.yaml
│   └── canary/            # 灰度发布配置
│       ├── deployment-canary.yml
│       ├── service-canary.yml
│       └── ingress-canary.yaml
├── shanghai/              # 上海地域配置
│   ├── base-dev/          # 开发环境配置
│   ├── base-pre/          # 预发布环境配置
│   ├── base-prod/         # 生产环境配置
│   └── canary/            # 灰度发布配置
```

## 🎯 配置项说明

### 应用名称
会影响以下资源：
- Deployment 名称
- Service 名称
- Ingress 名称
- 容器名称
- Docker 镜像名
- 标签选择器

### 服务端口
会更新以下配置：
- 容器端口（containerPort）
- 服务端口（port/targetPort）
- Ingress 后端端口（number）
- 健康检查端口（livenessProbe/readinessProbe）

### 域名配置

#### 内网模式
- 使用 `.inner` 后缀
- 仅 HTTP 协议

#### 公网模式
- 使用 `atominnolab.com` 域名
- 生产环境启用 HTTPS
- 自动配置 TLS 证书

## ⚠️ 注意事项

1. **备份**: 脚本会自动创建 `.bak` 备份文件（执行后自动删除）
2. **验证**: 执行后务必运行 `verify-config.sh` 验证
3. **Git**: 确认无误后再提交到代码仓库
4. **端口**: 确保端口与应用实际监听端口一致

## 🔍 故障排查

### 配置未生效
```bash
# 1. 检查旧应用名是否正确
grep "name:" singapore/base-dev/deployment.yml | head -1

# 2. 重新运行配置脚本
./operate.sh <正确的旧应用名> <新应用名> yes 3600

# 3. 验证结果
./verify-config.sh
```

### 端口配置错误
```bash
# 检查当前端口
grep -r "containerPort:" singapore/base-dev/
grep -r "port:" singapore/base-dev/service.yaml

# 重新配置
./operate.sh <旧名> <新名> yes <正确的端口>
```

### 域名配置错误
```bash
# 检查域名配置（新加坡地域）
grep "host:" singapore/base-*/ingress.yaml

# 手动修复或重新运行脚本
```

## 📚 更多文档

- [USAGE.md](USAGE.md) - 详细使用说明
- [CHANGELOG.md](CHANGELOG.md) - 更新日志和技术细节

## 🤝 贡献

如有问题或建议，请提交 Issue 或 Pull Request。

