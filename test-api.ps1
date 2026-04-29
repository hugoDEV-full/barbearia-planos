# Testes de API - Barbearia Panos
$baseUrl = "http://localhost:3000/api"
$results = @()
$tokenCliente = $null
$tokenAdmin = $null
$barbeariaId = $null
$userId = $null
$planoId = $null
$servicoId = $null
$colaboradorId = $null
$agendamentoId = $null
$produtoId = $null
$assinaturaId = $null
$pagamentoId = $null
$clienteEmail = "carlos@email.com"
$clienteSenha = "123456"

function Invoke-ApiTest {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Uri,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [int[]]$ExpectedStatus = @(200, 201),
        [string[]]$ExpectedFields = @()
    )
    $result = @{
        Name = $Name
        Method = $Method
        Uri = $Uri
        StatusCode = $null
        Body = $null
        Error = $null
        Passed = $false
        Details = ""
    }
    try {
        $params = @{
            Uri = $Uri
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
            ErrorAction = "Stop"
            UseBasicParsing = $true
        }
        if ($Body -ne $null) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
        }
        $response = Invoke-WebRequest @params
        $result.StatusCode = $response.StatusCode
        if ($response.Content) {
            try { $result.Body = $response.Content | ConvertFrom-Json -ErrorAction Stop } catch { $result.Body = $response.Content }
        }
    } catch {
        if ($_.Exception.Response) {
            $result.StatusCode = [int]$_.Exception.Response.StatusCode
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $raw = $reader.ReadToEnd()
                $reader.Close()
                try { $result.Body = $raw | ConvertFrom-Json -ErrorAction Stop } catch { $result.Body = $raw }
            } catch {
                $result.Body = $_.Exception.Message
            }
        } else {
            $result.Error = $_.Exception.Message
        }
    }

    $statusOk = $ExpectedStatus -contains $result.StatusCode
    $fieldsOk = $true
    $fieldDetails = ""
    if ($statusOk -and $result.Body -ne $null -and $ExpectedFields.Count -gt 0) {
        $bodyProps = @()
        if ($result.Body -is [PSCustomObject]) {
            $bodyProps = $result.Body.PSObject.Properties.Name
        } elseif ($result.Body -is [hashtable]) {
            $bodyProps = $result.Body.Keys
        }
        foreach ($field in $ExpectedFields) {
            if ($bodyProps -notcontains $field) {
                $fieldsOk = $false
                $fieldDetails += "Faltando campo: $field; "
            }
        }
    }
    if ($statusOk -and $fieldsOk) {
        $result.Passed = $true
        $result.Details = "Status $($result.StatusCode) OK"
    } elseif (-not $statusOk) {
        $result.Details = "Status inesperado: $($result.StatusCode). Esperado: $($ExpectedStatus -join ', ')"
        if ($result.Body) {
            $json = $result.Body | ConvertTo-Json -Depth 5 -Compress -ErrorAction SilentlyContinue
            $result.Details += " | Body: $json"
        }
        if ($result.Error) { $result.Details += " | Erro: $($result.Error)" }
    } else {
        $result.Details = $fieldDetails
    }

    return $result
}

# 1. Health check
$r = Invoke-ApiTest -Name "Health check" -Method GET -Uri "$baseUrl/health" -ExpectedStatus @(200) -ExpectedFields @("status", "timestamp")
$results += $r

# 2. Auth - Register cliente
$emailClienteNovo = "testecliente$(Get-Random -Minimum 1000 -Maximum 9999)@teste.com"
$r = Invoke-ApiTest -Name "Auth: Register cliente" -Method POST -Uri "$baseUrl/auth/register" -Body @{
    nome = "Cliente Teste"
    email = $emailClienteNovo
    senha = "senha123"
    telefone = "11999999999"
    tipo = "cliente"
} -ExpectedStatus @(201, 200) -ExpectedFields @("token", "user")
$results += $r
if ($r.Passed -and $r.Body.user) {
    $tokenCliente = $r.Body.token
    $userId = $r.Body.user.id
}

