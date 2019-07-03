set -e

image=janus.fat
docker build -t $image --rm --force-rm $@ .
docker images "$image"
docker run -it --env-file "./.env" -p 7088:7088/tcp -p 8090:8090/tcp $image