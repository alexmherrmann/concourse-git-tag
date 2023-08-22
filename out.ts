#!/usr/bin/env ts-node-esm
import { wrapOut } from 'concourse-node-helper';

wrapOut<{}, {}>(
    async (input, ctx) => {
        return {
            version: {
                ref: input.version.ref,
            },
        }

    })()