# 3. Auth - Login cliente (fallback se register falhar)
$r = Invoke-ApiTest -Name "Auth: Login cliente" -Method POST -Uri "$baseUrl/auth/login" -Body @{
    email = $clienteEmail
    senha = $clienteSenha
} -ExpectedStatus @(200) -ExpectedFields @("token", "user")
$results += $r
if ($r.Passed -and $r.Body.token) {
    $tokenCliente = $r.Body.token
    if (-not $userId -and $r.Body.user) { $userId = $r.Body.user.id }
}

# 4. Auth - Login admin
$r = Invoke-ApiTest -Name "Auth: Login admin" -Method POST -Uri "$baseUrl/auth/login" -Body @{
    email = "hugo.leonardo.jobs@gmail.com"
    senha = "admin123"
} -ExpectedStatus @(200) -ExpectedFields @("token", "user")
$results += $r
if ($r.Passed -and $r.Body.token) { $tokenAdmin = $r.Body.token }

if (-not $tokenAdmin) {
    Write-Host "Não foi possível obter token admin. Abortando testes dependentes." -ForegroundColor Red
    foreach ($res in $results) {
        $icon = if ($res.Passed) { "✅" } else { "❌" }
        Write-Host "$icon $($res.Name) - $($res.Details)"
    }
    exit
}

$headers = @{ Authorization = "Bearer $tokenAdmin" }

# 5. GET /barbearias
$r = Invoke-ApiTest -Name "CRUD: GET barbearias" -Method GET -Uri "$baseUrl/barbearias" -Headers $headers -ExpectedStatus @(200) -ExpectedFields @()
$results += $r
if ($r.Passed -and $r.Body -is [System.Array] -and $r.Body.Count -gt 0) {
    $barbeariaId = $r.Body[0].id
} elseif ($r.Passed -and $r.Body -is [PSCustomObject] -and $r.Body.PSObject.Properties.Name -contains "id") {
    $barbeariaId = $r.Body.id
}

if (-not $barbeariaId) {
    $r2 = Invoke-ApiTest -Name "CRUD: POST barbearia (fallback)" -Method POST -Uri "$baseUrl/barbearias" -Headers $headers -Body @{
        nome = "Barbearia Teste"
        endereco = "Rua Teste, 123"
        telefone = "11999999999"
        email = "barbearia@teste.com"
        slug = "barbearia-teste-$(Get-Random -Minimum 1000 -Maximum 9999)"
    } -ExpectedStatus @(201, 200) -ExpectedFields @("id")
    $results += $r2
    if ($r2.Passed) { $barbeariaId = $r2.Body.id }
}

if (-not $barbeariaId) {
    Write-Host "Não foi possível obter barbearia_id. Abortando testes dependentes." -ForegroundColor Red
    foreach ($res in $results) {
        $icon = if ($res.Passed) { "✅" } else { "❌" }
        Write-Host "$icon $($res.Name) - $($res.Details)"
    }
    exit
}

# 6. CRUDs básicos com barbearia_id
$crudEndpoints = @(
    @{ Name = "CRUD: GET planos"; Url = "$baseUrl/planos?barbearia_id=$barbeariaId"; Fields = @() },
    @{ Name = "CRUD: GET servicos"; Url = "$baseUrl/servicos?barbearia_id=$barbeariaId"; Fields = @() },
    @{ Name = "CRUD: GET colaboradores"; Url = "$baseUrl/colaboradores?barbearia_id=$barbeariaId"; Fields = @() },
    @{ Name = "CRUD: GET users"; Url = "$baseUrl/users?barbearia_id=$barbeariaId"; Fields = @() },
    @{ Name = "CRUD: GET assinaturas"; Url = "$baseUrl/assinaturas?barbearia_id=$barbeariaId"; Fields = @() },
    @{ Name = "CRUD: GET cobrancas"; Url = "$baseUrl/cobrancas?barbearia_id=$barbeariaId"; Fields = @() },
    @{ Name = "CRUD: GET agendamentos"; Url = "$baseUrl/agendamentos?barbearia_id=$barbeariaId"; Fields = @() },
    @{ Name = "CRUD: GET produtos"; Url = "$baseUrl/produtos?barbearia_id=$barbeariaId"; Fields = @() },
    @{ Name = "CRUD: GET transacoes"; Url = "$baseUrl/transacoes?barbearia_id=$barbeariaId"; Fields = @() }
)
foreach ($c in $crudEndpoints) {
    $r = Invoke-ApiTest -Name $c.Name -Method GET -Uri $c.Url -Headers $headers -ExpectedStatus @(200) -ExpectedFields $c.Fields
    $results += $r
}

