#!/usr/bin/env ts-node-esm
import { Version, wrapCheck } from 'concourse-node-helper';
import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { createInterface } from 'node:readline';

async function processStream(stream: Readable): Promise<Array<[string, string]>> {
    const lineReader = createInterface({ input: stream });
    const result: Array<[string, string]> = [];

    for await (const line of lineReader) {
        const [timestamp, ...tagNameParts] = line.split(' ');
        const tagName = tagNameParts.join(' '); // Join again to handle tags with spaces
        result.push([timestamp, tagName]);
    }

    return result;
}

/**
 * Parse the space separated parts of a git iso8601 timestamp
 */
function parseTime(date: string, time: string, offset: string): Date {
    // Adjust the offset to have a `:` for ISO 8601 format
    if (offset !== 'Z' && offset.length === 5) {
        offset = `${offset.slice(0, 3)}:${offset.slice(3)}`;
    }

    // Construct the ISO string
    const isoDateString = `${date}T${time}${offset}`;

    // Try to parse the string
    const parsedDate = new Date(Date.parse(isoDateString));

    // Check if the parsed date is valid
    if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid datetime format: ${isoDateString}`);
    }

    return parsedDate;
}

function processString(input: string, logit): Array<[Date, string]> {
    const lines = input.split('\n');
    const result: Array<[Date, string]> = [];

    for (const line of lines.filter((line) => line !== '')) {
        const [timestampDate, timestampTime, timestampOffset, ...tagNameParts] = line.split(' ');
        const tagName = tagNameParts.join(' '); // Join again to handle tags with spaces
        try {
            result.push([parseTime(timestampDate, timestampTime, timestampOffset), tagName]);
        } catch (e) {
            logit(`Failed to parse line: ${line}`);
            throw e;
        }
    }

    result.sort(([a, _], [b, __]) => a.getTime() - b.getTime());
    return result;
}

export async function promisifyExec(command: string): Promise<{ stdout: string, stderr: string, exitCode: number }> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject({ error, stdout, stderr });
            }
            resolve({ stdout, stderr, exitCode: 0 });
        });
    });
}


wrapCheck<{
    git_repo: string,
}>(async (inputParams, { logit }) => {

    logit("Checking for new versions")

    const tmpgit = join(tmpdir(), 'concourse-node-helper-git');

    // Check if the directory exists
    if (!existsSync(tmpgit)) {
        const tmpDir = await mkdir(tmpgit);
        try {
            const { stdout, stderr, exitCode } = await promisifyExec(`git clone ${inputParams.source.git_repo} .`);
        } catch ({ error, stderr }) {
            logit(stderr)
            throw new Error(`Failed to clone git repo: ${stderr}`);
        }
    } else {
        // Just go update
        try {
            const { stdout, stderr, exitCode } = await promisifyExec(`git fetch --tags`);
        } catch ({ error, stderr }) {
            logit(stderr)
            throw new Error(`Failed to pull git repo: ${stderr}`);
        }
    }

    // Change to the directory
    process.chdir(tmpgit);

    // Run the `git tags` command, ensuring to also get the creatordate printed, capturing the output
    const columnOptions = '--format=\'%(creatordate:iso8601) %(refname:short)\'';
    const { stdout, stderr, exitCode } = await promisifyExec(`git tag ${columnOptions} --sort=-creatordate`);


    // Log the first 6 lines of the output
    // const lines = stdout.split('\n');
    // for (const line of lines.slice(0, 6)) {
    //     logit(line);
    // }

    // Process the output
    const tags = await processString(stdout, logit);

    // Find the tag specified in version
    const version = inputParams.version?.ref;
    
    // If there isn't a version specified, return the latest tag
    if (version === undefined) {
        const last = tags[tags.length - 1];
        return [{ ref: last[1], timestamp: last[0].toISOString() }];
    }

    const foundIndex = tags.findIndex(([_, tagName]) => tagName === version);

    // TODO: Handle the case where the tag is not found
    if (foundIndex === -1) {
        throw new Error(`Tag ${version} not found`);
    } else {
        logit(`Found tag ${version} at index ${foundIndex}`);
    }

    // Return the tags after the found tag
    return tags.slice(foundIndex + 1).map<Version>(([date, tagName]) => ({ ref: tagName, timestamp: date.toISOString() }));

})()

