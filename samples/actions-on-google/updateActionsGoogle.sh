#!/bin/bash

# You need to run the command bellow to generate the auth credentials to deploy your action package:
# gactions list --project [ACTIONS_GOOGLE_PROJECT_ID] 

gactions update --action_package action.json --project [ACTIONS_GOOGLE_PROJECT_ID]