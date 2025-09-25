echo "Stopping and removing all containers..."
docker ps -aq | xargs -r docker rm -f || true
echo "Removing all Docker images..."
docker images -aq | xargs -r docker rmi -f || true
echo "Pruning builder cache..."
docker builder prune -af || true
echo "Pruning system (networks/volumes)..."
docker system prune -af --volumes || true
echo "Removing node_modules to free space..."
rm -rf node_modules || true
echo "Disk usage after cleanup:"
df -h