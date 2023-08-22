#!/usr/bin/env ts-node-esm
import { wrapIn } from 'concourse-node-helper';

wrapIn<{}>(async (input, ctx) => {
    ctx.logit('Hello from in.ts');

    return {
        version: input.version,
    }
})()