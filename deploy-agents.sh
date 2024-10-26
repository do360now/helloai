#!/bin/bash

# This script deploys agents with a specified delay between deployments

# Function to deploy an agent
deploy_agent() {
    local agent_path=$1
    local agent_name=$2
    
    echo "Deploying the $agent_name agent..."
    
    # Run the agent and check if it was successful
    if python3 "$agent_path"; then
        echo "$agent_name agent deployed successfully!"
    else
        echo "Failed to deploy $agent_name agent!" >&2
        exit 1
    fi
}

# Deploy the Do360Now agent
deploy_agent "accounts/do360now/X/agent_x.py" "Do360Now"

# Wait before deploying the next agent (if any)
echo "Waiting for $delay seconds before deploying the next agent..."
sleep 300

# Add more deployment commands for additional agents if needed
# For example:
# deploy_agent "accounts/medicalnetworks/X/agent_y.py" "MedicalNetworks"
# sleep "$delay"
