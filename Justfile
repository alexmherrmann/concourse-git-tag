


ecrRepo:="ghcr.io/alexmherrmann/concourse-git-tags"

d:
  @just -l

newtag:
  # If git describe --tags does not have a '-' in it, then exit
  git describe --tags | grep -q '-' || exit 1
  git tag $(./increment.py $(git describe --tags))
  git push
  git push --tags
build:
  docker build -t {{ecrRepo}}:$(git describe --tags) .

push tag:
  docker push {{ecrRepo}}:{{tag}}

bt tag:
  docker build -t {{ecrRepo}}:{{tag}} .

test tag:
  bash test.sh {{ecrRepo}}:{{tag}}