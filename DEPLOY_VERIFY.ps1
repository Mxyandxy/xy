param(
    $RootDir = "C:\Users\mxyan\campus-forum",
    $Domain = "api.bayinxyzs.cn",
    $CnameTarget = "cname.vercel-dns.com",
    $TestDomain = "xy-a9w2.vercel.app",
    $WaitMinutes = 30
)

$ErrorActionPreference = "Continue"
Set-Location $RootDir

function Write-Step($msg) { Write-Host "`n========== $msg ==========" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "  ❌ $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "  ℹ️  $msg" -ForegroundColor Yellow }

# 1. Check vercel CLI
Write-Step "1. 检查 Vercel CLI"
try {
    $vercelVer = & vercel --version 2>&1
    Write-Ok "vercel CLI 可用: $vercelVer"
} catch {
    Write-Fail "vercel CLI 不可用: $_"
    Write-Info "请先 npm install -g vercel 或登录 Vercel"
    exit 1
}

# 2. Check Vercel auth
Write-Step "2. 检查 Vercel 登录状态"
try {
    $whoami = & vercel whoami 2>&1
    Write-Ok "已登录: $whoami"
} catch {
    Write-Fail "未登录 Vercel，请先运行: vercel login"
    exit 1
}

# 3. Add domain to Vercel project
Write-Step "3. 绑定域名 $Domain 到 Vercel 项目"
try {
    $result = & vercel project add $Domain 2>&1
    Write-Ok "添加域名结果: $result"
} catch {
    # Try alternative command
    try {
        $result = & vercel domains add $Domain 2>&1
        Write-Ok "添加域名结果: $result"
    } catch {
        Write-Info "添加域名需要手动操作，请在 Vercel Dashboard → Settings → Domains 添加 $Domain"
    }
}

# 4. Check latest deployment status
Write-Step "4. 检查 Vercel 最新部署状态"
try {
    $deployments = & vercel deployments ls 2>&1
    Write-Info "部署列表:"
    Write-Host $deployments
} catch {
    Write-Info "获取部署列表失败，跳过"
}

# 5. Poll DNS for custom domain
Write-Step "5. 等待 DNS 传播 (最长 $WaitMinutes 分钟)"
$maxAttempts = $WaitMinutes * 2
$attempt = 0
$resolved = $false
while ($attempt -lt $maxAttempts) {
    $attempt++
    Write-Host "  尝试 $attempt/$maxAttempts 解析 $Domain..."
    try {
        $dns = Resolve-DnsName -Name $Domain -Type CNAME -ErrorAction SilentlyContinue
        if ($dns) {
            $cname = $dns | Where-Object { $_.Type -eq 'CNAME' }
            if ($cname) {
                Write-Ok "DNS 解析成功: $($cname.Name) → $($cname.HostName)"
                $resolved = $true
                break
            }
        }
    } catch {}
    Start-Sleep -Seconds 30
}

if (-not $resolved) {
    Write-Fail "DNS 在 $WaitMinutes 分钟内未传播。请确认阿里云 DNS 记录已添加："
    Write-Info "  类型: CNAME"
    Write-Info "  主机记录: api"
    Write-Info "  记录值: cname.vercel-dns.com"
}

# 6. Test endpoints
Write-Step "6. 测试后端 API 接口"

# Test via custom domain first
$testUrls = @(
    "https://$Domain/api/test",
    "https://$Domain/health",
    "https://$TestDomain/api/test",
    "https://$TestDomain/health"
)

foreach ($url in $testUrls) {
    Write-Host "  测试 $url ..."
    try {
        $response = Invoke-WebRequest -Uri $url -Method Get -TimeoutSec 20 -UseBasicParsing
        $body = $response.Content
        Write-Ok "HTTP $($response.StatusCode): $body"
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-Fail "HTTP $status : $($_.Exception.Message)"
    }
}

# 7. Test login
Write-Step "7. 测试管理员登录"
$loginUrl = if ($resolved) { "https://$Domain/api/auth/login" } else { "https://$TestDomain/api/auth/login" }
try {
    $body = @{ username = "admin"; password = "admin123" } | ConvertTo-Json
    $response = Invoke-WebRequest -Uri $loginUrl -Method Post -ContentType "application/json" -Body $body -TimeoutSec 20 -UseBasicParsing
    Write-Ok "登录成功 HTTP $($response.StatusCode)"
    Write-Host "  响应: $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))..."
} catch {
    Write-Fail "登录失败: $($_.Exception.Message)"
}

# 8. Test blog post API
Write-Step "8. 测试列表接口"
$listUrl = if ($resolved) { "https://$Domain/api/boards" } else { "https://$TestDomain/api/boards" }
try {
    $response = Invoke-WebRequest -Uri $listUrl -Method Get -TimeoutSec 20 -UseBasicParsing
    Write-Ok "板块列表 HTTP $($response.StatusCode): $($response.Content.Substring(0, [Math]::Min(200, $response.Content.Length)))..."
} catch {
    Write-Fail "板块列表失败: $($_.Exception.Message)"
}

# 9. Summary
Write-Step "9. 总结"
if ($resolved) {
    Write-Ok "自定义域名 $Domain 已解析"
} else {
    Write-Info "自定义域名未生效，可能仍在传播中"
}
Write-Info "测试域名: $TestDomain (可能被墙)"
Write-Info "完整后端 API 地址: https://$Domain"
Write-Info "前端部署时设置 VITE_API_URL=https://$Domain"
Write-Info "下一步：部署前端到 Cloudflare Pages，绑定 www.bayinxyzs.cn"
