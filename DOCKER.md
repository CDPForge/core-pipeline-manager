# Docker e CI/CD Pipeline

Questo progetto include una pipeline GitHub Actions automatizzata per costruire e pubblicare immagini Docker basate su Alpine Linux con Node.js.

## Pipeline GitHub Actions

La pipeline si trova in `.github/workflows/docker-build-push.yml` e si attiva automaticamente su:

- **Tag** con pattern `v*` (es. `v1.0.0`, `v2.1.3`)

### Funzionalità della Pipeline

- ✅ Costruisce l'immagine Docker usando il Dockerfile esistente
- ✅ Supporta multi-architettura (linux/amd64, linux/arm64)
- ✅ Pubblica nel GitHub Container Registry (ghcr.io)
- ✅ Utilizza cache per build più veloci
- ✅ Genera tag automatici basati su versioni semantiche
- ✅ Si attiva solo con tag di versione per rilasci di produzione

### Registry e Naming

L'immagine viene pubblicata su: `ghcr.io/[username]/[repository-name]`

Esempi di tag generati:
- `ghcr.io/username/repo:v1.0.0` (versione semantica completa)
- `ghcr.io/username/repo:v1.0` (major.minor)

## Processo di Release

### Creare un nuovo release

1. **Crea e pusha un tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **La pipeline si attiva automaticamente** e costruisce l'immagine Docker

3. **L'immagine viene pubblicata** nel GitHub Container Registry con i tag appropriati

### Strategia di versioning

- Usa versioning semantico: `v1.0.0`, `v1.1.0`, `v2.0.0`
- La pipeline creerà sia la versione completa (`v1.0.0`) che major.minor (`v1.0`)
- Solo i tag che iniziano con `v` attiveranno la pipeline

## Utilizzo Locale

### Costruire l'immagine localmente

```bash
# Build dell'immagine
docker build -t core-pipeline-manager .

# Eseguire il container
docker run -p 3000:3000 core-pipeline-manager
```

### Utilizzare l'immagine dal registry

```bash
# Pull dell'immagine dal registry
docker pull ghcr.io/[username]/core-pipeline-manager:v1.0.0

# Eseguire il container
docker run -p 3000:3000 ghcr.io/[username]/core-pipeline-manager:v1.0.0
```

## Configurazione

### Permessi GitHub

La pipeline richiede i seguenti permessi:
- `contents: read` - Per leggere il codice sorgente
- `packages: write` - Per pubblicare nel Container Registry

Il `GITHUB_TOKEN` viene fornito automaticamente da GitHub Actions.

### Personalizzazione

Per modificare la pipeline:

1. **Registry diverso**: Cambia `REGISTRY` in `docker.io` per Docker Hub
2. **Nome immagine**: Modifica `IMAGE_NAME` per un nome personalizzato
3. **Piattaforme**: Aggiungi/rimuovi da `platforms` in base alle tue esigenze
4. **Trigger**: Modifica la sezione `on` per trigger personalizzati

## Troubleshooting

### Problemi comuni

1. **Permessi insufficienti**: Verifica che il repository abbia i permessi per pubblicare packages
2. **Build fallisce**: Controlla i log della pipeline per errori nel Dockerfile
3. **Login fallisce**: Verifica che il `GITHUB_TOKEN` sia disponibile

### Log e Debug

I log della pipeline sono disponibili nella sezione "Actions" del repository GitHub.

## Immagine Base

L'immagine Docker è basata su:
- **Alpine Linux** - Distribuzione Linux leggera
- **Node.js 20.11.1** - Versione LTS di Node.js
- **Multi-stage build** - Ottimizzata per dimensioni di produzione

Questa combinazione fornisce un container sicuro, leggero ed efficiente per applicazioni Node.js. 