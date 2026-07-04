# 🍜 Sopalavrinha

Gerador de **frases-senha** em português do Brasil — simples, seguro e privado.

Gera senhas do tipo `gato-vidro-nuvem-forte`: fáceis de lembrar, difíceis de
quebrar. Tudo acontece no navegador; **nada é armazenado nem enviado** (sem
cookies, sem `localStorage`, sem servidor). O histórico existe só durante a
sessão e é apagado ao recarregar a página.

*Sopalavrinha? É uma brincadeira com «sopa de palavrinhas», que vem de
«sopa de letrinhas». 🍜*

## Recursos

- Dicionário de **7.776 palavras** (estilo diceware, ~12,9 bits por palavra),
  derivado das palavras mais comuns do corpus [dicio-pt-br](./dicio-pt-br).
- Opções: número de palavras (3–10), separador, maiúsculas, número extra e
  remoção de acentos.
- Leitura de entropia ao vivo com indicador de força.
- Aleatoriedade criptográfica (`crypto.getRandomValues` com amostragem por
  rejeição, sem viés de módulo).
- Vanilla JS + [Pico.css](https://picocss.com) (embutido, funciona offline).

## Rodando localmente

Basta servir os arquivos estáticos. Por exemplo:

```sh
python3 -m http.server 8080
# ou
busybox httpd -f -p 8080 -h .
```

Acesse <http://localhost:8080>.

## Docker

```sh
docker compose up --build -d
```

O app fica disponível em <http://localhost:8080> (ajuste a porta no
`compose.yaml`). As labels do Traefik já estão prontas — edite o `Host(...)`
e a porta conforme seu ambiente. A imagem é baseada em `busybox` e não depende
do submódulo do dicionário em tempo de execução.

## Regenerando o dicionário

A lista de palavras fica embutida em `assets/wordlist.js` e já vem versionada.
Para regenerá-la a partir do submódulo:

```sh
git submodule update --init --recursive   # se ainda não inicializou
sh scripts/build-wordlist.sh
```

O script pega as palavras mais frequentes de `dicio-pt-br/icf`, filtra por
comprimento (4–8 letras), remove a lista de palavras ofensivas
(`dicio-pt-br/listas/negativas`), deduplica e escreve as 7.776 primeiras.
