#!/usr/bin/env bash
# Roteiro de comandos para coletar evidências da Entrega 4 (IAM).
# Uso: ./scripts/entrega4-evidencias.sh
# Requer: API em http://127.0.0.1:3333

set -e
API="${API_BASE:-http://127.0.0.1:3333}"

echo "=== FlexBen — Entrega 4: testes IAM (cole os prints no PDF) ==="
echo ""

echo "--- 1) 401 sem token (esperado: Token ausente) ---"
curl -s -w "\nHTTP %{http_code}\n\n" "$API/api/transactions"
echo ""

echo "--- 2) Login colaborador ---"
LOGIN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"joao.silva@empresa.com","senha":"123"}')
echo "$LOGIN" | head -c 200
echo "..."
TOKEN=$(echo "$LOGIN" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).token||'')}catch{console.log('')}})")
echo ""

if [ -z "$TOKEN" ]; then
  echo "ERRO: não obteve token. API está rodando?"
  exit 1
fi

echo "--- 3) 200 rota permitida (transações) ---"
curl -s -w "\nHTTP %{http_code}\n\n" "$API/api/transactions" \
  -H "Authorization: Bearer $TOKEN" | head -c 400
echo "..."
echo ""

echo "--- 4) 403 perfil errado (GET /api/users como colaborador) ---"
curl -s -w "\nHTTP %{http_code}\n\n" "$API/api/users" \
  -H "Authorization: Bearer $TOKEN"
echo ""

echo "--- 5) Health (messaging provider) ---"
curl -s "$API/api/health" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s);console.log('messaging:',j.messaging||j)}catch{console.log(s)}})" 2>/dev/null || curl -s "$API/api/health"
echo ""
echo "Próximo: RabbitMQ — veja ENTREGA-4.md seção 2"