# 7. Criação de dados
# 7.1 POST plano
$r = Invoke-ApiTest -Name "Criacao: POST plano" -Method POST -Uri "$baseUrl/planos" -Headers $headers -Body @{
    barbearia_id = $barbeariaId
    nome = "Plano Teste"
    descricao = "Descricao do plano teste"
    preco = 49.90
    cortes_inclusos = 4
    periodo = "mensal"
    status = "ativo"
} -ExpectedStatus @(201, 200) -ExpectedFields @("id")
$results += $r
if ($r.Passed -and $r.Body.id) { $planoId = $r.Body.id }

# 7.2 POST servico
$r = Invoke-ApiTest -Name "Criacao: POST servico" -Method POST -Uri "$baseUrl/servicos" -Headers $headers -Body @{
    barbearia_id = $barbeariaId
    nome = "Corte Teste"
    descricao = "Corte de cabelo teste"
    preco = 35.00
    duracao_minutos = 30
    status = "ativo"
} -ExpectedStatus @(201, 200) -ExpectedFields @("id")
$results += $r
if ($r.Passed -and $r.Body.id) { $servicoId = $r.Body.id }

# 7.3 POST colaborador
$r = Invoke-ApiTest -Name "Criacao: POST colaborador" -Method POST -Uri "$baseUrl/colaboradores" -Headers $headers -Body @{
    barbearia_id = $barbeariaId
    nome = "Colaborador Teste"
    email = "colab$(Get-Random -Minimum 1000 -Maximum 9999)@teste.com"
    telefone = "11999999999"
    especialidade = "Corte"
    comissao_percentual = 30
    status = "ativo"
} -ExpectedStatus @(201, 200) -ExpectedFields @("id")
$results += $r
if ($r.Passed -and $r.Body.id) { $colaboradorId = $r.Body.id }

# 7.4 POST produto
$r = Invoke-ApiTest -Name "Criacao: POST produto" -Method POST -Uri "$baseUrl/produtos" -Headers $headers -Body @{
    barbearia_id = $barbeariaId
    nome = "Pomada Teste"
    descricao = "Pomada modeladora"
    preco = 25.00
    estoque = 10
    categoria = "cosmetico"
    status = "ativo"
} -ExpectedStatus @(201, 200) -ExpectedFields @("id")
$results += $r
if ($r.Passed -and $r.Body.id) { $produtoId = $r.Body.id }

# 7.5 POST agendamento
if ($servicoId -and $colaboradorId -and $userId) {
    $dataHora = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
    $r = Invoke-ApiTest -Name "Criacao: POST agendamento" -Method POST -Uri "$baseUrl/agendamentos" -Headers $headers -Body @{
        barbearia_id = $barbeariaId
        cliente_id = $userId
        colaborador_id = $colaboradorId
        servico_id = $servicoId
        data_hora = $dataHora
        status = "agendado"
    } -ExpectedStatus @(201, 200) -ExpectedFields @("id")
    $results += $r
    if ($r.Passed -and $r.Body.id) { $agendamentoId = $r.Body.id }
} else {
    $results += @{ Name = "Criacao: POST agendamento"; Method = "POST"; Uri = "$baseUrl/agendamentos"; StatusCode = $null; Body = $null; Error = "Dependência não atendida"; Passed = $false; Details = "servicoId=$servicoId, colaboradorId=$colaboradorId, userId=$userId" }
}

# 8. Pagamentos
# 8.1 POST assinatura (pendente)
if ($planoId -and $userId) {
    $r = Invoke-ApiTest -Name "Pagamento: POST assinatura" -Method POST -Uri "$baseUrl/assinaturas" -Headers $headers -Body @{
        usuario_id = $userId
        plano_id = $planoId
        barbearia_id = $barbeariaId
        status = "pendente"
        data_inicio = (Get-Date).ToString("yyyy-MM-dd")
    } -ExpectedStatus @(201, 200) -ExpectedFields @("id")
    $results += $r
    if ($r.Passed -and $r.Body.id) { $assinaturaId = $r.Body.id }
} else {
    $results += @{ Name = "Pagamento: POST assinatura"; Method = "POST"; Uri = "$baseUrl/assinaturas"; StatusCode = $null; Body = $null; Error = "Dependência não atendida"; Passed = $false; Details = "planoId=$planoId, userId=$userId" }
}

