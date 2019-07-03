set -e

pushd janus && ./build.sh && popd

./build.sh

docker-compose up
