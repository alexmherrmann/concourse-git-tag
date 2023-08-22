#!/usr/bin/env bash

# Get just the name of the current file
CURRENT_FILE=${0##*/}

node /app/dist/${CURRENT_FILE}.js $@