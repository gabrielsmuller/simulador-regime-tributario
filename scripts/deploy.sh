#!/usr/bin/env bash
# Publica o build no S3 + CloudFront (conta 958620575923, us-east-1).
# Uso: npm run deploy
set -euo pipefail

BUCKET="simulador-reforma-958620575923"
DISTRIBUICAO="E2A2R1X5DYN9KT"

cd "$(dirname "$0")/.."
npm test
npm run build

# Arquivos com hash no nome: cache de 1 ano.
aws s3 sync dist/assets "s3://$BUCKET/assets" --delete \
  --cache-control "public,max-age=31536000,immutable" --only-show-errors
# Ícones e imagem de prévia: cache de 1 dia.
aws s3 sync dist "s3://$BUCKET" --exclude "assets/*" --exclude "index.html" \
  --cache-control "public,max-age=86400" --only-show-errors
# index.html: sempre revalida.
aws s3 cp dist/index.html "s3://$BUCKET/index.html" \
  --cache-control "no-cache" --content-type "text/html; charset=utf-8" --only-show-errors

aws cloudfront create-invalidation --distribution-id "$DISTRIBUICAO" --paths "/*" \
  --query "Invalidation.Id" --output text

echo "Publicado em https://d3ikdc9bz77qrz.cloudfront.net"
