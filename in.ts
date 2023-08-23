#!/usr/bin/env ts-node-esm
import { wrapIn } from 'concourse-node-helper';
import { promisifyExec } from './check';

wrapIn<{
    git_repo: string,
}>(async (input, ctx) => {

    try {
        promisifyExec(`git clone ${input.source.git_repo}`)
    } catch ({ error, stderr }) {
        ctx.logit(stderr)
        throw new Error(`Failed to clone git repo: ${stderr}`);
    }

    // Then go check out the tag
    try {
        promisifyExec(`git checkout ${input.version.ref}`)
    } catch ({ error, stderr }) {
        ctx.logit(stderr)
        throw new Error(`Failed to checkout git tag: ${stderr}`);
    }
    return {
        version: input.version,
    }
})()