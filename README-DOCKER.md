# Docker and CI/CD Pipeline

This project includes an automated GitHub Actions pipeline to build and publish Docker images based on Alpine Linux with Node.js.

## GitHub Actions Pipeline

The pipeline is located in `.github/workflows/docker-build-push.yml` and is triggered automatically on:

- **Tag pushes** with pattern `v*` (e.g., `v1.0.0`, `v2.1.3`)

### Pipeline Features

- ✅ Builds Docker image using the existing Dockerfile
- ✅ Multi-architecture support (linux/amd64, linux/arm64)
- ✅ Publishes to GitHub Container Registry (ghcr.io)
- ✅ Uses caching for faster builds
- ✅ Generates automatic tags based on semantic versions
- ✅ Only triggers on version tags for production releases

### Registry and Naming

Images are published to: `ghcr.io/[username]/[repository-name]`

Generated tag examples:
- `ghcr.io/username/repo:v1.0.0` (full semantic version)
- `ghcr.io/username/repo:v1.0` (major.minor version)

## Local Usage

### Building the image locally

```bash
# Build the image
docker build -t core-pipeline-manager .

# Run the container
docker run -p 3000:3000 core-pipeline-manager
```

### Using the image from registry

```bash
# Pull the image from registry
docker pull ghcr.io/[username]/core-pipeline-manager:v1.0.0

# Run the container
docker run -p 3000:3000 ghcr.io/[username]/core-pipeline-manager:v1.0.0
```

## Configuration

### GitHub Permissions

The pipeline requires the following permissions:
- `contents: read` - To read the source code
- `packages: write` - To publish to Container Registry

The `GITHUB_TOKEN` is automatically provided by GitHub Actions.

### Customization

To modify the pipeline:

1. **Different registry**: Change `REGISTRY` to `docker.io` for Docker Hub
2. **Image name**: Modify `IMAGE_NAME` for a custom name
3. **Platforms**: Add/remove from `platforms` based on your needs
4. **Triggers**: Modify the `on` section for custom triggers

## Release Process

### Creating a new release

1. **Create and push a tag**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Pipeline automatically triggers** and builds the Docker image

3. **Image is published** to GitHub Container Registry with appropriate tags

### Version tagging strategy

- Use semantic versioning: `v1.0.0`, `v1.1.0`, `v2.0.0`
- The pipeline will create both full version (`v1.0.0`) and major.minor (`v1.0`) tags
- Only tags starting with `v` will trigger the pipeline

## Troubleshooting

### Common issues

1. **Insufficient permissions**: Verify the repository has permissions to publish packages
2. **Build fails**: Check pipeline logs for Dockerfile errors
3. **Login fails**: Verify `GITHUB_TOKEN` is available

### Logs and Debug

Pipeline logs are available in the "Actions" section of the GitHub repository.

## Base Image

The Docker image is based on:
- **Alpine Linux** - Lightweight Linux distribution
- **Node.js 20.11.1** - LTS version of Node.js
- **Multi-stage build** - Optimized for production size

This combination provides a secure, lightweight, and efficient container for Node.js applications. 