# 8.2 POST pagamentos/pix
if ($assinaturaId) {
    $r = Invoke-ApiTest -Name "Pagamento: POST pix" -Method POST -Uri "$baseUrl/pagamentos/pix" -Headers $headers -Body @{
        assinatura_id = $assinaturaId
        valor = 49.90
        descricao = "Pagamento teste PIX"
    } -ExpectedStatus @(200, 201) -ExpectedFields @()
    $results += $r
    if ($r.Passed) {
        if ($r.Body.id) { $pagamentoId = $r.Body.id }
        elseif ($r.Body.PSObject.Properties.Name -contains "pagamento_id") { $pagamentoId = $r.Body.pagamento_id }
        elseif ($r.Body.PSObject.Properties.Name -contains "cobranca_id") { $pagamentoId = $r.Body.cobranca_id }
    }
} else {
    $results += @{ Name = "Pagamento: POST pix"; Method = "POST"; Uri = "$baseUrl/pagamentos/pix"; StatusCode = $null; Body = $null; Error = "Dependência não atendida"; Passed = $false; Details = "assinaturaId não definido" }
}

# 8.3 POST pagamentos/confirmar/:id
if ($pagamentoId) {
    $r = Invoke-ApiTest -Name "Pagamento: POST confirmar" -Method POST -Uri "$baseUrl/pagamentos/confirmar/$pagamentoId" -Headers $headers -Body @{
        status = "pago"
    } -ExpectedStatus @(200, 201) -ExpectedFields @()
    $results += $r
} else {
    $results += @{ Name = "Pagamento: POST confirmar"; Method = "POST"; Uri = "$baseUrl/pagamentos/confirmar/{id}"; StatusCode = $null; Body = $null; Error = "Dependência não atendida"; Passed = $false; Details = "pagamentoId não definido" }
}

# 8.4 GET pagamentos/status/:id
if ($pagamentoId) {
    $r = Invoke-ApiTest -Name "Pagamento: GET status" -Method GET -Uri "$baseUrl/pagamentos/status/$pagamentoId" -Headers $headers -ExpectedStatus @(200) -ExpectedFields @()
    $results += $r
} else {
    $results += @{ Name = "Pagamento: GET status"; Method = "GET"; Uri = "$baseUrl/pagamentos/status/{id}"; StatusCode = $null; Body = $null; Error = "Dependência não atendida"; Passed = $false; Details = "pagamentoId não definido" }
}

# 8.5 POST pagamentos/preferencia
$r = Invoke-ApiTest -Name "Pagamento: POST preferencia" -Method POST -Uri "$baseUrl/pagamentos/preferencia" -Headers $headers -Body @{
    title = "Plano Teste"
    quantity = 1
    unit_price = 49.90
} -ExpectedStatus @(200, 201) -ExpectedFields @()
$results += $r

# 9. Sync
$r = Invoke-ApiTest -Name "Sync: GET sync" -Method GET -Uri "$baseUrl/sync?barbearia_id=$barbeariaId" -Headers $headers -ExpectedStatus @(200) -ExpectedFields @()
$results += $r

# Resultados
Write-Host "`n========================================"
Write-Host "RESULTADOS DOS TESTES DE API"
Write-Host "========================================`n"

$passed = 0
$failed = 0
foreach ($res in $results) {
    if ($res.Passed) {
        $passed++
        Write-Host "✅ $($res.Name)" -ForegroundColor Green
        Write-Host "   $($res.Details)" -ForegroundColor Gray
    } else {
        $failed++
        Write-Host "❌ $($res.Name)" -ForegroundColor Red
        Write-Host "   $($res.Details)" -ForegroundColor Yellow
    }
    Write-Host ""
}

Write-Host "========================================"
Write-Host "Total: $($results.Count) testes"
Write-Host "Passaram: $passed ✅"
Write-Host "Falharam: $failed ❌"
Write-Host "========================================"
