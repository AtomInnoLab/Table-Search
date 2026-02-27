# K8s 配置脚本使用说明

## 脚本功能

`operate.sh` 脚本用于批量修改 Kubernetes 配置文件和 GitHub Workflows，包括：

- 应用名称替换
- 服务端口配置
- 域名和证书配置（公网/内网）

## 使用方法

```bash
./operate.sh <旧应用名> <新应用名> <public=yes|no> <端口>
```

### 参数说明

1. **旧应用名**：当前模板中使用的应用名称（如 `mytestapp`）
2. **新应用名**：要替换成的新应用名称（如 `mxq`）
3. **public**：
   - `yes` - 配置公网域名和 HTTPS 证书
   - `no` - 使用内网域名
4. **端口**：应用服务端口（1-65535）

### 示例

#### 内网应用
```bash
./operate.sh mytestapp myapp no 8080
```

这将：
- 将所有 `mytestapp` 替换为 `myapp`
- 配置端口为 `8080`
- 使用内网域名（如 `myapp.wispaperdev.inner`）

#### 公网应用
```bash
./operate.sh mytestapp mxq yes 3600
```

这将：
- 将所有 `mytestapp` 替换为 `mxq`
- 配置端口为 `3600`
- 配置公网域名：
  - Dev: `mxq.dev.atominnolab.com`
  - Pre: `mxq-pre.atominnolab.com`
  - Prod: `mxq.atominnolab.com`
- 为生产环境配置 HTTPS 证书

## 脚本会修改的文件

### GitHub Workflows
- `.github/workflows/dev.yml`
- `.github/workflows/pre.yml`
- `.github/workflows/prod-canary.yml`
- `.github/workflows/prod-release.yml`

### K8s 配置文件

#### Dev 环境
- `singapore/base-dev/deployment.yml`
- `singapore/base-dev/service.yaml`
- `singapore/base-dev/ingress.yaml`

#### Pre 环境
- `singapore/base-pre/deployment.yml`
- `singapore/base-pre/service.yaml`
- `singapore/base-pre/ingress.yaml`

#### Prod 环境
- `singapore/base-prod/deployment.yml`
- `singapore/base-prod/service.yaml`
- `singapore/base-prod/ingress.yaml`

#### Canary 环境
- `singapore/canary/deployment-canary.yml`
- `singapore/canary/service-canary.yml`
- `singapore/canary/ingress-canary.yaml`

## 修改内容详解

### 1. 应用名称替换
- Deployment、Service、Ingress 的资源名称
- 标签选择器
- 容器名称
- GitHub Workflow 中的变量

### 2. 端口配置
- Deployment 中的 `containerPort`
- Deployment 中的健康检查端口（livenessProbe、readinessProbe）
- Service 中的 `port` 和 `targetPort`
- Ingress 中的后端服务端口

### 3. 域名配置

#### 内网模式 (public=no)
- Dev: `<app>.wispaperdev.inner`
- Pre: `<app>.wispaperpre.inner`
- Prod: `<app>.wispaper.inner`

#### 公网模式 (public=yes)
- Dev: `<app>.dev.atominnolab.com` (HTTPS，证书: `ssl-dev.atominnolab.com`)
- Pre: `<app>-pre.atominnolab.com` (HTTPS，证书: `ssl-atominnotab.com`)
- Prod: `<app>.atominnolab.com` (HTTPS，证书: `tls-atominnolab.com`)

## 注意事项

1. **执行前备份**：脚本会自动创建 `.bak` 备份文件（执行后自动删除）
2. **检查结果**：执行完成后，请检查修改的文件是否正确
3. **提交代码**：确认无误后，提交到 Git 仓库
4. **旧应用名**：如果不确定旧应用名，查看 `singapore/base-dev/deployment.yml` 中的 `metadata.name` 字段

## 常见问题

### 如何找到当前的应用名？

```bash
grep "name:" singapore/base-dev/deployment.yml | head -1
```

### 如何回滚更改？

如果 Git 仓库还没提交：
```bash
git checkout -- .
```

### 脚本执行失败怎么办？

1. 检查是否在 `k8s` 目录下执行
2. 确认所有配置文件存在
3. 查看错误提示信息
4. 检查参数是否正确

## 版本历史

- v2.0 - 支持任意旧应用名和端口号，自动检测和替换
- v1.0 - 初始版本，硬编码 test-demo 和端口 80

